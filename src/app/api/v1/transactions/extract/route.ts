import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { verifyAppCheck, isAppCheckError } from '@/lib/auth/verifyAppCheck';
import { 
  validateExtractRequest, 
  filterResponseByFields,
  type ValidField 
} from '@/lib/validation';
import {
  mapAuthErrorToResponse,
  mapValidationErrorToResponse,
  mapGenericErrorToResponse,
  mapPayloadTooLargeErrorToResponse,
  createValidationErrorResponse,
} from '@/lib/errors';
import { getTransactionDetails } from '@/app/actions';

/**
 * POST /api/v1/transactions/extract
 * 
 * Extract transaction details from text input
 * Supports both all-in-one extraction and selective field extraction
 */
export async function POST(request: NextRequest) {
  const instance = `/api/v1/transactions/extract`;

  try {
    // 1. Verify Firebase App Check authentication
    await verifyAppCheck(request);

    // 2. Validate and parse request body
    let validatedRequest;
    try {
      validatedRequest = await validateExtractRequest(request);
    } catch (error) {
      if (error instanceof ZodError) {
        return mapValidationErrorToResponse(error, instance);
      }
      if (error instanceof Error) {
        if (error.message === 'Request body too large') {
          return mapPayloadTooLargeErrorToResponse(instance);
        }
        if (error.message === 'Invalid JSON in request body' ||
            error.message === 'Request body is empty') {
          // Convert JSON parsing errors to validation errors
          const validationDetails = [{
            field: 'body',
            message: error.message,
            code: 'invalid_json',
          }];
          return createValidationErrorResponse(validationDetails, instance);
        }
      }
      throw error; // Re-throw unexpected errors
    }

    const { text, fields } = validatedRequest;

    // 3. Call the server action to extract transaction details
    const actionResult = await getTransactionDetails({ 
      text,
      omnibusMode: true // Enable intelligent null assignment
    });

    // 4. Handle server action errors
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

    // 5. Process response based on requested fields
    let responseData: any = actionResult.data;

    if (fields && fields.length > 0) {
      // Selective extraction - filter response to include only requested fields
      const filteredData = filterResponseByFields(actionResult.data, fields as ValidField[]);
      // For the main endpoint with selective fields, return the first transaction's filtered fields
      responseData = filteredData.length > 0 ? filteredData[0] : {};
    } else {
      // For all-in-one extraction (no fields specified), return the first transaction
      responseData = actionResult.data.length > 0 ? actionResult.data[0] : {};
    }

    // 6. Return successful response
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
