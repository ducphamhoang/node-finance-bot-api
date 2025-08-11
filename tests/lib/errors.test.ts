import { describe, it, expect } from 'vitest';
import { ZodError, z } from 'zod';
import {
  createProblemResponse,
  createValidationErrorResponse,
  zodErrorToValidationDetails,
  mapAuthErrorToResponse,
  mapValidationErrorToResponse,
  mapGenericErrorToResponse,
  mapNotFoundErrorToResponse,
} from '@/lib/errors';
import { AppCheckMissingError, AppCheckInvalidError } from '@/lib/auth/verifyAppCheck';

describe('Error Handling Utilities', () => {
  describe('createProblemResponse', () => {
    it('should create proper Problem Details response', async () => {
      const problem = {
        type: 'https://example.com/problem',
        title: 'Test Error',
        status: 400,
        detail: 'This is a test error',
      };

      const response = createProblemResponse(problem);
      
      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      
      const data = await response.json();
      expect(data).toEqual(problem);
    });

    it('should include additional headers', async () => {
      const problem = {
        type: 'https://example.com/problem',
        title: 'Test Error',
        status: 400,
        detail: 'This is a test error',
      };

      const response = createProblemResponse(problem, {
        'X-Custom-Header': 'test-value',
      });
      
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      expect(response.headers.get('x-custom-header')).toBe('test-value');
    });
  });

  describe('createValidationErrorResponse', () => {
    it('should create validation error response', async () => {
      const errors = [
        { field: 'text', message: 'Required field', code: 'required' },
        { field: 'amount', message: 'Must be a number', code: 'invalid_type' },
      ];

      const response = createValidationErrorResponse(errors);
      
      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      
      const data = await response.json();
      expect(data.title).toBe('Validation Error');
      expect(data.status).toBe(400);
      expect(data.errors).toEqual(errors);
    });
  });

  describe('zodErrorToValidationDetails', () => {
    it('should convert Zod errors to validation details', () => {
      const schema = z.object({
        text: z.string().min(1),
        amount: z.number(),
      });

      try {
        schema.parse({ text: '', amount: 'invalid' });
      } catch (error) {
        if (error instanceof ZodError) {
          const details = zodErrorToValidationDetails(error);
          
          expect(details).toHaveLength(2);
          expect(details[0]).toMatchObject({
            field: 'text',
            code: 'too_small',
          });
          expect(details[1]).toMatchObject({
            field: 'amount',
            code: 'invalid_type',
          });
        }
      }
    });

    it('should handle nested field paths', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(1),
        }),
      });

      try {
        schema.parse({ user: { name: '' } });
      } catch (error) {
        if (error instanceof ZodError) {
          const details = zodErrorToValidationDetails(error);
          
          expect(details[0].field).toBe('user.name');
        }
      }
    });
  });

  describe('mapAuthErrorToResponse', () => {
    it('should map AppCheckMissingError to 401 response', async () => {
      const error = new AppCheckMissingError('Token missing');
      const response = mapAuthErrorToResponse(error);
      
      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      
      const data = await response.json();
      expect(data.title).toBe('Authentication Required');
      expect(data.detail).toContain('required');
    });

    it('should map AppCheckInvalidError to 401 response', async () => {
      const error = new AppCheckInvalidError('Token invalid');
      const response = mapAuthErrorToResponse(error);
      
      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      
      const data = await response.json();
      expect(data.title).toBe('Authentication Required');
      expect(data.detail).toContain('invalid');
    });
  });

  describe('mapValidationErrorToResponse', () => {
    it('should map ZodError to 400 response', async () => {
      const schema = z.object({
        text: z.string().min(1),
      });

      try {
        schema.parse({ text: '' });
      } catch (error) {
        if (error instanceof ZodError) {
          const response = mapValidationErrorToResponse(error);
          
          expect(response.status).toBe(400);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
          
          const data = await response.json();
          expect(data.title).toBe('Validation Error');
          expect(data.errors).toHaveLength(1);
        }
      }
    });
  });

  describe('mapGenericErrorToResponse', () => {
    it('should map generic errors to 500 response', async () => {
      const error = new Error('Something went wrong');
      const response = mapGenericErrorToResponse(error);
      
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      
      const data = await response.json();
      expect(data.title).toBe('Internal Server Error');
      expect(data.detail).toBe('An unexpected error occurred while processing the request');
    });

    it('should handle non-Error objects', async () => {
      const response = mapGenericErrorToResponse('string error');
      
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
    });
  });

  describe('mapNotFoundErrorToResponse', () => {
    it('should create 404 response', async () => {
      const response = mapNotFoundErrorToResponse('Resource not found');
      
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      
      const data = await response.json();
      expect(data.title).toBe('Not Found');
      expect(data.detail).toBe('Resource not found');
    });
  });
});
