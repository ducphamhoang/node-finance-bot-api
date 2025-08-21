/**
 * @fileOverview Logging utilities for FinanceFlow AI
 * 
 * This module provides logging capabilities for user interactions with LLM services.
 * It includes Firestore integration for persistent storage, analytics, and retrieval.
 */

export {
  FirestoreLoggingService,
  getLoggingService,
  generateSessionId,
  LogEntrySchema,
  type LogEntry,
  type LoggingService,
} from './firestore';

// Re-export commonly used functions for convenience
export { getLoggingService as getLogger } from './firestore';