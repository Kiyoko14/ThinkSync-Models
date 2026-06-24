// Retry Utility - Phase 5C.7
// Exponential backoff retry with configurable options

import { isRetryableError } from './errors';

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn Function to retry
 * @param options Retry configuration
 * @param customRetryCheck Custom function to determine if error is retryable
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  customRetryCheck?: (error: Error) => boolean
): Promise<RetryResult<T>> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry
      const isRetryable = customRetryCheck 
        ? customRetryCheck(lastError)
        : isRetryableError(lastError);
      
      // Don't retry on last attempt or non-retryable errors
      if (!isRetryable || attempt >= opts.maxAttempts) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
        };
      }
      
      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );
      
      // Call retry callback if provided
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, delayMs);
      }
      
      console.log(`[RETRY] Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${delayMs}ms...`);
      
      await sleep(delayMs);
    }
  }
  
  return {
    success: false,
    error: lastError!,
    attempts: opts.maxAttempts,
  };
}

/**
 * Retry a function with provider-specific logic
 */
export async function retryProvider<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<RetryResult<T>> {
  return retry(fn, {
    maxAttempts,
    initialDelayMs: 1000,
    maxDelayMs: 4000,
    backoffMultiplier: 2,
    onRetry: (attempt, error, delayMs) => {
      console.warn(`[PROVIDER] Retry attempt ${attempt} after ${delayMs}ms - ${error.message}`);
    },
  });
}

/**
 * Retry a function with database-specific logic
 */
export async function retryDatabase<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<RetryResult<T>> {
  return retry(fn, {
    maxAttempts,
    initialDelayMs: 500,
    maxDelayMs: 3000,
    backoffMultiplier: 2,
    onRetry: (attempt, error, delayMs) => {
      console.warn(`[DATABASE] Retry attempt ${attempt} after ${delayMs}ms - ${error.message}`);
    },
  });
}

export default {
  retry,
  retryProvider,
  retryDatabase,
  DEFAULT_RETRY_OPTIONS,
};