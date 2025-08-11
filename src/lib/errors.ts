import { NextResponse } from 'next/server';
import { ZodError, ZodIssue } from 'zod';
import { AppCheckMissingError, AppCheckInvalidError } from '@/lib/auth/verifyAppCheck';

/**
 * RFC 7807 Problem Details interface
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Validation error details for field-level errors
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Extended Problem Details for validation errors
 */
export interface ValidationProblemDetails extends ProblemDetails {
  errors: ValidationErrorDetail[];
}

/**
 * Create a Problem Details response
 */
export function createProblemResponse(
  problem: ProblemDetails,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(problem, {
    status: problem.status,
    headers: {
      'Content-Type': 'application/problem+json',
      ...headers,
    },
  });
}

/**
 * Create a validation error response with field details
 */
export function createValidationErrorResponse(
  errors: ValidationErrorDetail[],
  instance?: string
): NextResponse {
  const problem: ValidationProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
    title: 'Validation Error',
    status: 400,
    detail: 'The request contains invalid or missing fields',
    instance,
    errors,
  };

  return createProblemResponse(problem);
}

/**
 * Convert Zod error to validation error details
 */
export function zodErrorToValidationDetails(error: ZodError): ValidationErrorDetail[] {
  return error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Map authentication errors to HTTP responses
 */
export function mapAuthErrorToResponse(error: AppCheckMissingError | AppCheckInvalidError): NextResponse {
  console.error('Authentication error:', error.message);

  const problem: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
    title: 'Authentication Required',
    status: 401,
    detail: error instanceof AppCheckMissingError 
      ? 'Firebase App Check token is required'
      : 'Firebase App Check token is invalid or expired',
  };

  return createProblemResponse(problem);
}

/**
 * Map validation errors to HTTP responses
 */
export function mapValidationErrorToResponse(error: ZodError, instance?: string): NextResponse {
  console.error('Validation error:', error.issues);
  
  const validationDetails = zodErrorToValidationDetails(error);
  return createValidationErrorResponse(validationDetails, instance);
}

/**
 * Map generic errors to HTTP responses
 */
export function mapGenericErrorToResponse(error: unknown, instance?: string): NextResponse {
  // Log the full error server-side for debugging
  console.error('Unexpected error:', error);

  const problem: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred while processing the request',
    instance,
  };

  return createProblemResponse(problem);
}

/**
 * Map payload too large errors to HTTP responses
 */
export function mapPayloadTooLargeErrorToResponse(instance?: string): NextResponse {
  const problem: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.11',
    title: 'Payload Too Large',
    status: 413,
    detail: 'The request payload is too large to process',
    instance,
  };

  return createProblemResponse(problem);
}

/**
 * Map not found errors to HTTP responses
 */
export function mapNotFoundErrorToResponse(detail: string, instance?: string): NextResponse {
  const problem: ProblemDetails = {
    type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
    title: 'Not Found',
    status: 404,
    detail,
    instance,
  };

  return createProblemResponse(problem);
}
