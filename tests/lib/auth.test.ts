import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  verifyAppCheck,
  AppCheckMissingError,
  AppCheckInvalidError,
  isAppCheckError,
} from '@/lib/auth/verifyAppCheck';
import { getFirebaseAppCheck } from '@/lib/firebaseAdmin';

// Mock Firebase Admin
vi.mock('@/lib/firebaseAdmin', () => ({
  getFirebaseAppCheck: vi.fn(),
}));

describe('Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.API_DEBUG_MODE_ENABLED;
  });

  describe('verifyAppCheck function', () => {
    it('should bypass verification in debug mode', async () => {
      process.env.API_DEBUG_MODE_ENABLED = 'true';
      
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      await expect(verifyAppCheck(request)).resolves.not.toThrow();
      expect(getFirebaseAppCheck).not.toHaveBeenCalled();
    });

    it('should bypass verification when debug mode is TRUE (case insensitive)', async () => {
      process.env.API_DEBUG_MODE_ENABLED = 'TRUE';
      
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      await expect(verifyAppCheck(request)).resolves.not.toThrow();
    });

    it('should not bypass verification when debug mode is false', async () => {
      process.env.API_DEBUG_MODE_ENABLED = 'false';
      
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      await expect(verifyAppCheck(request)).rejects.toThrow(AppCheckMissingError);
    });

    it('should throw AppCheckMissingError when no token is provided', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      await expect(verifyAppCheck(request)).rejects.toThrow(AppCheckMissingError);
      await expect(verifyAppCheck(request)).rejects.toThrow('X-Firebase-AppCheck header is required');
    });

    it('should successfully verify valid token', async () => {
      const mockAppCheck = {
        verifyToken: vi.fn().mockResolvedValue({
          appId: 'test-app-id',
        }),
      };
      vi.mocked(getFirebaseAppCheck).mockReturnValue(mockAppCheck as any);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'X-Firebase-AppCheck': 'valid-token',
        },
      });

      await expect(verifyAppCheck(request)).resolves.not.toThrow();
      expect(mockAppCheck.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw AppCheckInvalidError when token verification fails', async () => {
      const mockAppCheck = {
        verifyToken: vi.fn().mockRejectedValue(new Error('Token verification failed')),
      };
      vi.mocked(getFirebaseAppCheck).mockReturnValue(mockAppCheck as any);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'X-Firebase-AppCheck': 'invalid-token',
        },
      });

      await expect(verifyAppCheck(request)).rejects.toThrow(AppCheckInvalidError);
      await expect(verifyAppCheck(request)).rejects.toThrow('App Check token verification failed');
    });

    it('should handle Firebase Admin SDK errors gracefully', async () => {
      const mockAppCheck = {
        verifyToken: vi.fn().mockRejectedValue(new Error('Firebase service unavailable')),
      };
      vi.mocked(getFirebaseAppCheck).mockReturnValue(mockAppCheck as any);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'X-Firebase-AppCheck': 'some-token',
        },
      });

      await expect(verifyAppCheck(request)).rejects.toThrow(AppCheckInvalidError);
      // Should not expose internal error details
      await expect(verifyAppCheck(request)).rejects.not.toThrow('Firebase service unavailable');
    });
  });

  describe('Error Classes', () => {
    it('should create AppCheckMissingError with default message', () => {
      const error = new AppCheckMissingError();
      expect(error.name).toBe('AppCheckMissingError');
      expect(error.message).toBe('Missing Firebase App Check token');
    });

    it('should create AppCheckMissingError with custom message', () => {
      const error = new AppCheckMissingError('Custom missing message');
      expect(error.name).toBe('AppCheckMissingError');
      expect(error.message).toBe('Custom missing message');
    });

    it('should create AppCheckInvalidError with default message', () => {
      const error = new AppCheckInvalidError();
      expect(error.name).toBe('AppCheckInvalidError');
      expect(error.message).toBe('Invalid Firebase App Check token');
    });

    it('should create AppCheckInvalidError with custom message', () => {
      const error = new AppCheckInvalidError('Custom invalid message');
      expect(error.name).toBe('AppCheckInvalidError');
      expect(error.message).toBe('Custom invalid message');
    });
  });

  describe('isAppCheckError type guard', () => {
    it('should return true for AppCheckMissingError', () => {
      const error = new AppCheckMissingError();
      expect(isAppCheckError(error)).toBe(true);
    });

    it('should return true for AppCheckInvalidError', () => {
      const error = new AppCheckInvalidError();
      expect(isAppCheckError(error)).toBe(true);
    });

    it('should return false for generic Error', () => {
      const error = new Error('Generic error');
      expect(isAppCheckError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(isAppCheckError('string')).toBe(false);
      expect(isAppCheckError(null)).toBe(false);
      expect(isAppCheckError(undefined)).toBe(false);
      expect(isAppCheckError({})).toBe(false);
    });
  });
});
