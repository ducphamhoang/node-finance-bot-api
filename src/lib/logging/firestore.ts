import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';
import { z } from 'zod';

/**
 * Schema for logging entry in Firestore
 */
export const LogEntrySchema = z.object({
  userId: z.string().optional().describe('User ID from Firebase Auth (optional for anonymous users)'),
  sessionId: z.string().optional().describe('Session ID for tracking anonymous users'),
  input: z.string().describe('The user input text'),
  response: z.any().describe('The LLM response data'),
  timestamp: z.date().describe('When the interaction occurred'),
  metadata: z.object({
    model: z.string().optional().describe('LLM model used'),
    provider: z.string().optional().describe('LLM provider used'),
    duration: z.number().optional().describe('Processing duration in milliseconds'),
    tokens: z.number().optional().describe('Number of tokens in response'),
    cached: z.boolean().optional().describe('Whether response was served from cache'),
    error: z.boolean().optional().describe('Whether this was an error interaction'),
    tokenUsage: z.object({
      input: z.number().optional(),
      output: z.number().optional(),
      total: z.number().optional(),
    }).optional().describe('Token usage information'),
  }).optional().describe('Additional metadata about the request'),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

/**
 * Interface for the logging service
 */
export interface LoggingService {
  logInteraction(entry: Omit<LogEntry, 'timestamp'>): Promise<void>;
  getInteractionLogs(options?: {
    userId?: string;
    sessionId?: string;
    limit?: number;
    startAfter?: Date;
    endBefore?: Date;
  }): Promise<LogEntry[]>;
}

/**
 * Firestore-based logging service implementation
 */
export class FirestoreLoggingService implements LoggingService {
  private db: FirebaseFirestore.Firestore;
  private collectionName = 'llm_interactions';

  constructor() {
    this.db = getFirestore(getFirebaseAdmin());
  }

  /**
   * Log a user interaction with the LLM
   */
  async logInteraction(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    try {
      // Validate the entry
      const validatedEntry = LogEntrySchema.parse({
        ...entry,
        timestamp: new Date(),
      });

      // Prepare the document data
      const docData = {
        ...validatedEntry,
        timestamp: validatedEntry.timestamp,
        // Add indexing fields for efficient querying
        ...(validatedEntry.userId && { userId: validatedEntry.userId }),
        ...(validatedEntry.sessionId && { sessionId: validatedEntry.sessionId }),
        createdAt: validatedEntry.timestamp, // Alias for better querying
      };

      // Add to Firestore collection
      await this.db.collection(this.collectionName).add(docData);
    } catch (error) {
      // Log error but don't throw to avoid disrupting the main flow
      console.error('Failed to log interaction to Firestore:', error);
      // Could add additional error reporting here (e.g., to monitoring service)
    }
  }

  /**
   * Retrieve interaction logs with optional filtering
   */
  async getInteractionLogs(options: {
    userId?: string;
    sessionId?: string;
    limit?: number;
    startAfter?: Date;
    endBefore?: Date;
  } = {}): Promise<LogEntry[]> {
    try {
      let query: FirebaseFirestore.Query = this.db.collection(this.collectionName);

      // Apply filters
      if (options.userId) {
        query = query.where('userId', '==', options.userId);
      }
      
      if (options.sessionId) {
        query = query.where('sessionId', '==', options.sessionId);
      }

      if (options.startAfter) {
        query = query.where('timestamp', '>', options.startAfter);
      }

      if (options.endBefore) {
        query = query.where('timestamp', '<', options.endBefore);
      }

      // Order by timestamp (most recent first)
      query = query.orderBy('timestamp', 'desc');

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      const logs: LogEntry[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        try {
          // Convert Firestore timestamp back to Date
          const entry = {
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(data.timestamp),
          };
          
          // Validate the entry
          const validatedEntry = LogEntrySchema.parse(entry);
          logs.push(validatedEntry);
        } catch (error) {
          console.error('Failed to parse log entry:', error, data);
        }
      });

      return logs;
    } catch (error) {
      console.error('Failed to retrieve interaction logs:', error);
      throw new Error('Failed to retrieve interaction logs');
    }
  }

  /**
   * Get analytics about user interactions
   */
  async getInteractionAnalytics(options: {
    userId?: string;
    sessionId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    totalInteractions: number;
    uniqueUsers: number;
    uniqueSessions: number;
    averageResponseTime: number;
    modelUsage: Record<string, number>;
    providerUsage: Record<string, number>;
  }> {
    try {
      let query: FirebaseFirestore.Query = this.db.collection(this.collectionName);

      // Apply date filters
      if (options.startDate) {
        query = query.where('timestamp', '>=', options.startDate);
      }
      
      if (options.endDate) {
        query = query.where('timestamp', '<=', options.endDate);
      }

      const snapshot = await query.get();
      
      const uniqueUsers = new Set<string>();
      const uniqueSessions = new Set<string>();
      const modelUsage: Record<string, number> = {};
      const providerUsage: Record<string, number> = {};
      let totalDuration = 0;
      let durationCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.userId) uniqueUsers.add(data.userId);
        if (data.sessionId) uniqueSessions.add(data.sessionId);
        
        if (data.metadata?.model) {
          modelUsage[data.metadata.model] = (modelUsage[data.metadata.model] || 0) + 1;
        }
        
        if (data.metadata?.provider) {
          providerUsage[data.metadata.provider] = (providerUsage[data.metadata.provider] || 0) + 1;
        }
        
        if (data.metadata?.duration) {
          totalDuration += data.metadata.duration;
          durationCount++;
        }
      });

      return {
        totalInteractions: snapshot.size,
        uniqueUsers: uniqueUsers.size,
        uniqueSessions: uniqueSessions.size,
        averageResponseTime: durationCount > 0 ? totalDuration / durationCount : 0,
        modelUsage,
        providerUsage,
      };
    } catch (error) {
      console.error('Failed to get interaction analytics:', error);
      throw new Error('Failed to get interaction analytics');
    }
  }
}

/**
 * Default logging service instance
 */
let loggingService: LoggingService | null = null;

/**
 * Get the default logging service instance
 */
export function getLoggingService(): LoggingService {
  if (!loggingService) {
    loggingService = new FirestoreLoggingService();
  }
  return loggingService;
}

/**
 * Utility function to create a session ID for anonymous users
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}