# Codebase Documentation

This document provides an overview of the project's codebase, including the application flow, file structure, and key methods.

## Application Flow

The application is a web-based tool that allows users to analyze financial transaction descriptions using AI. The flow is as follows:

1.  **User Input:** The user enters a textual description of one or more financial transactions on the main page.
2.  **Task Selection:** The user can choose to perform a full analysis or a specific task (e.g., categorize, get amount). This is more effective when the input text contains a single transaction.
3.  **API Call:** When the user submits the form, the frontend calls a server action (`getTransactionDetails`).
4.  **AI Processing:** The server action invokes a Genkit AI flow (`extractTransactionDetailsFlow`) that uses the Google Gemini model to process the text and extract details for all identified transactions.
5.  **Display Results:** The extracted information, now an array of transaction objects, is returned to the frontend and displayed to the user.

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

*   `genkit.ts`: The main configuration file for Genkit. It initializes the Genkit instance with the Google AI plugin and specifies the model to be used.

### `src/ai/flows/`

*   `extract-transaction-details.ts`: Defines the core AI logic for extracting transaction details.
    *   `extractTransactionDetailsFlow`: The main Genkit flow that takes the transaction text and returns an array of extracted transaction objects.
    *   `SingleTransactionSchema`: The Zod schema for a single transaction, which includes 8 fields: `description`, `category`, `type`, `amount`, `date`, `merchant`, `paymentMethod`, and `location`.
    *   `ExtractTransactionDetailsOutputSchema`: The Zod schema for the flow's output, defined as an array of `SingleTransactionSchema`.
    *   `AssignNullTool`: A Genkit tool that allows the AI to assign `null` to fields that it cannot confidently extract.

### `src/lib/`

*   `auth/verifyAppCheck.ts`: Contains the logic for verifying Firebase App Check tokens to authenticate API requests.
*   `errors.ts`: Implements a structured error handling system using RFC 7807 Problem Details for HTTP APIs.
*   `validation.ts`: Provides Zod schemas and utility functions for validating API requests.

## Key Methods

### `getTransactionDetails(input: ExtractTransactionDetailsInput): Promise<ActionResult>`

*   **File:** `src/app/actions.ts`
*   **Description:** A Next.js server action that serves as the entry point for the AI processing. It calls the `extractTransactionDetails` flow and returns the result (an array of transactions) to the client or API handler.

### `extractTransactionDetailsFlow`

*   **File:** `src/ai/flows/extract-transaction-details.ts`
*   **Description:** A Genkit flow that takes the user's input and uses a prompt to the AI model to extract details for all identifiable transactions. It returns an array of transaction objects.