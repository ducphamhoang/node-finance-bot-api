import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractTransactionDetails,
  type ExtractTransactionDetailsInput,
  type ExtractTransactionDetailsOutput
} from '@/ai/flows/extract-transaction-details';
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

describe('extractTransactionDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful extraction', () => {
    it('should extract single transaction details correctly', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify([{
          description: "Coffee purchase",
          category: "dining",
          type: "expense",
          amount: 4.50,
          date: "2024-01-15",
          merchant: "Starbucks",
          paymentMethod: "credit card",
          location: "New York",
          llm_comment: "Looks like someone couldn't resist another coffee run! ☕️"
        }]),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Bought coffee at Starbucks for $4.50 with credit card in New York on 2024-01-15",
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      expect(mockLLMClient.call).toHaveBeenCalledTimes(1);
      expect(mockLLMClient.call).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({
          temperature: 0.1,
          maxTokens: 2000,
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        description: "Coffee purchase",
        category: "dining",
        type: "expense",
        amount: 4.50,
        date: "2024-01-15",
        merchant: "Starbucks",
        paymentMethod: "credit card",
        location: "New York",
        llm_comment: "Looks like someone couldn't resist another coffee run! ☕️"
      });
    });

    it('should extract multiple transaction details correctly', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify([
          {
            description: "Coffee purchase",
            category: "dining",
            type: "expense",
            amount: 4.50,
            date: "2024-01-15",
            merchant: "Starbucks",
            paymentMethod: "credit card",
            location: "New York",
            llm_comment: "Another coffee addict spotted in the wild! ☕"
          },
          {
            description: "Grocery shopping",
            category: "groceries",
            type: "expense",
            amount: 85.20,
            date: "2024-01-16",
            merchant: "Whole Foods",
            paymentMethod: "debit card",
            location: "San Francisco",
            llm_comment: "Someone's living the healthy life... at premium prices! 🥗💸"
          }
        ]),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 150,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50 credit card NYC Jan 15. Groceries at Whole Foods $85.20 debit card SF Jan 16.",
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(2);
      expect(result[0].merchant).toBe("Starbucks");
      expect(result[1].merchant).toBe("Whole Foods");
    });

    it('should handle empty transaction list', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify([]),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 50,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "This text contains no transaction information.",
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      expect(result).toEqual([]);
    });
  });

  describe('Task-specific filtering', () => {
    const singleTransactionResponse: LLMResponse = {
      content: JSON.stringify([{
        description: "Coffee purchase",
        category: "dining",
        type: "expense",
        amount: 4.50,
        date: "2024-01-15",
        merchant: "Starbucks",
        paymentMethod: "credit card",
        location: "New York",
        llm_comment: "Caffeine dependency confirmed! 😄"
      }]),
      metadata: {
        provider: 'genkit',
        model: 'test-model',
        duration: 100,
        cached: false,
      },
    };

    it('should filter for categorize task', async () => {
      mockLLMClient.call.mockResolvedValue(singleTransactionResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50",
        task: 'categorize',
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("dining");
      expect(result[0].type).toBe("N/A");
      expect(result[0].amount).toBeNull();
      expect(result[0].date).toBeNull();
      expect(result[0].merchant).toBeNull();
      expect(result[0].paymentMethod).toBeNull();
      expect(result[0].location).toBeNull();
    });

    it('should filter for get_transaction_type task', async () => {
      mockLLMClient.call.mockResolvedValue(singleTransactionResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50",
        task: 'get_transaction_type',
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("expense");
      expect(result[0].category).toBeNull();
      expect(result[0].amount).toBeNull();
      expect(result[0].date).toBeNull();
      expect(result[0].merchant).toBeNull();
      expect(result[0].paymentMethod).toBeNull();
      expect(result[0].location).toBeNull();
    });

    it('should filter for get_amount task', async () => {
      mockLLMClient.call.mockResolvedValue(singleTransactionResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50",
        task: 'get_amount',
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(4.50);
      expect(result[0].category).toBeNull();
      expect(result[0].type).toBe("N/A");
      expect(result[0].date).toBeNull();
      expect(result[0].merchant).toBeNull();
      expect(result[0].paymentMethod).toBeNull();
      expect(result[0].location).toBeNull();
    });

    it('should not apply task filtering for multiple transactions', async () => {
      const multipleTransactionResponse: LLMResponse = {
        content: JSON.stringify([
          { description: "Coffee", category: "dining", type: "expense", amount: 4.50, date: "2024-01-15", merchant: "Starbucks", paymentMethod: "credit card", location: "NYC", llm_comment: "Daily caffeine fix! ☕" },
          { description: "Lunch", category: "dining", type: "expense", amount: 12.00, date: "2024-01-15", merchant: "Subway", paymentMethod: "cash", location: "NYC", llm_comment: "Subway - because hunger waits for no one! 🥪" }
        ]),
        metadata: { provider: 'genkit', model: 'test-model', duration: 100, cached: false },
      };

      mockLLMClient.call.mockResolvedValue(multipleTransactionResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50, Lunch at Subway $12",
        task: 'categorize',
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(2);
      // Should not apply filtering for multiple transactions
      expect(result[0].amount).toBe(4.50);
      expect(result[1].amount).toBe(12.00);
    });
  });

  describe('Error handling', () => {
    it('should handle LLM provider errors', async () => {
      const providerError = new LLMProviderError('Provider failed', 'genkit');
      mockLLMClient.call.mockRejectedValue(providerError);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50",
        omnibusMode: false,
      };

      await expect(extractTransactionDetails(input)).rejects.toThrow(LLMProviderError);
    });

    it('should handle all providers failed error', async () => {
      const allProvidersError = new LLMAllProvidersFailedError([
        new LLMProviderError('Genkit failed', 'genkit'),
        new LLMProviderError('OpenRouter failed', 'openrouter'),
      ]);
      mockLLMClient.call.mockRejectedValue(allProvidersError);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50",
        omnibusMode: false,
      };

      await expect(extractTransactionDetails(input)).rejects.toThrow(LLMAllProvidersFailedError);
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

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50",
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      // Should return empty array when parsing fails
      expect(result).toEqual([]);
    });

    it('should handle malformed transaction data gracefully', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify([{
          description: "Coffee purchase",
          // Missing required fields
        }]),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee at Starbucks $4.50",
        omnibusMode: false,
      };

      const result = await extractTransactionDetails(input);

      // Should return empty array when validation fails
      expect(result).toEqual([]);
    });
  });

  describe('Omnibus mode', () => {
    it('should pass omnibus mode to prompt builder', async () => {
      const mockResponse: LLMResponse = {
        content: JSON.stringify([{
          description: "Coffee purchase",
          category: null,
          type: "expense",
          amount: null,
          date: null,
          merchant: null,
          paymentMethod: null,
          location: null,
          llm_comment: "Mystery coffee transaction - who knows what happened here! 🤷‍♂️"
        }]),
        metadata: {
          provider: 'genkit',
          model: 'test-model',
          duration: 100,
          cached: false,
        },
      };

      mockLLMClient.call.mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: "Coffee purchase",
        omnibusMode: true,
      };

      const result = await extractTransactionDetails(input);

      expect(mockLLMClient.call).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            role: 'system',
            content: expect.stringContaining('set it to null')
          }),
        ]),
        expect.any(Object)
      );

      expect(result[0].category).toBeNull();
      expect(result[0].amount).toBeNull();
    });
  });
});
