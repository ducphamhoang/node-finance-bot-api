/**
 * LLM abstraction layer main exports
 */

// Export all types
export * from './types';

// Export cache utilities
export { LLMCache, createDefaultCacheConfig } from './cache';
export type { CacheConfig, CacheMetrics } from './cache';

// Export client
export { LLMClient, createDefaultLLMClientConfig } from './client';
export type { LLMClientConfig } from './client';

// Export providers for testing and advanced usage
export { genkitProvider } from './providers/genkit';
export { createOpenRouterProvider } from './providers/openrouter';

// Create and export default client instance
import { LLMClient, createDefaultLLMClientConfig } from './client';

/**
 * Default LLM client instance
 * This is a singleton that can be used throughout the application
 */
let defaultClient: LLMClient | null = null;

/**
 * Get the default LLM client instance
 * Creates the instance on first call (lazy initialization)
 */
export function getDefaultLLMClient(): LLMClient {
  if (!defaultClient) {
    defaultClient = new LLMClient(createDefaultLLMClientConfig());
  }
  return defaultClient;
}

/**
 * Create a new LLM client with custom configuration
 */
export function createLLMClient(config?: Partial<import('./client').LLMClientConfig>): LLMClient {
  return new LLMClient(config);
}

/**
 * Reset the default client instance (useful for testing)
 */
export function resetDefaultLLMClient(): void {
  defaultClient = null;
}

// Export the default client for convenience
export const llmClient = getDefaultLLMClient();
