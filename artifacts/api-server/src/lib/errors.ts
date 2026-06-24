// Provider Errors - Phase 5C.7
// Custom error classes for production reliability

export class ProviderError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(message: string = 'Provider request timed out') {
    super(message, 'provider_timeout', 504, true);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderRetryError extends ProviderError {
  constructor(
    message: string,
    statusCode: number,
    public attempt: number,
    public maxAttempts: number
  ) {
    const retryable = [500, 502, 503, 504].includes(statusCode);
    super(message, 'provider_retry_error', statusCode, retryable);
    this.name = 'ProviderRetryError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseTimeoutError extends DatabaseError {
  constructor(message: string = 'Database request timed out') {
    super(message, 'database_timeout', true);
    this.name = 'DatabaseTimeoutError';
  }
}

export class DatabaseRetryError extends DatabaseError {
  constructor(
    message: string,
    public attempt: number,
    public maxAttempts: number
  ) {
    super(message, 'database_retry_error', true);
    this.name = 'DatabaseRetryError';
  }
}

// =============================================================================
// ERROR SERIALIZATION
// =============================================================================

export interface SerializedError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * Serialize error for API response
 * Never expose stack traces or internal details
 */
export function serializeError(error: Error): SerializedError {
  // Handle known error types
  if (error instanceof ProviderTimeoutError) {
    return {
      error: {
        message: 'Provider request timed out',
        type: 'provider_timeout',
      },
    };
  }

  if (error instanceof ProviderRetryError) {
    return {
      error: {
        message: 'Provider temporarily unavailable',
        type: 'provider_error',
        code: 'retry_exhausted',
      },
    };
  }

  if (error instanceof ProviderError) {
    return {
      error: {
        message: 'Provider error',
        type: 'provider_error',
        code: error.code,
      },
    };
  }

  if (error instanceof DatabaseTimeoutError) {
    return {
      error: {
        message: 'Database request timed out',
        type: 'database_timeout',
      },
    };
  }

  // Generic error - don't expose details
  return {
    error: {
      message: 'An unexpected error occurred',
      type: 'internal_error',
    },
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof ProviderError) return error.isRetryable;
  if (error instanceof DatabaseError) return error.isRetryable;
  if (error.name === 'FetchError') return true;
  if (error.message.includes('ECONNREFUSED')) return true;
  if (error.message.includes('ETIMEDOUT')) return true;
  if (error.message.includes('ENOTFOUND')) return false;
  return false;
}

export default {
  ProviderError,
  ProviderTimeoutError,
  ProviderRetryError,
  DatabaseError,
  DatabaseTimeoutError,
  DatabaseRetryError,
  serializeError,
  isRetryableError,
};