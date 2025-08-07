// src/ai/flows/handle-missing-transaction-data.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow to handle missing transaction data.
 *
 * It uses a prompt to intelligently fill in missing details (amount, date, or category) with 'null'
 * values if they cannot be reasonably inferred from the transaction description.
 *
 * @exports handleMissingTransactionData - The main function to trigger the flow.
 * @exports HandleMissingTransactionDataInput - The input type for the flow.
 * @exports HandleMissingTransactionDataOutput - The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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

export async function handleMissingTransactionData(
  input: HandleMissingTransactionDataInput
): Promise<HandleMissingTransactionDataOutput> {
  return handleMissingTransactionDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'handleMissingTransactionDataPrompt',
  input: {schema: HandleMissingTransactionDataInputSchema},
  output: {schema: HandleMissingTransactionDataOutputSchema},
  prompt: `You are an AI assistant specializing in financial transaction analysis.
  Given the following transaction description, extract the amount, date, and category.
  If any of these values cannot be reasonably inferred from the description, set the corresponding output field to null.

  Description: {{{description}}}

  Output in JSON format with amount as a number or null, date as an ISO string or null, and category as a string or null:
  {
    "amount": <amount or null>,
    "date": <date in ISO format or null>,
    "category": <category or null>
  }`,
});

const handleMissingTransactionDataFlow = ai.defineFlow(
  {
    name: 'handleMissingTransactionDataFlow',
    inputSchema: HandleMissingTransactionDataInputSchema,
    outputSchema: HandleMissingTransactionDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
