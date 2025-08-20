import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import * as handler from '@/app/api/v1/transactions/extract/route';
import { getTransactionDetails } from '@/app/actions';

// Mock the server action
vi.mocked(getTransactionDetails).mockImplementation(async (input) => {
  return {
    data: [{
      description: 'Coffee at Starbucks',
      category: 'dining',
      type: 'expense',
      amount: 4.50,
      date: '2024-01-15',
      merchant: 'Starbucks',
      paymentMethod: 'credit card',
      location: 'New York',
      llm_comment: 'Looks like someone couldn\'t resist another coffee run! ☕️'
    }],
  };
});

describe('/api/v1/transactions/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path Tests', () => {
    it('should successfully extract all fields (all-in-one)', async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks for $4.50 on January 15th',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            description: 'Coffee at Starbucks',
            category: 'dining',
            type: 'expense',
            amount: 4.50,
            date: '2024-01-15',
            merchant: 'Starbucks',
            paymentMethod: 'credit card',
            location: 'New York',
            llm_comment: 'Looks like someone couldn\'t resist another coffee run! ☕️'
          });

          expect(getTransactionDetails).toHaveBeenCalledWith({
            text: 'Bought coffee at Starbucks for $4.50 on January 15th',
            omnibusMode: true,
          });
        },
      });
    });

    it('should successfully extract selective fields', async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks for $4.50 on January 15th',
              fields: ['amount', 'category'],
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            amount: 4.50,
            category: 'dining',
          });
        },
      });
    });

    it('should handle single field selection', async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks for $4.50',
              fields: ['amount'],
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            amount: 4.50,
          });
        },
      });
    });
  });

  describe('Input Validation Error Tests', () => {
    it('should return 400 for missing text field', async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });

          expect(response.status).toBe(400);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
          
          const data = await response.json();
          expect(data.title).toBe('Validation Error');
          expect(data.errors).toContainEqual({
            field: 'text',
            message: 'Required',
            code: 'invalid_type',
          });
        },
      });
    });

    it('should return 400 for empty text field', async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: '',
            }),
          });

          expect(response.status).toBe(400);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
        },
      });
    });

    it('should return 400 for invalid fields array', async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Some transaction text',
              fields: ['invalid_field', 'merchant'],
            }),
          });

          expect(response.status).toBe(400);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
        },
      });
    });

    it('should return 400 for malformed JSON', async () => {
      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: '{ invalid json }',
          });

          expect(response.status).toBe(400);
        },
      });
    });
  });

  describe('Server Action Error Tests', () => {
    it('should handle server action returning error', async () => {
      vi.mocked(getTransactionDetails).mockResolvedValueOnce({
        error: 'AI service unavailable',
      });

      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Some transaction text',
            }),
          });

          expect(response.status).toBe(500);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
          
          const data = await response.json();
          expect(data.title).toBe('Internal Server Error');
        },
      });
    });

    it('should handle server action returning no data', async () => {
      vi.mocked(getTransactionDetails).mockResolvedValueOnce({
        data: null,
      });

      await testApiHandler({
        appHandler: handler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Some transaction text',
            }),
          });

          expect(response.status).toBe(500);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
        },
      });
    });
  });
});
