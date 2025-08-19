import {
  LLMProvider,
  LLMMessage,
  LLMCallOptions,
  LLMResponse,
  LLMProviderError,
  LLMTimeoutError,
  LLMQuotaExceededError,
  LLMAuthenticationError,
  LLMInvalidResponseError,
} from '../types';

/**
 * OpenRouter API response format
 */
interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  model?: string;
}

/**
 * OpenRouter provider implementation
 */
export class OpenRouterProvider implements LLMProvider {
  private readonly name = 'openrouter';
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey: string;
  private readonly defaultModels = [
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3.1-8b-instruct:free',
  ];

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }

  /**
   * Convert LLMMessage array to OpenRouter format
   */
  private formatMessages(messages: LLMMessage[]): Array<{ role: string; content: string }> {
    return messages.map(message => ({
      role: message.role,
      content: message.content,
    }));
  }

  /**
   * Create request payload for OpenRouter
   */
  private createPayload(messages: LLMMessage[], options?: LLMCallOptions) {
    const models = options?.models || this.defaultModels;
    
    return {
      models,
      messages: this.formatMessages(messages),
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1000,
    };
  }

  /**
   * Make HTTP request to OpenRouter
   */
  private async makeRequest(payload: any, timeoutMs: number): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Finance Bot API',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      return data as OpenRouterResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMTimeoutError('Request timed out', this.name, timeoutMs);
      }
      
      throw error;
    }
  }

  /**
   * Handle error responses from OpenRouter
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `HTTP ${statusCode}`;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || errorMessage;
    } catch {
      // If we can't parse the error response, use the status text
      errorMessage = response.statusText || errorMessage;
    }

    switch (statusCode) {
      case 401:
        throw new LLMAuthenticationError(
          `OpenRouter authentication failed: ${errorMessage}`,
          this.name
        );
      case 429:
        const retryAfter = response.headers.get('retry-after');
        throw new LLMQuotaExceededError(
          `OpenRouter rate limit exceeded: ${errorMessage}`,
          this.name,
          retryAfter ? parseInt(retryAfter) * 1000 : undefined
        );
      case 400:
        throw new LLMProviderError(
          `OpenRouter bad request: ${errorMessage}`,
          this.name,
          'BAD_REQUEST',
          400
        );
      case 500:
      case 502:
      case 503:
      case 504:
        throw new LLMProviderError(
          `OpenRouter server error: ${errorMessage}`,
          this.name,
          'SERVER_ERROR',
          statusCode
        );
      default:
        throw new LLMProviderError(
          `OpenRouter error: ${errorMessage}`,
          this.name,
          'UNKNOWN_ERROR',
          statusCode
        );
    }
  }

  /**
   * Make a call to OpenRouter
   */
  async call(messages: LLMMessage[], options?: LLMCallOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const timeoutMs = options?.timeout || 30000; // 30 second default

    try {
      const payload = this.createPayload(messages, options);
      const response = await this.makeRequest(payload, timeoutMs);

      const duration = Date.now() - startTime;

      // Validate response structure
      if (!response.choices || response.choices.length === 0) {
        throw new LLMInvalidResponseError(
          'No choices returned from OpenRouter',
          this.name
        );
      }

      const choice = response.choices[0];
      if (!choice.message || typeof choice.message.content !== 'string') {
        throw new LLMInvalidResponseError(
          'Invalid message format from OpenRouter',
          this.name
        );
      }

      return {
        content: choice.message.content,
        metadata: {
          provider: this.name,
          model: response.model || payload.models[0],
          tokens: response.usage?.total_tokens,
          duration,
          cached: false,
        },
      };
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof LLMProviderError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new LLMProviderError(
          `OpenRouter network error: ${error.message}`,
          this.name,
          'NETWORK_ERROR'
        );
      }

      // Unknown error
      throw new LLMProviderError(
        `Unknown OpenRouter error: ${String(error)}`,
        this.name,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Get provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if OpenRouter provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check with minimal prompt
      const testMessages: LLMMessage[] = [
        { role: 'user', content: 'Hello' }
      ];
      
      await this.call(testMessages, { timeout: 5000 });
      return true;
    } catch (error) {
      console.warn(`OpenRouter provider health check failed:`, error);
      return false;
    }
  }
}

/**
 * Create and export default OpenRouter provider instance
 */
export function createOpenRouterProvider(apiKey?: string): OpenRouterProvider {
  return new OpenRouterProvider(apiKey);
}
