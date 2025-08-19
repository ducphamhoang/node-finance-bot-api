import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LLMMessage,
  LLMResponse,
  LLMProviderError,
  LLMTimeoutError,
  LLMQuotaExceededError,
  LLMAllProvidersFailedError
} from '@/ai/llm/types';

// Use vi.hoisted to create mock functions that are properly hoisted
const { mockGenkitCall, mockGenkitIsHealthy, mockOpenRouterCall, mockOpenRouterIsHealthy } = vi.hoisted(() => ({
  mockGenkitCall: vi.fn(),
  mockGenkitIsHealthy: vi.fn().mockResolvedValue(true),
  mockOpenRouterCall: vi.fn(),
  mockOpenRouterIsHealthy: vi.fn().mockResolvedValue(true),
}));

// Mock the provider modules with hoisted mock instances
vi.mock('@/ai/llm/providers/genkit', () => ({
  genkitProvider: {
    call: mockGenkitCall,
    getName: () => 'genkit',
    isHealthy: mockGenkitIsHealthy,
  },
}));

vi.mock('@/ai/llm/providers/openrouter', () => ({
  createOpenRouterProvider: vi.fn(() => ({
    call: mockOpenRouterCall,
    getName: () => 'openrouter',
    isHealthy: mockOpenRouterIsHealthy,
  })),
}));

// Import the client after mocks are set up
import { LLMClient } from '@/ai/llm/client';

