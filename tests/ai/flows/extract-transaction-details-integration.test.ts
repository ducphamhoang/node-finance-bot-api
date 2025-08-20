import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTransactionDetails } from '@/ai/flows/extract-transaction-details';
import type { ExtractTransactionDetailsInput } from '@/ai/flows/extract-transaction-details';

// Mock the LLM client
vi.mock('@/ai/llm', () => ({
  llmClient: {
    call: vi.fn(),
  },
}));

import { llmClient } from '@/ai/llm';

describe('extractTransactionDetails Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JSON parsing with markdown wrapping', () => {
    it('should handle JSON wrapped in markdown code blocks', async () => {
      const mockResponse = {
        content: `\`\`\`json
[
  {
    "description": "Coffee at Starbucks",
    "category": "dining",
    "type": "expense",
    "amount": 4.50,
    "date": "2024-01-15",
    "merchant": "Starbucks",
    "paymentMethod": "credit card",
    "location": "New York",
    "llm_comment": "Looks like someone couldn't resist another coffee run! ☕️"
  }
]
\`\`\``,
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1000,
          cached: false,
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: 'Coffee at Starbucks $4.50',
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        description: "Coffee at Starbucks",
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

    it('should handle the actual error case from logs', async () => {
      const mockResponse = {
        content: `\`\`\`json
[
  {
    "description": "Ăn cơm tại Lux68",
    "category": "dining",
    "type": "expense",
    "amount": 100000.00,
    "date": null,
    "merchant": "Lux68",
    "paymentMethod": null,
    "location": null,
    "llm_comment": "Vietnamese comfort food at its finest! 🍚"
  },
  {
    "description": "Đổ xăng",
    "category": "utilities",
    "type": "expense",
    "amount": 200000.00,
    "date": null,
    "merchant": null,
    "paymentMethod": null,
    "location": null,
    "llm_comment": "Fuel costs are going through the roof! ⛽💸"
  }
]
\`\`\``,
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1000,
          cached: false,
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: 'Ăn cơm tại Lux68 100k, đổ xăng 200k',
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        description: "Ăn cơm tại Lux68",
        category: "dining",
        type: "expense",
        amount: 100000.00,
        date: null,
        merchant: "Lux68",
        paymentMethod: null,
        location: null,
        llm_comment: expect.any(String)
      });
      expect(result[1]).toEqual({
        description: "Đổ xăng",
        category: "utilities",
        type: "expense",
        amount: 200000.00,
        date: null,
        merchant: null,
        paymentMethod: null,
        location: null,
        llm_comment: expect.any(String)
      });
    });

    it('should handle clean JSON without markdown', async () => {
      const mockResponse = {
        content: `[
  {
    "description": "Coffee purchase",
    "category": "dining",
    "type": "expense",
    "amount": 4.50,
    "date": "2024-01-15",
    "merchant": "Starbucks",
    "paymentMethod": "credit card",
    "location": "New York",
    "llm_comment": "Looks like someone couldn't resist another coffee run! ☕️"
  }
]`,
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1000,
          cached: false,
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: 'Coffee at Starbucks $4.50',
      };

      const result = await extractTransactionDetails(input);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Coffee purchase");
      expect(result[0].amount).toBe(4.50);
    });

    it('should return empty array for invalid JSON', async () => {
      const mockResponse = {
        content: 'This is not valid JSON at all',
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1000,
          cached: false,
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: 'Some invalid input',
      };

      const result = await extractTransactionDetails(input);

      expect(result).toEqual([]);
    });

    it('should handle malformed markdown blocks gracefully', async () => {
      const mockResponse = {
        content: '```json\n[{"description": "test", "invalid": json}]\n```',
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1000,
          cached: false,
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: 'Test transaction',
      };

      const result = await extractTransactionDetails(input);

      expect(result).toEqual([]);
    });
  });

  describe('task-specific filtering', () => {
    it('should apply categorize task filtering', async () => {
      const mockResponse = {
        content: `[
  {
    "description": "Coffee purchase",
    "category": "dining",
    "type": "expense",
    "amount": 4.50,
    "date": "2024-01-15",
    "merchant": "Starbucks",
    "paymentMethod": "credit card",
    "location": "New York",
    "llm_comment": "Looks like someone couldn't resist another coffee run! ☕️"
  }
]`,
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1000,
          cached: false,
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(mockResponse);

      const input: ExtractTransactionDetailsInput = {
        text: 'Coffee at Starbucks $4.50',
        task: 'categorize',
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
  });
});