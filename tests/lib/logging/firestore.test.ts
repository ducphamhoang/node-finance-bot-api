import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FirestoreLoggingService,
  getLoggingService,
  generateSessionId,
  LogEntrySchema,
  type LogEntry,
} from '@/lib/logging/firestore';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';

// Mock Firebase Admin SDK
vi.mock('@/lib/firebaseAdmin', () => ({
  getFirebaseAdmin: vi.fn(),
}));

// Mock Firestore
const mockFirestore = {
  collection: vi.fn(),
};

const mockCollection = {
  add: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  get: vi.fn(),
};

const mockQuery = {
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  get: vi.fn(),
};

// Mock getFirestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
}));

describe('Firestore Logging Service', () => {
  let loggingService: FirestoreLoggingService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock chain
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.where.mockReturnValue(mockQuery);
    mockCollection.orderBy.mockReturnValue(mockQuery);
    mockCollection.limit.mockReturnValue(mockQuery);
    mockQuery.where.mockReturnValue(mockQuery);
    mockQuery.orderBy.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnValue(mockQuery);
    
    loggingService = new FirestoreLoggingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LogEntrySchema validation', () => {
    it('should validate a complete log entry', () => {
      const validEntry: LogEntry = {
        userId: 'user123',
        sessionId: 'session123',
        input: 'Coffee at Starbucks for $5.50',
        response: [{ description: 'Coffee purchase', amount: 5.50 }],
        timestamp: new Date(),
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1500,
          tokens: 100,
          cached: false,
        },
      };

      const result = LogEntrySchema.parse(validEntry);
      expect(result).toEqual(validEntry);
    });

    it('should validate minimal log entry with only required fields', () => {
      const minimalEntry = {
        input: 'Test input',
        response: { result: 'test' },
        timestamp: new Date(),
      };

      const result = LogEntrySchema.parse(minimalEntry);
      expect(result).toEqual(minimalEntry);
    });

    it('should reject invalid log entry', () => {
      const invalidEntry = {
        // Missing required input field
        response: { result: 'test' },
        timestamp: new Date(),
      };

      expect(() => LogEntrySchema.parse(invalidEntry)).toThrow();
    });
  });

  describe('logInteraction method', () => {
    it('should successfully log an interaction', async () => {
      const mockAdd = vi.fn().mockResolvedValue({ id: 'doc123' });
      mockCollection.add = mockAdd;

      const logEntry = {
        userId: 'user123',
        sessionId: 'session123',
        input: 'Coffee at Starbucks for $5.50',
        response: [{ description: 'Coffee purchase', amount: 5.50 }],
        metadata: {
          provider: 'genkit',
          model: 'gemini-2.0-flash',
          duration: 1500,
        },
      };

      await loggingService.logInteraction(logEntry);

      expect(mockFirestore.collection).toHaveBeenCalledWith('llm_interactions');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          ...logEntry,
          timestamp: expect.any(Date),
          userId: logEntry.userId,
          sessionId: logEntry.sessionId,
          createdAt: expect.any(Date),
        })
      );
    });

    it('should handle logging errors gracefully', async () => {
      const mockAdd = vi.fn().mockRejectedValue(new Error('Firestore error'));
      mockCollection.add = mockAdd;
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const logEntry = {
        input: 'Test input',
        response: { result: 'test' },
      };

      // Should not throw an error
      await expect(loggingService.logInteraction(logEntry)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log interaction to Firestore:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle invalid log entries', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidEntry = {
        // Missing required input field
        response: { result: 'test' },
      } as any;

      await loggingService.logInteraction(invalidEntry);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to log interaction to Firestore:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getInteractionLogs method', () => {
    const mockSnapshot = {
      size: 2,
      forEach: vi.fn(),
    };

    beforeEach(() => {
      mockQuery.get.mockResolvedValue(mockSnapshot);
      mockCollection.get.mockResolvedValue(mockSnapshot);
    });

    it('should retrieve interaction logs without filters', async () => {
      const mockDocs = [
        {
          data: () => ({
            userId: 'user123',
            input: 'Test input 1',
            response: { result: 'test 1' },
            timestamp: { toDate: () => new Date('2024-01-01') },
          }),
        },
        {
          data: () => ({
            sessionId: 'session456',
            input: 'Test input 2',
            response: { result: 'test 2' },
            timestamp: { toDate: () => new Date('2024-01-02') },
          }),
        },
      ];

      mockSnapshot.forEach.mockImplementation((callback: any) => {
        mockDocs.forEach(callback);
      });

      const logs = await loggingService.getInteractionLogs();

      expect(mockFirestore.collection).toHaveBeenCalledWith('llm_interactions');
      expect(mockCollection.orderBy).toHaveBeenCalledWith('timestamp', 'desc');
      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        userId: 'user123',
        input: 'Test input 1',
        response: { result: 'test 1' },
      });
    });

    it('should apply userId filter', async () => {
      mockSnapshot.forEach.mockImplementation(() => {});

      await loggingService.getInteractionLogs({ userId: 'user123' });

      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'user123');
    });

    it('should apply sessionId filter', async () => {
      mockSnapshot.forEach.mockImplementation(() => {});

      await loggingService.getInteractionLogs({ sessionId: 'session123' });

      expect(mockCollection.where).toHaveBeenCalledWith('sessionId', '==', 'session123');
    });

    it('should apply date filters', async () => {
      mockSnapshot.forEach.mockImplementation(() => {});
      
      const startDate = new Date('2024-01-01');

      // Test startAfter filter only
      await loggingService.getInteractionLogs({
        startAfter: startDate,
      });

      expect(mockQuery.where).toHaveBeenCalledWith('timestamp', '>', startDate);
    });

    it('should apply end date filter', async () => {
      mockSnapshot.forEach.mockImplementation(() => {});
      
      const endDate = new Date('2024-01-31');

      // Test endBefore filter only
      await loggingService.getInteractionLogs({
        endBefore: endDate,
      });

      expect(mockQuery.where).toHaveBeenCalledWith('timestamp', '<', endDate);
    });

    it('should apply limit', async () => {
      mockSnapshot.forEach.mockImplementation(() => {});

      await loggingService.getInteractionLogs({ limit: 10 });

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should handle retrieval errors', async () => {
      mockQuery.get.mockRejectedValue(new Error('Firestore error'));

      await expect(loggingService.getInteractionLogs()).rejects.toThrow(
        'Failed to retrieve interaction logs'
      );
    });

    it('should handle invalid log entry data gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockDocs = [
        {
          data: () => ({
            // Missing required input field
            response: { result: 'test' },
            timestamp: { toDate: () => new Date() },
          }),
        },
        {
          data: () => ({
            input: 'Valid input',
            response: { result: 'test' },
            timestamp: { toDate: () => new Date() },
          }),
        },
      ];

      mockSnapshot.forEach.mockImplementation((callback: any) => {
        mockDocs.forEach(callback);
      });

      const logs = await loggingService.getInteractionLogs();

      // Should only return valid entries
      expect(logs).toHaveLength(1);
      expect(logs[0].input).toBe('Valid input');
      
      // Should log error for invalid entry
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse log entry:',
        expect.any(Error),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getInteractionAnalytics method', () => {
    it('should calculate analytics correctly', async () => {
      const mockSnapshot = {
        size: 3,
        forEach: vi.fn(),
      };

      const mockDocs = [
        {
          data: () => ({
            userId: 'user1',
            sessionId: 'session1',
            metadata: {
              provider: 'genkit',
              model: 'gemini-2.0-flash',
              duration: 1000,
            },
          }),
        },
        {
          data: () => ({
            userId: 'user2',
            sessionId: 'session1', // Same session as above
            metadata: {
              provider: 'openrouter',
              model: 'llama-3.1-8b',
              duration: 1500,
            },
          }),
        },
        {
          data: () => ({
            userId: 'user1', // Same user as first
            sessionId: 'session2',
            metadata: {
              provider: 'genkit',
              model: 'gemini-2.0-flash',
              duration: 2000,
            },
          }),
        },
      ];

      // Setup the analytics-specific mock
      mockCollection.get.mockResolvedValue(mockSnapshot);
      mockSnapshot.forEach.mockImplementation((callback: any) => {
        mockDocs.forEach(callback);
      });

      const analytics = await loggingService.getInteractionAnalytics();

      expect(analytics).toEqual({
        totalInteractions: 3,
        uniqueUsers: 2,
        uniqueSessions: 2,
        averageResponseTime: 1500, // (1000 + 1500 + 2000) / 3
        modelUsage: {
          'gemini-2.0-flash': 2,
          'llama-3.1-8b': 1,
        },
        providerUsage: {
          genkit: 2,
          openrouter: 1,
        },
      });
    });

    it('should handle empty results', async () => {
      const mockSnapshot = {
        size: 0,
        forEach: vi.fn(),
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const analytics = await loggingService.getInteractionAnalytics();

      expect(analytics).toEqual({
        totalInteractions: 0,
        uniqueUsers: 0,
        uniqueSessions: 0,
        averageResponseTime: 0,
        modelUsage: {},
        providerUsage: {},
      });
    });

    it('should handle analytics errors', async () => {
      mockCollection.get.mockRejectedValue(new Error('Firestore error'));

      await expect(loggingService.getInteractionAnalytics()).rejects.toThrow(
        'Failed to get interaction analytics'
      );
    });
  });

  describe('Service instance management', () => {
    it('should return singleton instance from getLoggingService', () => {
      const service1 = getLoggingService();
      const service2 = getLoggingService();
      
      expect(service1).toBe(service2);
      expect(service1).toBeInstanceOf(FirestoreLoggingService);
    });
  });

  describe('generateSessionId utility', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});