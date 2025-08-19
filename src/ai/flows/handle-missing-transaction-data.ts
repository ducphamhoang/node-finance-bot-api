// src/ai/flows/handle-missing-transaction-data.ts
'use server';
/**
 * @fileOverview This file defines a flow to handle missing transaction data.
 *
 * It uses LLM prompts to intelligently fill in missing details (amount, date, or category) with 'null'
 * values if they cannot be reasonably inferred from the transaction description.
 *
 * @exports handleMissingTransactionData - The main function to trigger the flow.
 * @exports HandleMissingTransactionDataInput - The input type for the flow.
 * @exports HandleMissingTransactionDataOutput - The output type for the flow.
 */

import { z } from 'zod';
import { llmClient } from '@/ai/llm';
import { buildHandleMissingTransactionDataMessages } from '@/ai/prompts/handle-missing-transaction-data';

const HandleMissingTransactionDataInputSchema = z.object({
  description: z.string().describe('The transaction description provided by the user.'),
});
export type HandleMissingTransactionDataInput = z.infer<typeof HandleMissingTransactionDataInputSchema>;

const HandleMissingTransactionDataOutputSchema = z.object({
  amount: z.number().nullable().describe('The transaction amount. Null if not inferable.'),
  date: z.string().nullable().describe('The transaction date in ISO format. Null if not inferable.'),
  category: z.string().nullable().describe('The transaction category. Null if not inferable.'),
});
export type HandleMissingTransactionDataOutput = z.infer<typeof HandleMissingTransactionDataOutputSchema>;

/**
 * Parse JSON response from LLM and validate against schema
 */
function parseAndValidateResponse(content: string): HandleMissingTransactionDataOutput {
  try {
    // Try to parse the JSON response
    const parsed = JSON.parse(content);

    // Validate against our schema
    const result = HandleMissingTransactionDataOutputSchema.parse(parsed);
    return result;
  } catch (error) {
    console.error('Failed to parse LLM response for missing transaction data:', error);
    console.error('Raw response:', content);

    // Return default null values if parsing fails
    return {
      amount: null,
      date: null,
      category: null,
    };
  }
}

/**
 * Handle missing transaction data using the new LLM client
 */
async function handleMissingTransactionDataFlow(
  input: HandleMissingTransactionDataInput
): Promise<HandleMissingTransactionDataOutput> {
  const { description } = input;

  try {
    // Build messages using the prompt template
    const messages = buildHandleMissingTransactionDataMessages({
      description,
    });

    // Call the LLM client
    const response = await llmClient.call(messages, {
      temperature: 0.1, // Low temperature for consistent extraction
      maxTokens: 500,
    });

    // Parse and validate the response
    return parseAndValidateResponse(response.content);
  } catch (error) {
    console.error('Error in handleMissingTransactionDataFlow:', error);
    throw error;
  }
}

export async function handleMissingTransactionData(
  input: HandleMissingTransactionDataInput
): Promise<HandleMissingTransactionDataOutput> {
  return handleMissingTransactionDataFlow(input);
}
