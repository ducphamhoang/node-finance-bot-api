import { z } from 'zod';
import { NextRequest } from 'next/server';
import type { ExtractTransactionDetailsOutput } from '@/ai/flows/extract-transaction-details';

/**
 * Valid fields that can be extracted from transactions
 * Based on ExtractTransactionDetailsOutputSchema
 */
export const VALID_FIELDS = ['description', 'category', 'type', 'amount', 'date', 'llm_comment'] as const;
export type ValidField = typeof VALID_FIELDS[number];

/**
 * Zod schema for the main extraction API request
 */
export const ExtractRequestSchema = z.object({
  text: z.string().min(1, 'Text field is required and cannot be empty'),
  fields: z.array(z.enum(VALID_FIELDS)).optional(),
});

export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

/**
 * Zod schema for field-specific extraction API requests
 */
export const FieldSpecificRequestSchema = z.object({
  text: z.string().min(1, 'Text field is required and cannot be empty'),
});

export type FieldSpecificRequest = z.infer<typeof FieldSpecificRequestSchema>;

/**
 * Validate that the provided fields are valid
 */
export function validateFields(fields: string[]): fields is ValidField[] {
  return fields.every(field => VALID_FIELDS.includes(field as ValidField));
}

/**
 * Filter response object to include only requested fields
 */
export function filterResponseByFields(
  response: ExtractTransactionDetailsOutput,
  fields: ValidField[]
): ExtractTransactionDetailsOutput {
  return response.map(transaction => {
    const filtered: any = {};
    
    for (const field of fields) {
      if (field in transaction) {
        filtered[field] = transaction[field as keyof typeof transaction];
      }
    }
    
    return filtered;
  });
}

/**
 * Safely parse JSON request body with size limits
 */
export async function parseRequestBody(request: NextRequest): Promise<unknown> {
  try {
    // Check content length if available
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
      throw new Error('Request body too large');
    }

    const body = await request.text();
    
    // Additional size check on the actual body
    if (body.length > 1024 * 1024) { // 1MB limit
      throw new Error('Request body too large');
    }

    if (!body.trim()) {
      throw new Error('Request body is empty');
    }

    return JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON in request body');
    }
    throw error;
  }
}

/**
 * Validate and parse extraction request
 */
export async function validateExtractRequest(request: NextRequest): Promise<ExtractRequest> {
  const body = await parseRequestBody(request);
  return ExtractRequestSchema.parse(body);
}

/**
 * Validate and parse field-specific request
 */
export async function validateFieldSpecificRequest(request: NextRequest): Promise<FieldSpecificRequest> {
  const body = await parseRequestBody(request);
  return FieldSpecificRequestSchema.parse(body);
}

/**
 * Check if a field name is valid
 */
export function isValidField(field: string): field is ValidField {
  return VALID_FIELDS.includes(field as ValidField);
}

/**
 * Type guard for ExtractTransactionDetailsOutput
 */
export function isExtractTransactionDetailsOutput(obj: any): obj is ExtractTransactionDetailsOutput {
  return (
    Array.isArray(obj) &&
    obj.every(transaction =>
      typeof transaction === 'object' &&
      transaction !== null &&
      typeof transaction.description === 'string' &&
      (transaction.category === null || typeof transaction.category === 'string') &&
      typeof transaction.type === 'string' &&
      (transaction.amount === null || typeof transaction.amount === 'number') &&
      (transaction.date === null || typeof transaction.date === 'string') &&
      typeof transaction.llm_comment === 'string'
    )
  );
}
