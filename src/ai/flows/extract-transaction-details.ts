'use server';

/**
 * @fileOverview Transaction detail extraction AI agent.
 *
 * - extractTransactionDetails - A function that handles the transaction detail extraction process.
 * - ExtractTransactionDetailsInput - The input type for the extractTransactionDetails function.
 * - ExtractTransactionDetailsOutput - The return type for the extractTransactionDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTransactionDetailsInputSchema = z.object({
  text: z
    .string()
    .describe('A description of a financial transaction.'),
  task: z.enum(['categorize', 'get_transaction_type', 'get_amount']).optional().describe('Specific task to perform (optional).'),
  omnibusMode: z.boolean().optional().describe('Whether to intelligently assign null values when values cannot be reasonably inferred.')
});
export type ExtractTransactionDetailsInput = z.infer<typeof ExtractTransactionDetailsInputSchema>;

const ExtractTransactionDetailsOutputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  category: z.string().nullable().describe('The category of the transaction.'),
  type: z.string().describe('The type of transaction (e.g., income, expense).'),
  amount: z.number().nullable().describe('The amount of the transaction.'),
  date: z.string().nullable().describe('The date of the transaction in ISO format (YYYY-MM-DD).'),
});
export type ExtractTransactionDetailsOutput = z.infer<typeof ExtractTransactionDetailsOutputSchema>;

const AssignNullTool = ai.defineTool(
  {
    name: 'assignNull',
    description: 'Intelligently assigns null values to transaction attributes when the values cannot be reasonably inferred.',
    inputSchema: z.object({
      field: z.string().describe('The field to assign null to.'),
    }),
    outputSchema: z.literal('null'),
  },
  async (input) => {
    return null;
  }
);

export async function extractTransactionDetails(input: ExtractTransactionDetailsInput): Promise<ExtractTransactionDetailsOutput> {
  return extractTransactionDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionDetailsPrompt',
  input: {schema: ExtractTransactionDetailsInputSchema},
  output: {schema: ExtractTransactionDetailsOutputSchema},
  tools: [AssignNullTool],
  prompt: `You are an AI assistant that extracts key details from financial transaction descriptions.

  Analyze the provided text to identify and extract the following information:

  - description: A concise description of the transaction.
  - category: The category of the transaction (e.g., groceries, dining, utilities). If you cannot determine the category, and omnibusMode is enabled, use the assignNull tool to assign null.
  - type: The type of transaction (income or expense).
  - amount: The numerical amount of the transaction. If you cannot determine the amount, and omnibusMode is enabled, use the assignNull tool to assign null.
  - date: The date of the transaction in ISO format (YYYY-MM-DD). If you cannot determine the date, and omnibusMode is enabled, use the assignNull tool to assign null.

  Here is the transaction description:
  {{text}}

  Return the extracted information in JSON format.
  Ensure that amount and date are returned as null if not found and omnibusMode is enabled.
  }
  `,
});

const extractTransactionDetailsFlow = ai.defineFlow(
  {
    name: 'extractTransactionDetailsFlow',
    inputSchema: ExtractTransactionDetailsInputSchema,
    outputSchema: ExtractTransactionDetailsOutputSchema,
  },
  async input => {
    const {
      text,
      task,
      omnibusMode,
    } = input;

    let output = (await prompt({...input, omnibusMode})).output!;

    // Task-specific modes
    if (task === 'categorize') {
      output = { ...output, type: 'N/A', amount: null, date: null };
    } else if (task === 'get_transaction_type') {
      output = { ...output, category: null, amount: null, date: null };
    } else if (task === 'get_amount') {
      output = { ...output, category: null, type: 'N/A', date: null };
    }

    return output;
  }
);
