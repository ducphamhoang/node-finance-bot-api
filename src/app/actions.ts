'use server';

import {
  extractTransactionDetails,
  type ExtractTransactionDetailsInput,
  type ExtractTransactionDetailsOutput,
} from '@/ai/flows/extract-transaction-details';

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
    return { error: e.message || 'An unexpected error occurred.' };
  }
}
