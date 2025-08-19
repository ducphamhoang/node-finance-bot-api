import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleMissingTransactionData,
  type HandleMissingTransactionDataInput,
  type HandleMissingTransactionDataOutput
} from '@/ai/flows/handle-missing-transaction-data';
import { LLMResponse, LLMProviderError, LLMAllProvidersFailedError } from '@/ai/llm/types';

// Use vi.hoisted to create mock LLM client that survives hoisting
const mockLLMClient = vi.hoisted(() => ({
  call: vi.fn(),
  getCacheMetrics: vi.fn(),
  clearCache: vi.fn(),
  getProviders: vi.fn(),
  checkHealth: vi.fn(),
  updateConfig: vi.fn(),
  getConfig: vi.fn(),
}));

vi.mock('@/ai/llm', () => ({
  llmClient: mockLLMClient,
}));

describe('handleMissingTransactionData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful extraction', () => {
    it('should extract missing transaction data correctly', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: 25.50,
          date: "2024-01-15",
          category: "dining"
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Lunch at restaurant on January 15th, paid $25.50"
      };

      const result = await handleMissingTransactionData(input);

      expect(mockLLMClient.call).toHaveBeenCalledTimes(1);
      expect(mockLLMClient.call).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({
          temperature: 0.1,
          maxTokens: 500,
        })
      );

      expect(result).toEqual({
        amount: 25.50,
        date: "2024-01-15",
        category: "dining"
      });
    });

    it('should handle null values when data cannot be inferred', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: null,
          date: null,
          category: "dining"
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Had lunch somewhere"
      };

      const result = await handleMissingTransactionData(input);

      expect(result).toEqual({
        amount: null,
        date: null,
        category: "dining"
      });
    });

    it('should handle all null values when no data can be inferred', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: null,
          date: null,
          category: null
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Something happened"
      };

      const result = await handleMissingTransactionData(input);

      expect(result).toEqual({
        amount: null,
        date: null,
        category: null
      });
    });
  });

  describe('Amount parsing', () => {
    it('should handle numeric amounts correctly', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: 100.50,
          date: "2024-01-15",
          category: "shopping"
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Shopping spree cost $100.50 on January 15th"
      };

      const result = await handleMissingTransactionData(input);

      expect(result.amount).toBe(100.50);
      expect(typeof result.amount).toBe('number');
    });

    it('should handle large amounts with abbreviations', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: 1000000,
          date: "2024-01-15",
          category: "investment"
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Investment of 1M on January 15th"
      };

      const result = await handleMissingTransactionData(input);

      expect(result.amount).toBe(1000000);
    });
  });

  describe('Date parsing', () => {
    it('should return dates in ISO format', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: 50.00,
          date: "2024-12-25",
          category: "gifts"
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Christmas gifts on December 25th, 2024 for $50"
      };

      const result = await handleMissingTransactionData(input);

      expect(result.date).toBe("2024-12-25");
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Category inference', () => {
    it('should infer common categories correctly', async () => {
      const testCases = [
        { description: "Grocery shopping at Whole Foods", expectedCategory: "groceries" },
        { description: "Gas station fill-up", expectedCategory: "transportation" },
        { description: "Movie tickets", expectedCategory: "entertainment" },
        { description: "Electric bill payment", expectedCategory: "utilities" },
      ];

      for (const testCase of testCases) {
        const mockResponse: LLMResponse = {
          content: JSON.stringify({
            amount: null,
            date: null,
            category: testCase.expectedCategory
          }),
          metadata: {
            provider: 'genkit',
            model: 'test-model',
            duration: 100,
            cached: false,
          },
        };

        mockLLMClient.call.mockResolvedValue(mockResponse);

        const input: HandleMissingTransactionDataInput = {
          description: testCase.description
        };

        const result = await handleMissingTransactionData(input);

        expect(result.category).toBe(testCase.expectedCategory);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle LLM provider errors', async () => {
      const providerError = new LLMProviderError('Provider failed', 'genkit');
      mockLLMClient.call.mockRejectedValue(providerError);

      const input: HandleMissingTransactionDataInput = {
        description: "Some transaction description"
      };

      await expect(handleMissingTransactionData(input)).rejects.toThrow(LLMProviderError);
    });

    it('should handle all providers failed error', async () => {
      const allProvidersError = new LLMAllProvidersFailedError([
        new LLMProviderError('Genkit failed', 'genkit'),
        new LLMProviderError('OpenRouter failed', 'openrouter'),
      ]);
      mockLLMClient.call.mockRejectedValue(allProvidersError);

      const input: HandleMissingTransactionDataInput = {
        description: "Some transaction description"
      };

      await expect(handleMissingTransactionData(input)).rejects.toThrow(LLMAllProvidersFailedError);
    });

    it('should handle invalid JSON response gracefully', async () => {
      const mockResponse: LLMResponse = {
        content: "Invalid JSON response",
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Some transaction description"
      };

      const result = await handleMissingTransactionData(input);

      // Should return default null values when parsing fails
      expect(result).toEqual({
        amount: null,
        date: null,
        category: null,
      });
    });

    it('should handle malformed response data gracefully', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: "invalid-amount", // Should be number or null
          date: "invalid-date",
          category: 123 // Should be string or null
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Some transaction description"
      };

      const result = await handleMissingTransactionData(input);

      // Should return default null values when validation fails
      expect(result).toEqual({
        amount: null,
        date: null,
        category: null,
      });
    });
  });

  describe('Prompt building', () => {
    it('should include the description in the user prompt', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: null,
          date: null,
          category: null
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Unique transaction description for testing"
      };

      await handleMissingTransactionData(input);

      expect(mockLLMClient.call).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            role: 'user',
            content: expect.stringContaining('Unique transaction description for testing')
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should use appropriate system prompt', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify({
          amount: null,
          date: null,
          category: null
        }),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: HandleMissingTransactionDataInput = {
        description: "Test description"
      };

      await handleMissingTransactionData(input);

      expect(mockLLMClient.call).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            role: 'system',
            content: expect.stringContaining('financial transaction analysis')
          }),
        ]),
        expect.any(Object)
      );
    });
  });
});
