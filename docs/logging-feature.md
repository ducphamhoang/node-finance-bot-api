# Firestore Logging Feature

This document describes the Firestore logging feature for capturing user interactions with the LLM services in FinanceFlow AI.

## Overview

The logging feature automatically captures every user input and corresponding LLM response in Firestore, providing structured data for analytics, debugging, and user experience monitoring.

## Architecture

### Core Components

1. **FirestoreLoggingService** (`src/lib/logging/firestore.ts`)
   - Main service class for logging interactions
   - Handles Firestore operations and error management
   - Provides analytics and retrieval capabilities

2. **Enhanced Extraction Functions** (`src/ai/flows/extract-transaction-details.ts`)
   - `extractTransactionDetailsWithLogging()` - New function that includes logging
   - Non-blocking logging integration
   - Automatic error interaction capture

3. **Type Safety** (`src/lib/logging/firestore.ts`)
   - Zod schema validation for log entries
   - TypeScript interfaces for type safety
   - Comprehensive error handling

## Data Structure

### Log Entry Schema

```typescript
interface LogEntry {
  userId?: string;          // Firebase Auth user ID (optional)
  sessionId?: string;       // Session ID for anonymous users
  input: string;            // User input text
  response: any;            // LLM response data
  timestamp: Date;          // When the interaction occurred
  metadata?: {
    provider?: string;      // LLM provider used (e.g., 'genkit', 'openrouter')
    model?: string;         // Model name (e.g., 'gemini-2.0-flash')
    duration?: number;      // Processing time in milliseconds
    tokens?: number;        // Token count in response
    cached?: boolean;       // Whether response was cached
    error?: boolean;        // Whether this was an error interaction
  };
}
```

### Firestore Collection

- **Collection Name:** `llm_interactions`
- **Document Structure:** Auto-generated document IDs with log entry data
- **Indexes:** Automatic indexing on `userId`, `sessionId`, `timestamp`, `createdAt`

## Usage

### Basic Integration

```typescript
import { extractTransactionDetailsWithLogging } from '@/ai/flows/extract-transaction-details';

// With authenticated user
const result = await extractTransactionDetailsWithLogging(
  { text: "Coffee at Starbucks for $5.50" },
  { userId: "user123", sessionId: "session456" }
);

// With anonymous user (auto-generates session ID)
const result = await extractTransactionDetailsWithLogging(
  { text: "Coffee at Starbucks for $5.50" }
);
```

### Direct Logging Service

```typescript
import { getLoggingService } from '@/lib/logging';

const logger = getLoggingService();

// Log an interaction
await logger.logInteraction({
  userId: 'user123',
  input: 'User input text',
  response: { extractedData: 'response' },
  metadata: {
    provider: 'genkit',
    duration: 1500,
  },
});

// Retrieve logs
const logs = await logger.getInteractionLogs({
  userId: 'user123',
  limit: 10,
});

// Get analytics
const analytics = await logger.getInteractionAnalytics({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});
```

## Privacy and Security

### User Identification

- **Authenticated Users:** Uses Firebase Auth `userId`
- **Anonymous Users:** Generates unique `sessionId` for tracking
- **Optional Tracking:** All user identification is optional

### Data Protection

- **Error Isolation:** Logging failures don't affect main application flow
- **Non-blocking:** Logging operations are asynchronous and non-blocking
- **Input Sanitization:** Zod schema validation ensures data integrity
- **Access Control:** Firestore security rules control data access

### Security Best Practices

```typescript
// ❌ Avoid logging sensitive data
await logger.logInteraction({
  input: 'My password is 123456',  // Don't do this
  // ...
});

// ✅ Log transaction-related data only
await logger.logInteraction({
  input: 'Coffee purchase for $5.50',  // Safe to log
  // ...
});
```

## Analytics and Monitoring

### Available Metrics

```typescript
const analytics = await logger.getInteractionAnalytics();
// Returns:
// {
//   totalInteractions: 1500,
//   uniqueUsers: 320,
//   uniqueSessions: 450,
//   averageResponseTime: 1200,
//   modelUsage: {
//     'gemini-2.0-flash': 800,
//     'llama-3.1-8b': 700
//   },
//   providerUsage: {
//     'genkit': 800,
//     'openrouter': 700
//   }
// }
```

