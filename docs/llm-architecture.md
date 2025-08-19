# LLM Architecture Documentation

This document provides detailed information about the LLM (Large Language Model) abstraction layer implemented in FinanceFlow AI.

## Overview

The LLM architecture is designed to provide a robust, scalable, and maintainable system for AI-powered transaction extraction. It features multiple providers, automatic fallback, intelligent caching, and comprehensive error handling.

## Architecture Components

### 1. LLM Client (`src/ai/llm/client.ts`)

The `LLMClient` class is the main orchestrator that:
- Manages multiple LLM providers
- Handles automatic fallback between providers
- Implements caching for improved performance
- Provides retry logic and error handling
- Tracks metrics and performance

**Key Features:**
- Provider health monitoring
- Automatic provider selection
- Request/response validation
- Configurable timeouts and retries

### 2. Providers (`src/ai/llm/providers/`)

#### Genkit Provider (`genkit.ts`)
- **Primary provider** using Google AI/Gemini models
- Integrates with the existing Genkit framework
- Provides high-quality transaction extraction
- Requires `GOOGLE_API_KEY` environment variable

#### OpenRouter Provider (`openrouter.ts`)
- **Fallback provider** for enhanced reliability
- Supports multiple open-source models (Gemma, Llama, etc.)
- Provides cost-effective alternatives
- Requires `OPENROUTER_API_KEY` environment variable

### 3. Caching System (`src/ai/llm/cache.ts`)

The `LLMCache` class implements:
- **LRU (Least Recently Used) cache** for efficient memory usage
- **TTL (Time To Live)** support for cache expiration
- **Metrics tracking** for cache hit/miss rates
- **Configurable size limits** to prevent memory issues

**Benefits:**
- Reduces API calls and costs
- Improves response times
- Provides offline-like experience for repeated queries

### 4. Type System (`src/ai/llm/types.ts`)

Comprehensive TypeScript interfaces for:
- **LLM Messages**: Structured conversation format
- **Provider Interfaces**: Standardized provider API
- **Error Classes**: Specific error types for different failure modes
- **Configuration Types**: Type-safe configuration options

### 5. Prompt Management (`src/ai/prompts/`)

Centralized prompt templates with:
- **Message builders** for structured LLM communication
- **Template variables** for dynamic content
- **Backward compatibility** with legacy Genkit prompts
- **Reusable prompt components**
- **Enhanced response formatting** with explicit JSON-only instructions

### 6. Response Processing

Robust response handling system:
- **Markdown-aware JSON parsing** that handles code block wrapped responses
- **Graceful error handling** for malformed or invalid JSON
- **Schema validation** using Zod for type safety
- **Detailed error logging** for debugging and monitoring

## Configuration

### Environment Variables

```bash
# Primary provider (required)
GOOGLE_API_KEY=your_google_api_key

# Fallback provider (optional but recommended)
OPENROUTER_API_KEY=your_openrouter_api_key
LLM_FALLBACK_ENABLED=true

# Caching configuration
LLM_CACHE_ENABLED=true
LLM_CACHE_TTL=3600000          # 1 hour in milliseconds
LLM_CACHE_MAX_SIZE=1000        # Maximum cache entries

# Request settings
LLM_TIMEOUT=30000              # 30 seconds in milliseconds
LLM_MAX_RETRIES=2              # Retries per provider
LLM_RETRY_DELAY=1000           # Delay between retries in milliseconds
```

### Default Configuration

The system provides sensible defaults that can be overridden:

```typescript
const defaultConfig = {
  cache: {
    enabled: true,
    ttl: 3600000,        // 1 hour
    maxSize: 1000,       // 1000 entries
  },
  fallbackEnabled: true,
  defaultTimeout: 30000, // 30 seconds
  maxRetries: 2,
  retryDelay: 1000,     // 1 second
};
```

## Usage Examples

### Basic Usage

```typescript
import { getDefaultLLMClient } from '@/ai/llm';

const client = getDefaultLLMClient();

const response = await client.call([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Extract transaction details from: Coffee at Starbucks $4.50' }
], {
  temperature: 0.1,
  maxTokens: 1000,
});

console.log(response.content);
console.log(response.metadata); // Provider, model, tokens, duration, etc.
```

