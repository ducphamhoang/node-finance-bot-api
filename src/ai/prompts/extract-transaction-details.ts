import { LLMMessage } from '@/ai/llm/types';

/**
 * Input parameters for building extract transaction details messages
 */
export interface ExtractTransactionDetailsPromptInput {
  text: string;
  task?: 'categorize' | 'get_transaction_type' | 'get_amount';
  omnibusMode?: boolean;
}

/**
 * Build system prompt for transaction details extraction
 */
function buildSystemPrompt(omnibusMode?: boolean): string {
  const nullHandling = omnibusMode 
    ? "If you cannot determine a field value, set it to null."
    : "Try your best to infer field values from context.";

  return `You are an AI assistant that extracts key details from financial transaction descriptions.

Identify all distinct financial transactions in the provided text. For each transaction, extract the following information:
- description: A concise description of the transaction.
- category: The category of the transaction (e.g., groceries, dining, utilities). ${nullHandling}
- type: The type of transaction (income or expense).
- amount: The numerical amount of the transaction. ${nullHandling} When extracting the amount field:
  - If the amount includes 'k' (e.g., 100k), interpret as 100,000.
  - If the amount includes 'm' or 'M' (e.g., 1m, 1M), interpret as 1,000,000.
  - Accept both lowercase and uppercase suffixes.
  - Always return the amount as a number in the response.
- date: The date of the transaction in ISO format (YYYY-MM-DD). ${nullHandling}
- merchant: The merchant or business name associated with the transaction (e.g., "Starbucks", "Amazon"). ${nullHandling}
- paymentMethod: The payment method used for the transaction (e.g., credit card, cash, debit card, PayPal). ${nullHandling}
- location: The location where the transaction took place (e.g., "New York", "Online"). ${nullHandling}

Return ONLY the extracted information as a valid JSON array of objects. Do not include any markdown formatting, code blocks, or additional text. Each object in the array should represent a single transaction. If no transactions are found, return an empty array.

IMPORTANT: Your response must be valid JSON that can be parsed directly. Do not wrap the JSON in markdown code blocks or add any explanatory text.

Example response format:
[
  {
    "description": "Coffee purchase",
    "category": "dining",
    "type": "expense",
    "amount": 4.50,
    "date": "2024-01-15",
    "merchant": "Starbucks",
    "paymentMethod": "credit card",
    "location": "New York"
  }
]`;
}

/**
 * Build user prompt with transaction text
 */
function buildUserPrompt(text: string): string {
  return `Please extract transaction details from the following text:

${text}`;
}

/**
 * Build messages for extract transaction details prompt
 * 
 * @param input - Input parameters including text, task, and omnibusMode
 * @returns Array of LLM messages for the conversation
 */
export function buildExtractTransactionDetailsMessages(
  input: ExtractTransactionDetailsPromptInput
): LLMMessage[] {
  const { text, omnibusMode } = input;

  return [
    {
      role: 'system',
      content: buildSystemPrompt(omnibusMode),
    },
    {
      role: 'user',
      content: buildUserPrompt(text),
    },
  ];
}

/**
 * Template variables that can be used in prompts
 */
export const TEMPLATE_VARIABLES = {
  TEXT: '{{text}}',
  OMNIBUS_MODE: '{{omnibusMode}}',
  TASK: '{{task}}',
} as const;

/**
 * Replace template variables in a string
 * 
 * @param template - Template string with variables
 * @param variables - Object with variable values
 * @returns String with variables replaced
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return result;
}

/**
 * Legacy prompt string for backward compatibility
 * This matches the original Genkit prompt format
 */
export const LEGACY_PROMPT_TEMPLATE = `You are an AI assistant that extracts key details from financial transaction descriptions.

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

Return the extracted information as a JSON array of objects. Each object in the array should represent a single transaction. If no transactions are found, return an empty array.`;
