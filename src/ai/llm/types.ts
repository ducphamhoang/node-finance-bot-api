/**
 * LLM abstraction layer types and interfaces
 */

/**
 * Message format for LLM communication
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options for LLM calls
 */
export interface LLMCallOptions {
  /** Temperature for response generation (0.0 to 1.0) */
  temperature?: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Array of model names to try in order */
  models?: string[];
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Metadata about the LLM response
 */
export interface LLMResponseMetadata {
  /** Provider that generated the response */
  provider: string;
  /** Model used for generation */
  model?: string;
  /** Number of tokens in the response */
  tokens?: number;
  /** Response generation time in milliseconds */
  duration?: number;
  /** Whether response was served from cache */
  cached?: boolean;
}

/**
 * Response from LLM provider
 */
export interface LLMResponse {
  /** Generated content */
  content: string;
  /** Response metadata */
  metadata: LLMResponseMetadata;
}

/**
 * Configuration for LLM providers
 */
export interface LLMProviderConfig {
  /** Provider name */
  name: string;
  /** API key or authentication token */
  apiKey?: string;
  /** Base URL for API calls */
  baseUrl?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
}

/**
 * Interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Make a call to the LLM provider
   * @param messages Array of messages to send
   * @param options Optional call configuration
   * @returns Promise resolving to LLM response
   */
  call(messages: LLMMessage[], options?: LLMCallOptions): Promise<LLMResponse>;
  
  /**
   * Get provider name
   */
  getName(): string;
  
  /**
   * Check if provider is available/healthy
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Base error class for LLM provider errors
 */
export class LLMProviderError extends Error {
  public readonly provider: string;
  public readonly code?: string;
  public readonly statusCode?: number;

  constructor(message: string, provider: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'LLMProviderError';
    this.provider = provider;
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Error for request timeouts
 */
export class LLMTimeoutError extends LLMProviderError {
  constructor(message: string, provider: string, timeout: number) {
    super(`Request timed out after ${timeout}ms: ${message}`, provider, 'TIMEOUT');
    this.name = 'LLMTimeoutError';
  }
}

/**
 * Error for quota/rate limit exceeded
 */
export class LLMQuotaExceededError extends LLMProviderError {
  public readonly retryAfter?: number;

  constructor(message: string, provider: string, retryAfter?: number) {
    super(message, provider, 'QUOTA_EXCEEDED', 429);
    this.name = 'LLMQuotaExceededError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error for invalid API responses
 */
export class LLMInvalidResponseError extends LLMProviderError {
  constructor(message: string, provider: string) {
    super(message, provider, 'INVALID_RESPONSE');
    this.name = 'LLMInvalidResponseError';
  }
}

/**
 * Error for authentication failures
 */
export class LLMAuthenticationError extends LLMProviderError {
  constructor(message: string, provider: string) {
    super(message, provider, 'AUTHENTICATION_FAILED', 401);
    this.name = 'LLMAuthenticationError';
  }
}

/**
 * Aggregated error when all providers fail
 */
export class LLMAllProvidersFailedError extends Error {
  public readonly errors: LLMProviderError[];

  constructor(errors: LLMProviderError[]) {
    const message = `All LLM providers failed: ${errors.map(e => `${e.provider}: ${e.message}`).join(', ')}`;
    super(message);
    this.name = 'LLMAllProvidersFailedError';
    this.errors = errors;
  }
}
