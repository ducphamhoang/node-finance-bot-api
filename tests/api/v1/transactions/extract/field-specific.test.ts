import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testApiHandler } from 'next-test-api-route-handler';
import * as handler from '@/app/api/v1/transactions/extract/[field]/route';
import { getTransactionDetails } from '@/app/actions';

// Mock the server action
vi.mocked(getTransactionDetails).mockImplementation(async (input) => {
  return {
    data: {
      description: 'Coffee at Starbucks',
      category: 'dining',
      type: 'expense',
      amount: 4.50,
      date: '2024-01-15',
    },
  };
});

describe('/api/v1/transactions/extract/[field]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid Field Tests', () => {
    it('should extract description field', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'description' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks for $4.50',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            description: 'Coffee at Starbucks',
          });
        },
      });
    });

    it('should extract category field', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'category' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks for $4.50',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            category: 'dining',
          });
        },
      });
    });

    it('should extract type field', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'type' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks for $4.50',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            type: 'expense',
          });
        },
      });
    });

    it('should extract amount field', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'amount' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks for $4.50',
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

    it('should extract date field', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'date' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Bought coffee at Starbucks on January 15th',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            date: '2024-01-15',
          });
        },
      });
    });
  });

  describe('Invalid Field Tests', () => {
    it('should return 404 for merchant field (does not exist)', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'merchant' },
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

          expect(response.status).toBe(404);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
          
          const data = await response.json();
          expect(data.title).toBe('Not Found');
          expect(data.detail).toContain('merchant');
          expect(data.detail).toContain('description, category, type, amount, date');
        },
      });
    });

    it('should return 404 for invalid field name', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'invalid_field' },
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

          expect(response.status).toBe(404);
          expect(response.headers.get('content-type')).toBe('application/problem+json');
        },
      });
    });
  });

  describe('Input Validation Tests', () => {
    it('should return 400 for missing text field', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'amount' },
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
        },
      });
    });

    it('should return 400 for empty text field', async () => {
      await testApiHandler({
        appHandler: handler,
        params: { field: 'amount' },
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
  });

  describe('Response Format Tests', () => {
    it('should handle null values for nullable fields', async () => {
      vi.mocked(getTransactionDetails).mockResolvedValueOnce({
        data: {
          description: 'Some transaction',
          category: null,
          type: 'expense',
          amount: null,
          date: null,
        },
      });

      await testApiHandler({
        appHandler: handler,
        params: { field: 'category' },
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: 'Some unclear transaction',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          
          expect(data).toEqual({
            category: null,
          });
        },
      });
    });
  });
});