describe('LLMClient', () => {
  let client: LLMClient;
  let testMessages: LLMMessage[];

  const createSuccessResponse = (provider: string): LLMResponse => ({
    content: JSON.stringify([{
      description: `${provider} transaction`,
      category: "test",
      type: "expense",
      amount: 10.00,
      date: "2024-01-01",
      merchant: "Test Store",
      paymentMethod: "credit card",
      location: "Test City"
    }]),
    metadata: {
      provider,
      model: 'test-model',
      duration: 100,
      cached: false,
    },
  });

  beforeEach(() => {
    // Reset environment variables
    process.env.LLM_CACHE_ENABLED = 'true';
    process.env.LLM_FALLBACK_ENABLED = 'true';
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.LLM_TIMEOUT = '5000';

    // Reset mocks
    vi.clearAllMocks();

    // Set up default successful responses using persistent mock functions
    mockGenkitCall.mockResolvedValue(createSuccessResponse('genkit'));
    mockOpenRouterCall.mockResolvedValue(createSuccessResponse('openrouter'));

    client = new LLMClient({
      cache: { enabled: true, ttl: 1000, maxSize: 10 },
      fallbackEnabled: true,
      defaultTimeout: 5000,
      maxRetries: 2,
      retryDelay: 100,
      openRouterApiKey: 'test-key',
    });

    testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Extract transaction details from: Coffee at Starbucks $5' },
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful calls with primary provider', () => {
    it('should successfully call Genkit provider', async () => {
      const response = await client.call(testMessages);

      expect(mockGenkitCall).toHaveBeenCalledTimes(1);
      expect(response.metadata.provider).toBe('genkit');
      expect(response.content).toContain('genkit transaction');
      expect(response.metadata.cached).toBe(false);
    });

    it('should return cached response on second call', async () => {
      // First call
      const response1 = await client.call(testMessages);
      expect(response1.metadata.cached).toBe(false);
      expect(mockGenkitCall).toHaveBeenCalledTimes(1);

      // Second call should be cached
      const response2 = await client.call(testMessages);
      expect(response2.metadata.cached).toBe(true);
      expect(response2.content).toBe(response1.content);
      // Should not call provider again due to caching
      expect(mockGenkitCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback behavior', () => {
    it('should fallback to OpenRouter when Genkit fails', async () => {
      mockGenkitCall.mockRejectedValue(new LLMProviderError('Genkit failed', 'genkit'));

      const response = await client.call(testMessages);

      expect(mockGenkitCall).toHaveBeenCalled();
      expect(mockOpenRouterCall).toHaveBeenCalled();
      expect(response.metadata.provider).toBe('openrouter');
      expect(response.content).toContain('openrouter transaction');
    });

    it('should cache fallback provider responses', async () => {
      mockGenkitCall.mockRejectedValue(new LLMProviderError('Genkit failed', 'genkit'));

      // First call uses fallback
      const response1 = await client.call(testMessages);
      expect(response1.metadata.provider).toBe('openrouter');
      expect(response1.metadata.cached).toBe(false);

      // Reset call counts after first call
      const genkitCallsAfterFirst = mockGenkitCall.mock.calls.length;
      const openRouterCallsAfterFirst = mockOpenRouterCall.mock.calls.length;

      // Second call should be cached
      const response2 = await client.call(testMessages);
      expect(response2.metadata.cached).toBe(true);
      // Should not call providers again due to caching
      expect(mockGenkitCall).toHaveBeenCalledTimes(genkitCallsAfterFirst);
      expect(mockOpenRouterCall).toHaveBeenCalledTimes(openRouterCallsAfterFirst);
    });

    it('should not retry on authentication errors', async () => {
      const authError = new LLMProviderError('Auth failed', 'genkit', 'AUTHENTICATION_FAILED', 401);
      mockGenkitCall.mockRejectedValue(authError);

      const response = await client.call(testMessages);
      expect(response.metadata.provider).toBe('openrouter');
      expect(mockGenkitCall).toHaveBeenCalledTimes(1); // No retries for auth errors
      expect(mockOpenRouterCall).toHaveBeenCalledTimes(1);
    });

    it('should not retry on quota exceeded errors', async () => {
      const quotaError = new LLMQuotaExceededError('Quota exceeded', 'genkit', 60000);
      mockGenkitCall.mockRejectedValue(quotaError);

      const response = await client.call(testMessages);
      expect(response.metadata.provider).toBe('openrouter');
      expect(mockGenkitCall).toHaveBeenCalledTimes(1); // No retries for quota errors
      expect(mockOpenRouterCall).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling when all providers fail', () => {
    it('should throw LLMAllProvidersFailedError when all providers fail', async () => {
      const genkitError = new LLMProviderError('Genkit failed', 'genkit');
      const openRouterError = new LLMProviderError('OpenRouter failed', 'openrouter');

      mockGenkitCall.mockRejectedValue(genkitError);
      mockOpenRouterCall.mockRejectedValue(openRouterError);

      await expect(client.call(testMessages)).rejects.toThrow(LLMAllProvidersFailedError);
    });

    it('should include all provider errors in the aggregated error', async () => {
      const genkitError = new LLMProviderError('Genkit failed', 'genkit');
      const openRouterError = new LLMProviderError('OpenRouter failed', 'openrouter');

      mockGenkitCall.mockRejectedValue(genkitError);
      mockOpenRouterCall.mockRejectedValue(openRouterError);

      try {
        await client.call(testMessages);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMAllProvidersFailedError);
        const allProvidersError = error as LLMAllProvidersFailedError;
        expect(allProvidersError.errors).toHaveLength(2);
        expect(allProvidersError.errors[0].provider).toBe('genkit');
        expect(allProvidersError.errors[1].provider).toBe('openrouter');
      }
    });
  });

  describe('Timeout and retry logic', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = new LLMTimeoutError('Request timed out', 'genkit', 5000);
      mockGenkitCall.mockRejectedValue(timeoutError);

      const response = await client.call(testMessages);
      expect(response.metadata.provider).toBe('openrouter');
      expect(mockGenkitCall).toHaveBeenCalled();
      expect(mockOpenRouterCall).toHaveBeenCalled();
    });

    it('should retry failed requests up to maxRetries', async () => {
      // Test that retries don't happen for non-retryable errors
      const authError = new LLMProviderError('Auth failed', 'genkit', 'AUTHENTICATION_FAILED', 401);
      mockGenkitCall.mockRejectedValue(authError);

      const startTime = Date.now();
      const response = await client.call(testMessages);
      const duration = Date.now() - startTime;

      // Should fallback quickly without retries for auth errors
      expect(duration).toBeLessThan(500);
      expect(response.metadata.provider).toBe('openrouter');
      expect(mockGenkitCall).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Cache functionality', () => {
    it('should respect cache configuration', async () => {
      const clientWithoutCache = new LLMClient({
        cache: { enabled: false, ttl: 1000, maxSize: 10 },
        fallbackEnabled: true,
        defaultTimeout: 5000,
        maxRetries: 1,
        retryDelay: 100,
        openRouterApiKey: 'test-key',
      });

      // Both calls should hit the provider (no caching)
      const response1 = await clientWithoutCache.call(testMessages);
      const response2 = await clientWithoutCache.call(testMessages);

      expect(response1.metadata.cached).toBe(false);
      expect(response2.metadata.cached).toBe(false);
      expect(mockGenkitCall).toHaveBeenCalledTimes(2); // Called twice due to no caching
    });

    it('should provide cache metrics', () => {
      const metrics = client.getCacheMetrics();
      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('size');
      expect(metrics).toHaveProperty('hitRate');
    });

    it('should clear cache when requested', async () => {
      // First call
      await client.call(testMessages);
      expect(mockGenkitCall).toHaveBeenCalledTimes(1);

      // Clear cache
      client.clearCache();

      // Second call should not be cached
      const response = await client.call(testMessages);
      expect(response.metadata.cached).toBe(false);
      expect(mockGenkitCall).toHaveBeenCalledTimes(2); // Called again due to cache clear
    });
  });

  describe('Configuration and health checks', () => {
    it('should return available providers', () => {
      const providers = client.getProviders();
      expect(providers).toContain('genkit');
      expect(providers).toContain('openrouter');
    });

    it('should check provider health', async () => {
      const health = await client.checkHealth();
      expect(health.genkit).toBe(true);
      expect(health.openrouter).toBe(true);
    });

    it('should update configuration', () => {
      const newConfig = { fallbackEnabled: false };
      client.updateConfig(newConfig);

      const config = client.getConfig();
      expect(config.fallbackEnabled).toBe(false);
    });

    it('should get current configuration', () => {
      const config = client.getConfig();
      expect(config).toHaveProperty('fallbackEnabled');
      expect(config).toHaveProperty('defaultTimeout');
      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('cache');
    });
  });
});
