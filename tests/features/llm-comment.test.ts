import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractTransactionDetails,
  type ExtractTransactionDetailsInput,
} from '@/ai/flows/extract-transaction-details';
import { LLMResponse } from '@/ai/llm/types';

// Use vi.hoisted to create mock LLM client
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

describe('LLM Comment Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include llm_comment field in transaction response', async () => {
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
      text: "Bought coffee at Starbucks for $4.50",
      omnibusMode: false,
    };

    const result = await extractTransactionDetails(input);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('llm_comment');
    expect(result[0].llm_comment).toBe("Looks like someone couldn't resist another coffee run! ☕️");
    expect(typeof result[0].llm_comment).toBe('string');
  });

  it('should validate that llm_comment is required in schema', async () => {
    // Test that transaction without llm_comment fails validation
    const mockResponse: LLMResponse = {
      content: JSON.stringify([{
        description: "Coffee purchase",
        category: "dining",
        type: "expense",
        amount: 4.50,
        date: "2024-01-15",
        merchant: "Starbucks",
        paymentMethod: "credit card",
        location: "New York"
        // Missing llm_comment field
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
      text: "Bought coffee at Starbucks for $4.50",
      omnibusMode: false,
    };

    const result = await extractTransactionDetails(input);

    // Should return empty array when validation fails due to missing llm_comment
    expect(result).toEqual([]);
  });

  it('should include funny comments for different types of transactions', async () => {
    const mockResponse: LLMResponse = {
      content: JSON.stringify([
        {
          description: "Grocery shopping",
          category: "groceries",
          type: "expense",
          amount: 125.50,
          date: "2024-01-15",
          merchant: "Whole Foods",
          paymentMethod: "credit card",
          location: "San Francisco",
          llm_comment: "Someone's living the healthy life... at premium prices! 🥗💸"
        },
        {
          description: "Gas station fill-up",
          category: "transportation",
          type: "expense",
          amount: 65.00,
          date: "2024-01-15",
          merchant: "Shell",
          paymentMethod: "debit card",
          location: "Highway 101",
          llm_comment: "Fuel costs are going through the roof! ⛽💸"
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
      text: "Bought groceries at Whole Foods $125.50, filled up gas tank at Shell $65",
      omnibusMode: false,
    };

    const result = await extractTransactionDetails(input);

    expect(result).toHaveLength(2);
    
    // Verify both transactions have funny comments
    expect(result[0].llm_comment).toBe("Someone's living the healthy life... at premium prices! 🥗💸");
    expect(result[1].llm_comment).toBe("Fuel costs are going through the roof! ⛽💸");
    
    // Verify comments are contextually relevant
    expect(result[0].llm_comment).toContain("healthy");
    expect(result[1].llm_comment).toContain("Fuel");
  });
});