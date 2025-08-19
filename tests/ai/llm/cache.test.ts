import { describe, it, expect, beforeEach } from 'vitest';
import { LLMCache } from '@/ai/llm/cache';
import { LLMMessage, LLMResponse } from '@/ai/llm/types';

describe('LLMCache', () => {
  let cache: LLMCache;
  let testMessages: LLMMessage[];
  let testResponse: LLMResponse;

  beforeEach(() => {
    cache = new LLMCache({
      enabled: true,
      ttl: 1000, // 1 second for testing
      maxSize: 3,
    });

    testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Extract transaction details from: Coffee at Starbucks $5' },
    ];

    testResponse = {
      content: JSON.stringify([{
        description: "Coffee purchase",
        category: "dining",
        type: "expense",
        amount: 4.50,
        date: "2024-01-15",
        merchant: "Starbucks",
        paymentMethod: "credit card",
        location: "New York"
      }]),
      metadata: {
        provider: 'genkit',
        model: 'test-model',
        duration: 100,
        cached: false,
      },
    };
  });

  describe('Basic cache operations', () => {
    it('should return null for cache miss', () => {
      const result = cache.get(testMessages);
      expect(result).toBeNull();
    });

    it('should store and retrieve cached responses', () => {
      // Store response
      cache.set(testMessages, undefined, testResponse);

      // Retrieve response
      const cachedResponse = cache.get(testMessages);
      expect(cachedResponse).not.toBeNull();
      expect(cachedResponse?.content).toBe(testResponse.content);
      expect(cachedResponse?.metadata.cached).toBe(true);
    });

    it('should handle cache with options', () => {
      const options = { temperature: 0.5, maxTokens: 1000 };
      
      // Store with options
      cache.set(testMessages, options, testResponse);

      // Should hit with same options
      const hit = cache.get(testMessages, options);
      expect(hit).not.toBeNull();

      // Should miss with different options
      const miss = cache.get(testMessages, { temperature: 0.7 });
      expect(miss).toBeNull();
    });

    it('should clear cache', () => {
      cache.set(testMessages, undefined, testResponse);
      expect(cache.get(testMessages)).not.toBeNull();

      cache.clear();
      expect(cache.get(testMessages)).toBeNull();
    });
  });

  describe('Cache expiration', () => {
    it('should expire entries after TTL', async () => {
      cache.set(testMessages, undefined, testResponse);
      expect(cache.get(testMessages)).not.toBeNull();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.get(testMessages)).toBeNull();
    });
  });

  describe('Cache size limits', () => {
    it('should evict LRU entries when cache is full', async () => {
      const messages1 = [{ role: 'user' as const, content: 'Message 1' }];
      const messages2 = [{ role: 'user' as const, content: 'Message 2' }];
      const messages3 = [{ role: 'user' as const, content: 'Message 3' }];
      const messages4 = [{ role: 'user' as const, content: 'Message 4' }];

      // Fill cache to capacity with small delays to ensure different timestamps
      cache.set(messages1, undefined, testResponse);
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay

      cache.set(messages2, undefined, testResponse);
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay

      cache.set(messages3, undefined, testResponse);
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay

      // Access entries to establish LRU order (messages1 becomes least recently used)
      // Don't access messages1, making it the least recently used
      cache.get(messages2); // More recent
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
      cache.get(messages3); // Most recent
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay

      // Add one more to trigger eviction
      cache.set(messages4, undefined, testResponse);

      // First entry should be evicted (LRU)
      expect(cache.get(messages1)).toBeNull();
      expect(cache.get(messages2)).not.toBeNull();
      expect(cache.get(messages3)).not.toBeNull();
      expect(cache.get(messages4)).not.toBeNull();
    });
  });

  describe('Cache metrics', () => {
    it('should track hits and misses', () => {
      // Initial metrics
      let metrics = cache.getMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.hitRate).toBe(0);

      // Cache miss
      cache.get(testMessages);
      metrics = cache.getMetrics();
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(0);

      // Cache set and hit
      cache.set(testMessages, undefined, testResponse);
      cache.get(testMessages);
      metrics = cache.getMetrics();
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBe(0.5);
    });

    it('should track cache size', () => {
      let metrics = cache.getMetrics();
      expect(metrics.size).toBe(0);

      cache.set(testMessages, undefined, testResponse);
      metrics = cache.getMetrics();
      expect(metrics.size).toBe(1);
    });
  });

  describe('Cache configuration', () => {
    it('should respect disabled cache', () => {
      const disabledCache = new LLMCache({
        enabled: false,
        ttl: 1000,
        maxSize: 10,
      });

      disabledCache.set(testMessages, undefined, testResponse);
      const result = disabledCache.get(testMessages);
      expect(result).toBeNull();
    });

    it('should update configuration', () => {
      cache.set(testMessages, undefined, testResponse);
      expect(cache.get(testMessages)).not.toBeNull();

      // Disable cache
      cache.updateConfig({ enabled: false });
      expect(cache.get(testMessages)).toBeNull();

      // Re-enable cache
      cache.updateConfig({ enabled: true });
      cache.set(testMessages, undefined, testResponse);
      expect(cache.get(testMessages)).not.toBeNull();
    });

    it('should get current configuration', () => {
      const config = cache.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.ttl).toBe(1000);
      expect(config.maxSize).toBe(3);
    });
  });

  describe('Cache key generation', () => {
    it('should generate different keys for different messages', () => {
      const messages1 = [{ role: 'user' as const, content: 'Message 1' }];
      const messages2 = [{ role: 'user' as const, content: 'Message 2' }];

      cache.set(messages1, undefined, testResponse);
      cache.set(messages2, undefined, { ...testResponse, content: 'Different content' });

      const result1 = cache.get(messages1);
      const result2 = cache.get(messages2);

      expect(result1?.content).toBe(testResponse.content);
      expect(result2?.content).toBe('Different content');
    });

    it('should generate same keys for same messages and options', () => {
      const options = { temperature: 0.5 };

      cache.set(testMessages, options, testResponse);
      const result = cache.get(testMessages, options);

      expect(result).not.toBeNull();
      expect(result?.content).toBe(testResponse.content);
    });
  });
});
