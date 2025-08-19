import crypto from 'crypto';
import { LLMMessage, LLMCallOptions, LLMResponse } from './types';

/**
 * Configuration for LLM cache
 */
export interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Maximum number of cache entries */
  maxSize: number;
}

/**
 * Cache entry with expiration
 */
interface CacheEntry {
  response: LLMResponse;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache metrics for monitoring
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * LRU cache implementation for LLM responses
 */
export class LLMCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics = {
    hits: 0,
    misses: 0,
  };

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Generate cache key from messages and options
   */
  private generateKey(messages: LLMMessage[], options?: LLMCallOptions): string {
    const content = {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      models: options?.models?.sort(), // Sort to ensure consistent key
    };
    
    const serialized = JSON.stringify(content);
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict least recently used entries if cache is full
   */
  private evictLRU(): void {
    if (this.cache.size < this.config.maxSize) {
      return;
    }

    // Find the least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cached response
   */
  get(messages: LLMMessage[], options?: LLMCallOptions): LLMResponse | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(messages, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Mark response as cached
    const cachedResponse: LLMResponse = {
      ...entry.response,
      metadata: {
        ...entry.response.metadata,
        cached: true,
      },
    };

    this.metrics.hits++;
    return cachedResponse;
  }

  /**
   * Store response in cache
   */
  set(messages: LLMMessage[], options: LLMCallOptions | undefined, response: LLMResponse): void {
    if (!this.config.enabled) {
      return;
    }

    this.cleanupExpired();
    this.evictLRU();

    const key = this.generateKey(messages, options);
    const now = Date.now();
    
    const entry: CacheEntry = {
      response: {
        ...response,
        metadata: {
          ...response.metadata,
          cached: false, // Original response wasn't cached
        },
      },
      expiresAt: now + this.config.ttl,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.metrics.hits = 0;
    this.metrics.misses = 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      size: this.cache.size,
      hitRate: totalRequests > 0 ? this.metrics.hits / totalRequests : 0,
    };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (!this.config.enabled) {
      this.clear();
    }
  }

  /**
   * Warm cache with common queries (optional feature)
   */
  async warm(queries: Array<{ messages: LLMMessage[]; options?: LLMCallOptions; response: LLMResponse }>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    for (const query of queries) {
      this.set(query.messages, query.options, query.response);
    }
  }
}

/**
 * Create default cache configuration from environment variables
 */
export function createDefaultCacheConfig(): CacheConfig {
  return {
    enabled: process.env.LLM_CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.LLM_CACHE_TTL || '3600000'), // 1 hour default
    maxSize: parseInt(process.env.LLM_CACHE_MAX_SIZE || '1000'),
  };
}
