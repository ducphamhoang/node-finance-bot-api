import {
  LLMProvider,
  LLMMessage,
  LLMCallOptions,
  LLMResponse,
  LLMProviderError,
  LLMAllProvidersFailedError,
} from './types';
import { LLMCache, CacheConfig, createDefaultCacheConfig } from './cache';
import { genkitProvider } from './providers/genkit';
import { createOpenRouterProvider } from './providers/openrouter';

/**
 * Configuration for LLM client
 */
export interface LLMClientConfig {
  /** Cache configuration */
  cache: CacheConfig;
  /** Whether fallback is enabled */
  fallbackEnabled: boolean;
  /** Default timeout for requests */
  defaultTimeout: number;
  /** Maximum retries per provider */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** OpenRouter API key */
  openRouterApiKey?: string;
}

/**
 * Main LLM client that orchestrates providers and fallback logic
 */
export class LLMClient {
  private providers: LLMProvider[] = [];
  private cache: LLMCache;
  private config: LLMClientConfig;

  constructor(config?: Partial<LLMClientConfig>) {
    this.config = {
      cache: createDefaultCacheConfig(),
      fallbackEnabled: process.env.LLM_FALLBACK_ENABLED !== 'false',
      defaultTimeout: parseInt(process.env.LLM_TIMEOUT || '30000'),
      maxRetries: 2,
      retryDelay: 1000,
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      ...config,
    };

    this.cache = new LLMCache(this.config.cache);
    this.initializeProviders();
  }

  /**
   * Initialize providers in priority order
   */
  private initializeProviders(): void {
    // Primary provider: Genkit
    this.providers.push(genkitProvider);

    // Fallback provider: OpenRouter (if enabled and API key available)
    if (this.config.fallbackEnabled && this.config.openRouterApiKey) {
      try {
        const openRouterProvider = createOpenRouterProvider(this.config.openRouterApiKey);
        this.providers.push(openRouterProvider);
      } catch (error) {
        console.warn('Failed to initialize OpenRouter provider:', error);
      }
    }

    console.log(`LLM Client initialized with ${this.providers.length} providers:`, 
      this.providers.map(p => p.getName()));
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Try calling a provider with retries
   */
  private async callProviderWithRetries(
    provider: LLMProvider,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse> {
    let lastError: LLMProviderError | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`Attempting ${provider.getName()} call (attempt ${attempt}/${this.config.maxRetries})`);
        
        const response = await provider.call(messages, {
          timeout: this.config.defaultTimeout,
          ...options,
        });

        console.log(`${provider.getName()} call successful`);
        return response;
      } catch (error) {
        lastError = error instanceof LLMProviderError ? error : 
          new LLMProviderError(
            `Unknown error: ${String(error)}`,
            provider.getName()
          );

        console.warn(`${provider.getName()} attempt ${attempt} failed:`, lastError.message);

        // Don't retry on authentication or quota errors
        if (lastError.code === 'AUTHENTICATION_FAILED' || 
            lastError.code === 'QUOTA_EXCEEDED') {
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Make a call using available providers with fallback logic
   */
  async call(messages: LLMMessage[], options?: LLMCallOptions): Promise<LLMResponse> {
    // Check cache first
    const cachedResponse = this.cache.get(messages, options);
    if (cachedResponse) {
      console.log('Returning cached response');
      return cachedResponse;
    }

    const errors: LLMProviderError[] = [];
    
    // Try each provider in order
    for (const provider of this.providers) {
      try {
        const response = await this.callProviderWithRetries(provider, messages, options);
        
        // Cache successful response
        this.cache.set(messages, options, response);
        
        // Log fallback event if this wasn't the primary provider
        if (provider !== this.providers[0]) {
          console.log(`Fallback successful: used ${provider.getName()} after primary provider failed`);
        }
        
        return response;
      } catch (error) {
        const providerError = error instanceof LLMProviderError ? error :
          new LLMProviderError(
            `Unknown error: ${String(error)}`,
            provider.getName()
          );
        
        errors.push(providerError);
        console.error(`Provider ${provider.getName()} failed:`, providerError.message);
      }
    }

    // All providers failed
    console.error('All LLM providers failed');
    throw new LLMAllProvidersFailedError(errors);
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics() {
    return this.cache.getMetrics();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get available providers
   */
  getProviders(): string[] {
    return this.providers.map(p => p.getName());
  }

  /**
   * Check health of all providers
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    await Promise.all(
      this.providers.map(async provider => {
        try {
          health[provider.getName()] = await provider.isHealthy();
        } catch (error) {
          health[provider.getName()] = false;
        }
      })
    );
    
    return health;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update cache config if provided
    if (newConfig.cache) {
      this.cache.updateConfig(newConfig.cache);
    }
    
    // Reinitialize providers if fallback settings changed
    if ('fallbackEnabled' in newConfig || 'openRouterApiKey' in newConfig) {
      this.providers = [];
      this.initializeProviders();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMClientConfig {
    return { ...this.config };
  }
}

/**
 * Create default LLM client configuration from environment variables
 */
export function createDefaultLLMClientConfig(): LLMClientConfig {
  return {
    cache: createDefaultCacheConfig(),
    fallbackEnabled: process.env.LLM_FALLBACK_ENABLED !== 'false',
    defaultTimeout: parseInt(process.env.LLM_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '2'),
    retryDelay: parseInt(process.env.LLM_RETRY_DELAY || '1000'),
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
  };
}
