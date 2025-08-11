import { NextRequest } from 'next/server';
import { getFirebaseAppCheck } from '@/lib/firebaseAdmin';

/**
 * Custom error types for App Check verification failures
 */
export class AppCheckMissingError extends Error {
  constructor(message: string = 'Missing Firebase App Check token') {
    super(message);
    this.name = 'AppCheckMissingError';
  }
}

export class AppCheckInvalidError extends Error {
  constructor(message: string = 'Invalid Firebase App Check token') {
    super(message);
    this.name = 'AppCheckInvalidError';
  }
}

/**
 * Verify Firebase App Check token from request headers
 * 
 * @param request - The NextRequest object containing headers
 * @throws {AppCheckMissingError} When no token is provided
 * @throws {AppCheckInvalidError} When token verification fails
 */
export async function verifyAppCheck(request: NextRequest): Promise<void> {
  // Check if debug mode is enabled - bypass authentication if true
  const debugMode = process.env.API_DEBUG_MODE_ENABLED?.toLowerCase() === 'true';
  
  if (debugMode) {
    console.log('API Debug mode enabled - bypassing App Check verification');
    return;
  }

  // Extract App Check token from headers
  const appCheckToken = request.headers.get('X-Firebase-AppCheck');
  
  if (!appCheckToken) {
    console.warn('App Check verification failed: Missing token');
    throw new AppCheckMissingError('X-Firebase-AppCheck header is required');
  }

  try {
    // Verify the token with Firebase Admin SDK
    const appCheck = getFirebaseAppCheck();
    const verificationResult = await appCheck.verifyToken(appCheckToken);
    
    // Log successful verification (without sensitive data)
    console.log('App Check verification successful', {
      appId: verificationResult.appId,
      // Don't log the actual token for security
    });
    
  } catch (error) {
    // Log the error for monitoring (server-side only)
    console.error('App Check verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      // Don't log the actual token for security
    });
    
    // Throw a generic error to avoid leaking implementation details
    throw new AppCheckInvalidError('App Check token verification failed');
  }
}

/**
 * Type guard to check if an error is an App Check related error
 */
export function isAppCheckError(error: unknown): error is AppCheckMissingError | AppCheckInvalidError {
  return error instanceof AppCheckMissingError || error instanceof AppCheckInvalidError;
}
