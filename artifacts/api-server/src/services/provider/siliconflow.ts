// SiliconFlow Provider - Phase 5B
// Real AI gateway using SiliconFlow API
import { getModelBySlug } from '../model';

// =============================================================================
// TOKEN ESTIMATION (fallback when provider doesn't return usage)
// =============================================================================

export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const chars = text.length;
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const nonCjkChars = chars - cjkCount;
  const cjkTokens = cjkCount;
  const nonCjkTokens = Math.ceil(nonCjkChars / 4);
  return cjkTokens + nonCjkTokens;
}

function estimateMessagesTokens(messages: Array<{role: string; content: string}>): number {
  if (!Array.isArray(messages)) return 0;
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.role) + estimateTokens(msg.content || '') + 4;
  }
  return total + 3;
}

export interface SiliconFlowMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SiliconFlowChatRequest {
  model: string; // SiliconFlow model ID
  messages: SiliconFlowMessage[];
  stream: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export interface SiliconFlowChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: SiliconFlowMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SiliconFlowStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

/**
 * SiliconFlow API so'rov yuborish (non-streaming)
 */
export async function chatCompletions(
  modelSlug: string,
  messages: SiliconFlowMessage[],
  stream: boolean = false,
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }
): Promise<SiliconFlowChatResponse | ReadableStream> {
  // Get timeout from environment (default 30 seconds)
  const TIMEOUT_MS = parseInt(process.env.PROVIDER_TIMEOUT_MS || '30000');
  const MAX_RETRIES = parseInt(process.env.PROVIDER_MAX_RETRIES || '3');
  
  // 1. Model ni database dan olish
  const model = await getModelBySlug(modelSlug);
  
  if (!model) {
    throw new Error(`Model not found: ${modelSlug}`);
  }
  
  if (!model.is_active) {
    throw new Error(`Model is inactive: ${modelSlug}`);
  }
  
  // 2. SiliconFlow API URL
  const apiUrl = process.env.THINKSYNC_PROVIDER || 'https://api.siliconflow.com/v1';
  const apiKey = process.env.SILICONFLOW_API_KEY;
  
  if (!apiKey) {
    throw new Error('SILICONFLOW_API_KEY not configured');
  }
  
  // 3. Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  
  // 4. Helper function to make the request
  const makeRequest = async (): Promise<SiliconFlowChatResponse | ReadableStream> => {
    const requestBody: SiliconFlowChatRequest = {
      model: model.provider_model_id,
      messages,
      stream,
      ...options,
    };

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`SiliconFlow API error: ${response.status} - ${errorText}`);
      (error as any).statusCode = response.status;
      throw error;
    }

    if (stream) {
      return response.body as ReadableStream;
    } else {
      const data = await response.json() as SiliconFlowChatResponse;
      return data;
    }
  };
  
  // 5. Execute with retry logic
  let lastError: Error;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      clearTimeout(timeoutId);
      return await makeRequest();
    } catch (error) {
      lastError = error as Error;
      const errorWithStatus = error as any;
      const statusCode = errorWithStatus.statusCode;
      
      // Only retry on 5xx errors or abort (timeout)
      const isRetryable = statusCode >= 500 || statusCode === undefined;
      
      if (!isRetryable || attempt >= MAX_RETRIES) {
        clearTimeout(timeoutId);
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      console.warn(`[PROVIDER] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delayMs}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  clearTimeout(timeoutId);
  throw lastError!;
}

/**
 * Streaming chat completions with usage tracking
 * Returns both the stream for SSE and final usage after stream completes
 */
export interface StreamResult {
  stream: ReadableStream;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    source: 'provider' | 'estimated';
  };
  close: () => void;
}

export async function streamChatCompletions(
  modelSlug: string,
  messages: SiliconFlowMessage[],
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }
): Promise<StreamResult> {
  // Get model from database
  const model = await getModelBySlug(modelSlug);
  
  if (!model) {
    throw new Error(`Model not found: ${modelSlug}`);
  }
  
  if (!model.is_active) {
    throw new Error(`Model is inactive: ${modelSlug}`);
  }
  
  const apiUrl = process.env.THINKSYNC_PROVIDER || 'https://api.siliconflow.com/v1';
  const apiKey = process.env.SILICONFLOW_API_KEY;
  
  if (!apiKey) {
    throw new Error('SILICONFLOW_API_KEY not configured');
  }
  
  const requestBody: SiliconFlowChatRequest = {
    model: model.provider_model_id,
    messages,
    stream: true,
    ...options,
  };
  
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SiliconFlow API error: ${response.status} - ${errorText}`);
  }

  const stream = response.body as ReadableStream;
  
  // For streaming, usage comes in the final chunk or we estimate
  // We'll estimate prompt tokens now and completion tokens as chunks arrive
  const promptText = messages.map(m => m.content).join('\n');
  const estimatedPromptTokens = estimateMessagesTokens(messages);
  
  // Return stream with estimated usage - actual usage after stream
  return {
    stream,
    usage: {
      prompt_tokens: estimatedPromptTokens,
      completion_tokens: 0, // Will be calculated after stream
      total_tokens: estimatedPromptTokens,
      source: 'estimated',
    },
    close: () => {
      // Cancel the stream if needed
      (stream as any).cancel?.();
    },
  };
}
export function estimateCost(
  modelSlug: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Model pricing ni database dan olish
  // Agar topilmasa, default qiymat ishlatish
  const defaultInputPrice = 2.5; // $2.5 per 1M tokens
  const defaultOutputPrice = 10.0; // $10.0 per 1M tokens
  
  const inputCost = (inputTokens / 1000000) * defaultInputPrice;
  const outputCost = (outputTokens / 1000000) * defaultOutputPrice;
  
  return Math.ceil((inputCost + outputCost) * 1000000);
}

