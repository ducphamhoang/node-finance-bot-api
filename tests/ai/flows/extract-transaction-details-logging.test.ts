import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractTransactionDetailsWithLogging,
  type ExtractTransactionDetailsInput,
} from '@/ai/flows/extract-transaction-details';
import * as loggingModule from '@/lib/logging';
import { llmClient } from '@/ai/llm';

// Mock the LLM client
vi.mock('@/ai/llm', () => ({
  llmClient: {
    call: vi.fn(),
  },
}));

// Mock the logging service
const mockLoggingService = {
  logInteraction: vi.fn(),
};

vi.mock('@/lib/logging', async () => {
  const actual = await vi.importActual('@/lib/logging');
  return {
    ...actual,
    getLoggingService: vi.fn(() => mockLoggingService),
    generateSessionId: vi.fn(() => 'test_session_id'),
  };
});

// Mock the prompt builder
vi.mock('@/ai/prompts/extract-transaction-details', () => ({
  buildExtractTransactionDetailsMessages: vi.fn(() => [
    { role: 'system', content: 'You are a transaction parser' },
    { role: 'user', content: 'Parse this transaction' },
  ]),
}));

describe('Transaction Extraction with Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the promise for each test
    mockLoggingService.logInteraction.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractTransactionDetailsWithLogging', () => {
    const validInput: ExtractTransactionDetailsInput = {
      text: 'Coffee at Starbucks for $5.50',
      omnibusMode: true,
    };

    const mockLLMResponse = {
      content: JSON.stringify([{
        description: 'Coffee purchase',
        category: 'dining',
        type: 'expense',
        amount: 5.50,
        date: '2024-01-15',
        merchant: 'Starbucks',
        paymentMethod: 'credit card',
        location: 'New York',
        llm_comment: 'Your daily caffeine fix strikes again! ☕'
      }]),
      metadata: {
        provider: 'genkit',
        model: 'gemini-2.0-flash',
        tokens: 150,
        duration: 1200,
        cached: false,
      },
    };

    it('should extract transaction details and log interaction successfully', async () => {
      vi.mocked(llmClient.call).mockResolvedValue(mockLLMResponse);

      const loggingContext = {
        userId: 'user123',
        sessionId: 'session456',
      };

      const result = await extractTransactionDetailsWithLogging(
        validInput,
        loggingContext
      );

      // Verify extraction result
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        description: 'Coffee purchase',
        category: 'dining',
        type: 'expense',
        amount: 5.50,
        merchant: 'Starbucks',
      });

      // Verify logging was called
      expect(mockLoggingService.logInteraction).toHaveBeenCalledWith({
        userId: 'user123',
        sessionId: 'session456',
        input: 'Coffee at Starbucks for $5.50',
        response: result,
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: expect.any(Number),
          tokens: 150,
          cached: false,
        },
      });
    });

    it('should work with anonymous users (no userId)', async () => {
      vi.mocked(llmClient.call).mockResolvedValue(mockLLMResponse);

      const result = await extractTransactionDetailsWithLogging(validInput);

      // Should generate session ID for anonymous users
      expect(mockLoggingService.logInteraction).toHaveBeenCalledWith({
        userId: undefined,
        sessionId: 'test_session_id',
        input: validInput.text,
        response: result,
        metadata: expect.any(Object),
      });
    });

    it('should use provided sessionId over generated one', async () => {
      vi.mocked(llmClient.call).mockResolvedValue(mockLLMResponse);

      const loggingContext = {
        sessionId: 'custom_session_123',
      };

      await extractTransactionDetailsWithLogging(validInput, loggingContext);

      expect(mockLoggingService.logInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'custom_session_123',
        })
      );
    });

    it('should continue working even if logging fails', async () => {
      vi.mocked(llmClient.call).mockResolvedValue(mockLLMResponse);
      
      // Mock logging to fail
      mockLoggingService.logInteraction.mockRejectedValue(
        new Error('Firestore connection failed')
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await extractTransactionDetailsWithLogging(validInput);

      // Should still return the extraction result
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Coffee purchase');

      // Should log the warning
      expect(consoleSpy).toHaveBeenCalledWith(
        'Non-blocking logging error:',
        'Firestore connection failed'
      );

      consoleSpy.mockRestore();
    });

    it('should log error interactions when LLM call fails', async () => {
      const llmError = new Error('LLM provider failed');
      vi.mocked(llmClient.call).mockRejectedValue(llmError);

      const loggingContext = {
        userId: 'user123',
        sessionId: 'session456',
      };

      await expect(
        extractTransactionDetailsWithLogging(validInput, loggingContext)
      ).rejects.toThrow('LLM provider failed');

      // Should log the error interaction
      expect(mockLoggingService.logInteraction).toHaveBeenCalledWith({
        userId: 'user123',
        sessionId: 'session456',
        input: validInput.text,
        response: { error: 'LLM provider failed' },
        metadata: {
          provider: undefined,
          model: undefined,
          duration: expect.any(Number),
          error: true,
        },
      });
    });

    it('should handle malformed LLM responses gracefully', async () => {
      const malformedResponse = {
        content: 'This is not valid JSON',
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(malformedResponse);

      const result = await extractTransactionDetailsWithLogging(validInput);

      // Should return empty array for malformed responses
      expect(result).toEqual([]);

      // Should still log the interaction
      expect(mockLoggingService.logInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          input: validInput.text,
          response: [],
        })
      );
    });

    it('should apply task filtering and log the filtered result', async () => {
      vi.mocked(llmClient.call).mockResolvedValue(mockLLMResponse);

      const inputWithTask: ExtractTransactionDetailsInput = {
        ...validInput,
        task: 'categorize',
      };

      const result = await extractTransactionDetailsWithLogging(inputWithTask);

      // Should apply task filtering (categorize task should null out other fields)
      expect(result[0]).toMatchObject({
        description: 'Coffee purchase',
        category: 'dining',
        type: 'N/A',
        amount: null,
        date: null,
        merchant: null,
        paymentMethod: null,
        location: null,
      });

      // Should log the filtered result, not the original
      expect(mockLoggingService.logInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          response: result, // Should be the filtered result
        })
      );
    });

    it('should capture duration metadata accurately', async () => {
      vi.mocked(llmClient.call).mockImplementation(async () => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockLLMResponse;
      });

      await extractTransactionDetailsWithLogging(validInput);

      const logCall = mockLoggingService.logInteraction.mock.calls[0][0];
      expect(logCall.metadata?.duration).toBeGreaterThan(50); // Should be at least 50ms
    });

    it('should preserve all LLM metadata in logs', async () => {
      const detailedResponse = {
        ...mockLLMResponse,
        metadata: {
          provider: 'openrouter',
          model: 'llama-3.1-70b',
          tokens: 250,
          duration: 2500,
          cached: true,
        },
      };

      vi.mocked(llmClient.call).mockResolvedValue(detailedResponse);

      await extractTransactionDetailsWithLogging(validInput);

      expect(mockLoggingService.logInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            provider: 'openrouter',
            model: 'llama-3.1-70b',
            tokens: 250,
            cached: true,
            duration: expect.any(Number), // Our calculated duration, not LLM's
          }),
        })
      );
    });
  });
});