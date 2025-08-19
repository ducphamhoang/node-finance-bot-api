# Codebase Documentation

This document provides an overview of the project's codebase, including the application flow, file structure, and key methods.

## Application Flow

The application is a web-based tool that allows users to analyze financial transaction descriptions using AI. The flow is as follows:

1.  **User Input:** The user enters a textual description of one or more financial transactions on the main page.
2.  **Task Selection:** The user can choose to perform a full analysis or a specific task (e.g., categorize, get amount). This is more effective when the input text contains a single transaction.
3.  **API Call:** When the user submits the form, the frontend calls a server action (`getTransactionDetails`).
4.  **AI Processing:** The server action invokes the `extractTransactionDetails` function which uses the new LLM abstraction layer to process the text. The system automatically handles provider selection, fallback, caching, and error handling.
5.  **Display Results:** The extracted information, now an array of transaction objects, is returned to the frontend and displayed to the user.

## LLM Architecture

The application now features a sophisticated LLM abstraction layer with the following components:

- **Multi-Provider Support:** Primary provider (Genkit/Google AI) with automatic fallback to OpenRouter
- **Intelligent Caching:** LRU cache with configurable TTL and size limits to reduce API calls
- **Error Handling:** Comprehensive error types and automatic retry logic
- **Provider Health Monitoring:** Automatic provider health checks and failover
- **Robust Response Parsing:** Handles markdown-wrapped JSON responses and malformed content gracefully

## File Structure

Here is a breakdown of the key files and directories in the project:

### `src/app/`

*   `page.tsx`: The main entry point of the application. It renders the `FinanceFlow` component.
*   `actions.ts`: Contains the server-side actions that are called from the client. This is the bridge between the frontend and the AI flows.

### `src/app/api/v1/transactions/`

*   `extract/route.ts`: The main API endpoint for all-in-one and selective field extraction. Handles `POST` requests, authentication, validation, and calls the `getTransactionDetails` action.
*   `extract/[field]/route.ts`: A dynamic API route for extracting a single, specific field from a transaction description.

### `src/components/`

*   `finance-flow.tsx`: The main React component for the user interface. It includes the input form, task selection, and renders a list of results for multiple transactions.

### `src/ai/`

*   `genkit.ts`: Legacy Genkit configuration (maintained for backward compatibility).
*   `dev.ts`: Development utilities for AI flows.

### `src/ai/llm/`

*   `index.ts`: Main exports for the LLM abstraction layer, including the default client instance.
*   `client.ts`: The `LLMClient` class that orchestrates multiple providers, handles fallback logic, caching, and error handling.
*   `cache.ts`: `LLMCache` implementation with LRU caching, TTL support, and metrics tracking.
*   `types.ts`: TypeScript interfaces and error classes for the LLM system.

### `src/ai/llm/providers/`

*   `genkit.ts`: Genkit provider implementation that wraps Google AI/Gemini models.
*   `openrouter.ts`: OpenRouter provider implementation for fallback support with multiple open-source models.

### `src/ai/flows/`

*   `extract-transaction-details.ts`: Core transaction extraction logic using the new LLM client.
    *   `extractTransactionDetails`: Main function that processes transaction text and returns structured data.
    *   `parseAndValidateResponse`: Enhanced JSON parsing with markdown code block handling.
    *   `cleanJsonResponse`: Utility function to extract JSON from markdown-wrapped responses.
    *   `SingleTransactionSchema`: Zod schema for individual transactions with 8 fields.
    *   `ExtractTransactionDetailsOutputSchema`: Schema for arrays of transactions.
*   `handle-missing-transaction-data.ts`: Specialized flow for handling incomplete transaction data.

### `src/ai/prompts/`

*   `extract-transaction-details.ts`: Prompt templates and message builders for transaction extraction.
*   `handle-missing-transaction-data.ts`: Prompt templates for handling missing transaction fields.

### `src/lib/`

*   `auth/verifyAppCheck.ts`: Contains the logic for verifying Firebase App Check tokens to authenticate API requests.
*   `errors.ts`: Implements a structured error handling system using RFC 7807 Problem Details for HTTP APIs.
*   `validation.ts`: Provides Zod schemas and utility functions for validating API requests.

## Key Methods

### `getTransactionDetails(input: ExtractTransactionDetailsInput): Promise<ActionResult>`

*   **File:** `src/app/actions.ts`
*   **Description:** A Next.js server action that serves as the entry point for the AI processing. It calls the `extractTransactionDetails` function and returns the result (an array of transactions) to the client or API handler.

### `extractTransactionDetails(input: ExtractTransactionDetailsInput): Promise<ExtractTransactionDetailsOutput>`

*   **File:** `src/ai/flows/extract-transaction-details.ts`
*   **Description:** The main function for extracting transaction details. Uses the LLM client to process transaction text and returns structured data. Includes task-specific filtering and response validation.

### `handleMissingTransactionData(input: HandleMissingTransactionDataInput): Promise<HandleMissingTransactionDataOutput>`

*   **File:** `src/ai/flows/handle-missing-transaction-data.ts`
*   **Description:** Specialized function for handling incomplete transaction data. Intelligently fills in missing fields or assigns null values when data cannot be reasonably inferred.

### `LLMClient.call(messages: LLMMessage[], options?: LLMCallOptions): Promise<LLMResponse>`

*   **File:** `src/ai/llm/client.ts`
*   **Description:** The core method of the LLM abstraction layer. Handles provider selection, automatic fallback, caching, retry logic, and error handling. Returns structured responses with metadata.

### `buildExtractTransactionDetailsMessages(input: ExtractTransactionDetailsPromptInput): LLMMessage[]`

*   **File:** `src/ai/prompts/extract-transaction-details.ts`
*   **Description:** Builds structured message arrays for LLM communication, including system prompts and user prompts with proper formatting and context.