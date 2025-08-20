import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { verifyAppCheck, isAppCheckError } from '@/lib/auth/verifyAppCheck';
import { 
  validateFieldSpecificRequest, 
  isValidField,
  filterResponseByFields,
  type ValidField 
} from '@/lib/validation';
import {
  mapAuthErrorToResponse,
  mapValidationErrorToResponse,
  mapGenericErrorToResponse,
  mapPayloadTooLargeErrorToResponse,
  mapNotFoundErrorToResponse,
} from '@/lib/errors';
import { getTransactionDetails } from '@/app/actions';

/**
 * POST /api/v1/transactions/extract/[field]
 * 
 * Extract a specific field from transaction text
 * Supports: description, category, type, amount, date, llm_comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { field: string } }
) {
  const { field } = params;
  const instance = `/api/v1/transactions/extract/${field}`;

  try {
    // 1. Validate that the requested field is valid
    if (!isValidField(field)) {
      return mapNotFoundErrorToResponse(
        `Field '${field}' is not available. Valid fields are: description, category, type, amount, date, llm_comment`,
        instance
      );
    }

    // 2. Verify Firebase App Check authentication
    await verifyAppCheck(request);

    // 3. Validate and parse request body
    let validatedRequest;
    try {
      validatedRequest = await validateFieldSpecificRequest(request);
    } catch (error) {
      if (error instanceof ZodError) {
        return mapValidationErrorToResponse(error, instance);
      }
      if (error instanceof Error && error.message === 'Request body too large') {
        return mapPayloadTooLargeErrorToResponse(instance);
      }
      throw error; // Re-throw unexpected errors
    }

    const { text } = validatedRequest;

    // 4. Call the server action to extract transaction details
    const actionResult = await getTransactionDetails({ 
      text,
      omnibusMode: true // Enable intelligent null assignment
    });

    // 5. Handle server action errors
    if (actionResult.error) {
      console.error('Server action error:', actionResult.error);
      return mapGenericErrorToResponse(
        new Error(actionResult.error), 
        instance
      );
    }

    if (!actionResult.data) {
      console.error('Server action returned no data');
      return mapGenericErrorToResponse(
        new Error('No data returned from extraction'), 
        instance
      );
    }

    // 6. Filter response to include only the requested field
    const filteredData = filterResponseByFields(
      actionResult.data, 
      [field as ValidField]
    );

    // For field-specific endpoints, return the field from the first transaction only
    const responseData = filteredData.length > 0 ? filteredData[0] : {};

    // 7. Return successful response
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    // Handle authentication errors
    if (isAppCheckError(error)) {
      return mapAuthErrorToResponse(error);
    }

    // Handle all other unexpected errors
    return mapGenericErrorToResponse(error, instance);
  }
}
