'use server';

import {
  extractTransactionDetails,
  type ExtractTransactionDetailsInput,
  type ExtractTransactionDetailsOutput,
} from '@/ai/flows/extract-transaction-details';
import {
  LLMProviderError,
  LLMTimeoutError,
  LLMQuotaExceededError,
  LLMAllProvidersFailedError,
} from '@/ai/llm/types';

export type ActionResult = {
  error?: string;
  data?: ExtractTransactionDetailsOutput | null;
};

export async function getTransactionDetails(
  input: ExtractTransactionDetailsInput
): Promise<ActionResult> {
  try {
    const result = await extractTransactionDetails(input);
    return { data: result };
  } catch (e: any) {
    console.error('Error in getTransactionDetails action:', e);

    // Handle specific LLM error types with more detailed messages
    if (e instanceof LLMAllProvidersFailedError) {
      const providerMessages = e.errors.map(err => `${err.provider}: ${err.message}`).join(', ');
      return {
        error: `All LLM providers failed. Provider errors: ${providerMessages}`
      };
    }

    if (e instanceof LLMTimeoutError) {
      return {
        error: `LLM request timed out for provider ${e.provider}. Please try again.`
      };
    }

    if (e instanceof LLMQuotaExceededError) {
      const retryMessage = e.retryAfter
        ? ` Please try again in ${Math.ceil(e.retryAfter / 1000)} seconds.`
        : ' Please try again later.';
      return {
        error: `LLM provider ${e.provider} quota exceeded.${retryMessage}`
      };
    }

    if (e instanceof LLMProviderError) {
      return {
        error: `LLM provider ${e.provider} error: ${e.message}`
      };
    }

    // Generic error fallback
    return { error: e.message || 'An unexpected error occurred.' };
  }
}
