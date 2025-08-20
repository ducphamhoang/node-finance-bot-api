import { describe, it, expect } from 'vitest';
import {
  VALID_FIELDS,
  validateFields,
  filterResponseByFields,
  isValidField,
  ExtractRequestSchema,
  FieldSpecificRequestSchema,
} from '@/lib/validation';
import type { ExtractTransactionDetailsOutput } from '@/ai/flows/extract-transaction-details';

describe('Validation Utilities', () => {
  describe('VALID_FIELDS constant', () => {
    it('should contain exactly 6 expected fields', () => {
      expect(VALID_FIELDS).toEqual(['description', 'category', 'type', 'amount', 'date', 'llm_comment']);
      expect(VALID_FIELDS).toHaveLength(6);
    });
  });

  describe('validateFields function', () => {
    it('should return true for valid field names', () => {
      expect(validateFields(['description'])).toBe(true);
      expect(validateFields(['amount', 'category'])).toBe(true);
      expect(validateFields(['description', 'category', 'type', 'amount', 'date', 'llm_comment'])).toBe(true);
    });

    it('should return false for invalid field names', () => {
      expect(validateFields(['merchant'])).toBe(false);
      expect(validateFields(['invalid_field'])).toBe(false);
      expect(validateFields(['amount', 'merchant'])).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(validateFields([])).toBe(true);
    });
  });

  describe('isValidField function', () => {
    it('should return true for valid field names', () => {
      expect(isValidField('description')).toBe(true);
      expect(isValidField('category')).toBe(true);
      expect(isValidField('type')).toBe(true);
      expect(isValidField('amount')).toBe(true);
      expect(isValidField('date')).toBe(true);
      expect(isValidField('llm_comment')).toBe(true);
    });

    it('should return false for invalid field names', () => {
      expect(isValidField('merchant')).toBe(false);
      expect(isValidField('invalid')).toBe(false);
      expect(isValidField('')).toBe(false);
    });
  });

  describe('filterResponseByFields function', () => {
    const mockResponse: ExtractTransactionDetailsOutput = [{
      description: 'Coffee at Starbucks',
      category: 'dining',
      type: 'expense',
      amount: 4.50,
      date: '2024-01-15',
      merchant: 'Starbucks',
      paymentMethod: 'credit card',
      location: 'New York',
      llm_comment: 'Looks like someone couldn\'t resist another coffee run! ☕️'
    }];

    it('should filter response to include only requested fields', () => {
      const result = filterResponseByFields(mockResponse, ['amount', 'category']);
      expect(result).toEqual([{
        amount: 4.50,
        category: 'dining',
      }]);
    });

    it('should handle single field filtering', () => {
      const result = filterResponseByFields(mockResponse, ['description']);
      expect(result).toEqual([{
        description: 'Coffee at Starbucks',
      }]);
    });

    it('should handle all fields', () => {
      const result = filterResponseByFields(mockResponse, ['description', 'category', 'type', 'amount', 'date', 'llm_comment']);
      // When filtering by all VALID_FIELDS, it should include only those fields
      expect(result).toEqual([{
        description: 'Coffee at Starbucks',
        category: 'dining',
        type: 'expense',
        amount: 4.50,
        date: '2024-01-15',
        llm_comment: 'Looks like someone couldn\'t resist another coffee run! ☕️'
      }]);
    });

    it('should handle empty fields array', () => {
      const result = filterResponseByFields(mockResponse, []);
      expect(result).toEqual([{}]);
    });

    it('should not modify original object', () => {
      const originalResponse = [...mockResponse];
      filterResponseByFields(mockResponse, ['amount']);
      expect(mockResponse).toEqual(originalResponse);
    });

    it('should handle null values', () => {
      const responseWithNulls: ExtractTransactionDetailsOutput = [{
        description: 'Some transaction',
        category: null,
        type: 'expense',
        amount: null,
        date: null,
        merchant: null,
        paymentMethod: null,
        location: null,
        llm_comment: 'A mysterious transaction appears! 🎭'
      }];

      const result = filterResponseByFields(responseWithNulls, ['category', 'amount']);
      expect(result).toEqual([{
        category: null,
        amount: null,
      }]);
    });
  });

  describe('ExtractRequestSchema', () => {
    it('should validate valid requests', () => {
      const validRequest = {
        text: 'Some transaction text',
      };
      expect(() => ExtractRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate requests with fields array', () => {
      const validRequest = {
        text: 'Some transaction text',
        fields: ['amount', 'category'],
      };
      expect(() => ExtractRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject requests with missing text', () => {
      const invalidRequest = {
        fields: ['amount'],
      };
      expect(() => ExtractRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject requests with empty text', () => {
      const invalidRequest = {
        text: '',
      };
      expect(() => ExtractRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject requests with invalid fields', () => {
      const invalidRequest = {
        text: 'Some text',
        fields: ['invalid_field'],
      };
      expect(() => ExtractRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('FieldSpecificRequestSchema', () => {
    it('should validate valid requests', () => {
      const validRequest = {
        text: 'Some transaction text',
      };
      expect(() => FieldSpecificRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject requests with missing text', () => {
      const invalidRequest = {};
      expect(() => FieldSpecificRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject requests with empty text', () => {
      const invalidRequest = {
        text: '',
      };
      expect(() => FieldSpecificRequestSchema.parse(invalidRequest)).toThrow();
    });
  });
});