### Custom Configuration

```typescript
import { createLLMClient } from '@/ai/llm';

const customClient = createLLMClient({
  fallbackEnabled: false,
  defaultTimeout: 60000,
  cache: {
    enabled: true,
    ttl: 7200000, // 2 hours
    maxSize: 500,
  },
});
```

## Error Handling

The system provides specific error types for different failure scenarios:

### Error Types

- **`LLMProviderError`**: Base error for provider-specific issues
- **`LLMTimeoutError`**: Request timeout errors
- **`LLMQuotaExceededError`**: Rate limit/quota exceeded
- **`LLMAuthenticationError`**: API key or authentication issues
- **`LLMInvalidResponseError`**: Malformed or invalid responses
- **`LLMAllProvidersFailedError`**: All providers failed

### Error Handling Example

```typescript
try {
  const response = await client.call(messages);
  return response.content;
} catch (error) {
  if (error instanceof LLMAllProvidersFailedError) {
    console.error('All LLM providers failed:', error.errors);
    // Handle complete failure
  } else if (error instanceof LLMQuotaExceededError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
    // Handle rate limiting
  } else {
    console.error('Unexpected error:', error);
    // Handle other errors
  }
}
```

## Monitoring and Metrics

### Cache Metrics

```typescript
const metrics = client.getCacheMetrics();
console.log({
  hits: metrics.hits,
  misses: metrics.misses,
  hitRate: metrics.hitRate,
  size: metrics.size,
});
```

### Provider Health

```typescript
const providers = client.getProviders();
for (const provider of providers) {
  const isHealthy = await provider.isHealthy();
  console.log(`${provider.getName()}: ${isHealthy ? 'healthy' : 'unhealthy'}`);
}
```

## Testing

The LLM system includes comprehensive tests:

- **Unit tests** for individual components
- **Integration tests** for provider interactions
- **Mock providers** for testing without API calls
- **Error scenario testing** for robust error handling
- **Response parsing tests** for markdown-wrapped JSON handling

### Test Files

- `tests/ai/llm/client.test.ts`: LLM client functionality
- `tests/ai/llm/cache.test.ts`: Caching system tests
- `tests/ai/flows/extract-transaction-details.test.ts`: Transaction extraction tests
- `tests/ai/flows/handle-missing-transaction-data.test.ts`: Missing data handling tests
- `tests/ai/flows/json-parsing.test.ts`: JSON parsing and markdown handling tests
- `tests/ai/flows/extract-transaction-details-integration.test.ts`: End-to-end integration tests

### Response Parsing Tests

The system includes specific tests for handling various response formats:

```typescript
// Test cases include:
- JSON wrapped in markdown code blocks (```json ... ```)
- JSON wrapped in plain code blocks (``` ... ```)
- Clean JSON responses
- Invalid JSON responses
- Malformed markdown blocks
- Unicode content handling
```

## Migration from Legacy Genkit

The new LLM system is designed to be backward compatible with the existing Genkit implementation:

1. **Legacy flows** continue to work unchanged
2. **Gradual migration** is supported
3. **Prompt templates** are compatible
4. **Response formats** remain consistent

### Migration Steps

1. Update imports to use the new LLM client
2. Replace Genkit flow calls with LLM client calls
3. Update prompt templates to use message builders
4. Add error handling for new error types
5. Configure environment variables for fallback providers

## Best Practices

### Performance

- **Enable caching** for production environments
- **Configure appropriate TTL** based on use case
- **Monitor cache hit rates** and adjust size accordingly
- **Use appropriate timeouts** to balance reliability and performance

### Reliability

- **Always configure fallback providers** for production
- **Implement proper error handling** for all error types
- **Monitor provider health** and performance
- **Set up alerts** for provider failures
- **Test response parsing** with various formats including markdown-wrapped JSON
- **Validate all responses** against schemas before processing

### Security

- **Secure API keys** using environment variables
- **Rotate API keys** regularly
- **Monitor API usage** for unusual patterns
- **Implement rate limiting** at the application level

### Cost Optimization

- **Enable caching** to reduce API calls
- **Choose appropriate models** for different use cases
- **Monitor token usage** and optimize prompts
- **Use fallback providers** for cost-effective alternatives