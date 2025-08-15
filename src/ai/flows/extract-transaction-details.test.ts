import { describe, it, expect } from 'vitest';
import { extractTransactionDetails } from './extract-transaction-details';

describe('extractTransactionDetails', () => {
  it('should extract a single transaction', async () => {
    const input = {
      text: 'Coffee with Sarah at Blue Bottle Cafe for $5.50 yesterday',
      omnibusMode: true,
    };

    const result = await extractTransactionDetails(input);
    
    // Should return an array with one transaction
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    
    // Check the first transaction
    const transaction = result[0];
    expect(transaction).toHaveProperty('description');
    expect(transaction).toHaveProperty('category');
    expect(transaction).toHaveProperty('type');
    expect(transaction).toHaveProperty('amount');
    expect(transaction).toHaveProperty('date');
    expect(transaction).toHaveProperty('merchant');
    expect(transaction).toHaveProperty('paymentMethod');
    expect(transaction).toHaveProperty('location');
  });

  it('should extract multiple transactions', async () => {
    const input = {
      text: 'Went to the grocery store and spent $45.60 on groceries. Also paid $1200 for rent.',
      omnibusMode: true,
    };

    const result = await extractTransactionDetails(input);
    
    // Should return an array with multiple transactions
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    
    // Check each transaction
    result.forEach(transaction => {
      expect(transaction).toHaveProperty('description');
      expect(transaction).toHaveProperty('category');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('date');
      expect(transaction).toHaveProperty('merchant');
      expect(transaction).toHaveProperty('paymentMethod');
      expect(transaction).toHaveProperty('location');
    });
  });

  it('should handle task-specific modes', async () => {
    const input = {
      text: 'Coffee with Sarah at Blue Bottle Cafe for $5.50 yesterday',
      task: 'categorize' as const,
      omnibusMode: true,
    };

    const result = await extractTransactionDetails(input);
    
    // Should return an array with one transaction
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    
    // Check the first transaction
    const transaction = result[0];
    expect(transaction).toHaveProperty('description');
    expect(transaction).toHaveProperty('category');
    expect(transaction.type).toBe('N/A');
    expect(transaction.amount).toBeNull();
    expect(transaction.date).toBeNull();
    expect(transaction.merchant).toBeNull();
    expect(transaction.paymentMethod).toBeNull();
    expect(transaction.location).toBeNull();
  });
});