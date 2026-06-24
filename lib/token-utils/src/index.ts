// Token estimation utilities
// Used as fallback when provider doesn't return usage data

/**
 * Estimate token count from text
 * Approximate: 1 token ≈ 4 characters for English, 2 for CJK
 */
export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Count characters
  const chars = text.length;
  
  // Rough estimation:tokens = chars / 4 (English average)
  // Add buffer for CJK characters
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const nonCjkChars = chars - cjkCount;
  
  // CJK: ~1 token per character, non-CJK: ~4 chars per token
  const cjkTokens = cjkCount;
  const nonCjkTokens = Math.ceil(nonCjkChars / 4);
  
  return cjkTokens + nonCjkTokens;
}

/**
 * Calculate tokens for messages array (prompt side)
 */
export function estimateMessagesTokens(messages: Array<{role: string; content: string}>): number {
  if (!Array.isArray(messages)) return 0;
  
  let total = 0;
  for (const msg of messages) {
    // Add role overhead
    total += estimateTokens(msg.role) + estimateTokens(msg.content || '') + 4;
  }
  // Add overhead for message format
  return total + 3;
}

/**
 * Usage source enum
 */
export type UsageSource = 'provider' | 'estimated';

/**
 * Usage result with source tracking
 */
export interface UsageResult {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  source: UsageSource;
}

/**
 * Extract usage with fallback estimation
 */
export function extractUsageWithFallback(
  providerUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null | undefined,
  promptText: string,
  completionText: string
): UsageResult {
  // Check if provider returned valid usage
  const hasValidUsage = providerUsage && 
    typeof providerUsage.prompt_tokens === 'number' &&
    typeof providerUsage.completion_tokens === 'number' &&
    providerUsage.prompt_tokens > 0 && 
    providerUsage.completion_tokens > 0;

  if (hasValidUsage) {
    return {
      prompt_tokens: providerUsage.prompt_tokens,
      completion_tokens: providerUsage.completion_tokens,
      total_tokens: providerUsage.total_tokens || (providerUsage.prompt_tokens + providerUsage.completion_tokens),
      source: 'provider',
    };
  }

  // Log estimation event for auditing
  console.warn(`[TOKEN] Provider returned invalid usage, using estimation. ` +
    `Input: "${promptText.substring(0, 50)}...", Output: "${completionText.substring(0, 50)}..."`);

  // Use fallback estimation
  const promptTokens = estimateMessagesTokens(typeof promptText === 'string' ? [{role: 'user', content: promptText}] : []);
  const completionTokens = estimateTokens(completionText);

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    source: 'estimated',
  };
}