/**
 * Streaming response ni qayta ishlash (SSE format)
 */
export async function parseStreamChunk(chunk: string): Promise<SiliconFlowStreamChunk | null> {
  try {
    // SSE format: "data: {JSON}\n\n"
    if (chunk.startsWith('data: ')) {
      const jsonStr = chunk.slice(6).trim();
      
      if (jsonStr === '[DONE]') {
        return null; // Stream tugadi
      }
      
      const data: SiliconFlowStreamChunk = JSON.parse(jsonStr);
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error parsing stream chunk:', error);
    return null;
  }
}

/**
 * Non-streaming response dan usage ma'lumotlarini olish
 * WITH FALLBACK: If provider doesn't return usage, estimate from content
 */
export function extractUsage(
  response: SiliconFlowChatResponse,
  promptText?: string,
  completionText?: string
): {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  source: 'provider' | 'estimated';
} {
  const providerUsage = response.usage;
  
  // Check if provider returned valid usage
  const hasValidUsage = providerUsage && 
    typeof providerUsage.prompt_tokens === 'number' &&
    typeof providerUsage.completion_tokens === 'number' &&
    providerUsage.prompt_tokens >= 0 && 
    providerUsage.completion_tokens >= 0;

  if (hasValidUsage && providerUsage!.prompt_tokens > 0 && providerUsage!.completion_tokens > 0) {
    return {
      prompt_tokens: providerUsage!.prompt_tokens,
      completion_tokens: providerUsage!.completion_tokens,
      total_tokens: providerUsage!.total_tokens || (providerUsage!.prompt_tokens + providerUsage!.completion_tokens),
      source: 'provider',
    };
  }

  // Log estimation event for auditing
  if (promptText || completionText) {
    console.warn(`[USAGE] Provider returned invalid usage, using estimation. ` +
      `Prompt: "${(promptText || '').substring(0, 30)}...", Completion: "${(completionText || '').substring(0, 30)}..."`);
  }

  // Use fallback estimation (direct function calls)
  const promptTokens = promptText ? estimateMessagesTokens([{role: 'user', content: promptText}]) : 0;
  const completionTokens = estimateTokens(completionText || '');

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    source: 'estimated',
  };
}

// =============================================================================
// COMPATIBILITY EXPORTS (for existing code)
// =============================================================================


export default {
  chatCompletions,
  estimateCost,
  parseStreamChunk,
  extractUsage,
};