### Filtering Options

```typescript
// Filter by user
const userLogs = await logger.getInteractionLogs({
  userId: 'user123',
  limit: 50
});

// Filter by date range
const recentLogs = await logger.getInteractionLogs({
  startAfter: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  limit: 100
});

// Filter by session
const sessionLogs = await logger.getInteractionLogs({
  sessionId: 'session_456',
});
```

## Error Handling

### Graceful Degradation

The logging system is designed to never interfere with the main application:

```typescript
// Logging errors are caught and logged but don't throw
try {
  await logger.logInteraction(invalidData);
} catch (error) {
  // This will never throw - errors are handled internally
  console.log('This line will always execute');
}
```

### Error Logging

Failed interactions are also logged for debugging:

```typescript
// When LLM call fails, we still log the interaction
{
  input: 'User input',
  response: { error: 'LLM provider failed' },
  metadata: { error: true, duration: 1000 }
}
```

## Configuration

### Environment Variables

No additional environment variables are required. The logging service uses the existing Firebase Admin SDK configuration:

- `FIREBASE_PROJECT_ID` - Required for Firestore access
- `FIREBASE_CLIENT_EMAIL` - Service account email (optional)
- `FIREBASE_PRIVATE_KEY` - Service account private key (optional)

### Firestore Setup

Ensure your Firestore database has appropriate security rules:

```javascript
// Example Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read their own logs
    match /llm_interactions/{document} {
      allow read: if request.auth != null && 
                  resource.data.userId == request.auth.uid;
      
      // Allow service account to write logs
      allow write: if request.auth.token.firebase.sign_in_provider == 'custom';
    }
  }
}
```

## Testing

The logging feature includes comprehensive unit tests:

```bash
# Run logging service tests
npm test -- tests/lib/logging/firestore.test.ts

# Run extraction with logging tests
npm test -- tests/ai/flows/extract-transaction-details-logging.test.ts
```

### Test Coverage

- ✅ Schema validation tests
- ✅ Logging functionality tests
- ✅ Error handling tests
- ✅ Analytics calculation tests
- ✅ Integration with extraction flow tests
- ✅ Mock Firestore tests (no real database writes)

## Performance Considerations

### Async Operations

All logging operations are asynchronous and non-blocking:

```typescript
// This doesn't wait for logging to complete
const result = await extractTransactionDetailsWithLogging(input);
// Result is returned immediately, logging happens in background
```

### Caching Impact

Logging metadata includes cache information for performance monitoring:

```typescript
{
  metadata: {
    cached: true,    // Response was served from cache
    duration: 50,    // Much faster due to cache hit
    tokens: 150      // Token count from cached response
  }
}
```

## Troubleshooting

### Common Issues

1. **Firestore Connection Errors**
   ```bash
   Error: Failed to log interaction to Firestore: Connection timeout
   ```
   - Check Firebase project configuration
   - Verify service account credentials
   - Ensure Firestore is enabled in Firebase project

2. **Permission Errors**
   ```bash
   Error: Missing or insufficient permissions
   ```
   - Check Firestore security rules
   - Verify service account has Firestore write permissions

3. **Schema Validation Errors**
   ```bash
   Error: Invalid log entry: input is required
   ```
   - Ensure all required fields are provided
   - Check data types match schema requirements

### Debug Mode

Enable detailed logging in development:

```typescript
// Enable debug logging
process.env.FIRESTORE_LOGGING_DEBUG = 'true';
```

## Future Enhancements

Potential improvements to consider:

1. **Batch Logging** - Buffer multiple interactions for batch writes
2. **Data Retention** - Automatic cleanup of old log entries
3. **Real-time Analytics** - Live dashboard for monitoring
4. **Export Functionality** - Export logs for external analysis
5. **Advanced Filtering** - Full-text search on interactions
6. **Performance Metrics** - Detailed performance monitoring

## API Reference

See the TypeScript interfaces in `src/lib/logging/firestore.ts` for complete API documentation with JSDoc comments.