import { LLMMessage } from '@/ai/llm/types';

/**
 * Input parameters for building handle missing transaction data messages
 */
export interface HandleMissingTransactionDataPromptInput {
  description: string;
}

/**
 * Build system prompt for handling missing transaction data
 */
function buildSystemPrompt(): string {
  return `You are an AI assistant specializing in financial transaction analysis.

Your task is to analyze transaction descriptions and extract missing information including amount, date, and category.

For each transaction description provided, extract the following information:
- amount: The numerical amount of the transaction. If the amount cannot be reasonably inferred from the description, set this field to null.
- date: The date of the transaction in ISO format (YYYY-MM-DD). If the date cannot be reasonably inferred from the description, set this field to null.
- category: The category of the transaction (e.g., groceries, dining, utilities, transportation, entertainment, etc.). If the category cannot be reasonably inferred from the description, set this field to null.

Important guidelines:
- Only extract information that can be reasonably inferred from the description
- Do not make assumptions about missing information
- Use null for any field that cannot be determined
- For amounts, handle common abbreviations (k = thousand, m/M = million)
- For dates, use ISO format (YYYY-MM-DD)
- For categories, use common financial categories

Return your response as a JSON object with the three fields: amount, date, and category.`;
}

/**
 * Build user prompt with transaction description
 */
function buildUserPrompt(description: string): string {
  return `Please analyze the following transaction description and extract the amount, date, and category:

Description: ${description}

Return the result as a JSON object in this format:
{
  "amount": <amount as number or null>,
  "date": "<date in ISO format or null>",
  "category": "<category as string or null>"
}`;
}

/**
 * Build messages for handle missing transaction data prompt
 * 
 * @param input - Input parameters including the transaction description
 * @returns Array of LLM messages for the conversation
 */
export function buildHandleMissingTransactionDataMessages(
  input: HandleMissingTransactionDataPromptInput
): LLMMessage[] {
  const { description } = input;

  return [
    {
      role: 'system',
      content: buildSystemPrompt(),
    },
    {
      role: 'user',
      content: buildUserPrompt(description),
    },
  ];
}

/**
 * Legacy prompt string for backward compatibility
 * This matches the original Genkit prompt format
 */
export const LEGACY_MISSING_DATA_PROMPT_TEMPLATE = `You are an AI assistant specializing in financial transaction analysis.
Given the following transaction description, extract the amount, date, and category.
If any of these values cannot be reasonably inferred from the description, set the corresponding output field to null.

Description: {{{description}}}

Output in JSON format with amount as a number or null, date as an ISO string or null, and category as a string or null:
{
  "amount": <amount or null>,
  "date": <date in ISO format or null>,
  "category": <category or null>
}`;

/**
 * Template variables for the missing transaction data prompt
 */
export const MISSING_DATA_TEMPLATE_VARIABLES = {
  DESCRIPTION: '{{description}}',
} as const;

/**
 * Replace template variables in the missing data prompt
 * 
 * @param template - Template string with variables
 * @param variables - Object with variable values
 * @returns String with variables replaced
 */
export function replaceMissingDataTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{{${key}}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return result;
}
