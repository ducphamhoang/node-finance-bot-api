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
    .describe('A description of financial transaction(s).'),
  task: z.enum(['categorize', 'get_transaction_type', 'get_amount']).optional().describe('Specific task to perform (optional).'),
  omnibusMode: z.boolean().optional().describe('Whether to intelligently assign null values when values cannot be reasonably inferred.')
});
export type ExtractTransactionDetailsInput = z.infer<typeof ExtractTransactionDetailsInputSchema>;

// Rename the schema for a single transaction
const SingleTransactionSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  category: z.string().nullable().describe('The category of the transaction.'),
  type: z.string().describe('The type of transaction (e.g., income, expense).'),
  amount: z.number().nullable().describe('The amount of the transaction.'),
  date: z.string().nullable().describe('The date of the transaction in ISO format (YYYY-MM-DD).'),
  merchant: z.string().nullable().describe('The merchant or business name associated with the transaction.'),
  paymentMethod: z.string().nullable().describe('The payment method used for the transaction (e.g., credit card, cash, debit card, PayPal).'),
  location: z.string().nullable().describe('The location where the transaction took place.'),
});

// Define the new output schema as an array of the single transaction schema
const ExtractTransactionDetailsOutputSchema = z.array(SingleTransactionSchema);
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
    return 'null' as const;
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
  
  Identify all distinct financial transactions in the provided text. For each transaction, extract the following information:
  - description: A concise description of the transaction.
  - category: The category of the transaction (e.g., groceries, dining, utilities). If you cannot determine the category, and omnibusMode is enabled, use the assignNull tool to assign null.
  - type: The type of transaction (income or expense).
  - amount: The numerical amount of the transaction. If you cannot determine the amount, and omnibusMode is enabled, use the assignNull tool to assign null. When extracting the amount field:
    - If the amount includes 'k' (e.g., 100k), interpret as 100,000.
    - If the amount includes 'm' or 'M' (e.g., 1m, 1M), interpret as 1,000,000.
    - Accept both lowercase and uppercase suffixes.
    - Always return the amount as a number in the response.
  - date: The date of the transaction in ISO format (YYYY-MM-DD). If you cannot determine the date, and omnibusMode is enabled, use the assignNull tool to assign null.
  - merchant: The merchant or business name associated with the transaction (e.g., "Starbucks", "Amazon"). If you cannot determine the merchant, and omnibusMode is enabled, use the assignNull tool to assign null.
  - paymentMethod: The payment method used for the transaction (e.g., credit card, cash, debit card, PayPal). If you cannot determine the payment method, and omnibusMode is enabled, use the assignNull tool to assign null.
  - location: The location where the transaction took place (e.g., "New York", "Online"). If you cannot determine the location, and omnibusMode is enabled, use the assignNull tool to assign null.

  Here is the transaction description:
  {{text}}

  Return the extracted information as a JSON array of objects. Each object in the array should represent a single transaction. If no transactions are found, return an empty array.
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

    // For multiple transactions, task-specific modes need to be applied to each transaction
    // We'll simplify by only applying these modes when we have exactly one transaction
    const { output } = await prompt({...input, omnibusMode});
    const transactions = output || [];

    // Apply task-specific modes if we have exactly one transaction
    if (transactions.length === 1 && task) {
      const transaction = transactions[0];
      if (task === 'categorize') {
        return [{ ...transaction, type: 'N/A', amount: null, date: null, merchant: null, paymentMethod: null, location: null }];
      } else if (task === 'get_transaction_type') {
        return [{ ...transaction, category: null, amount: null, date: null, merchant: null, paymentMethod: null, location: null }];
      } else if (task === 'get_amount') {
        return [{ ...transaction, category: null, type: 'N/A', date: null, merchant: null, paymentMethod: null, location: null }];
      }
    }

    return transactions;
  }
);