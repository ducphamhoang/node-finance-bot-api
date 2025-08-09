# Codebase Documentation

This document provides an overview of the project's codebase, including the application flow, file structure, and key methods.

## Application Flow

The application is a web-based tool that allows users to analyze financial transaction descriptions using AI. The flow is as follows:

1.  **User Input:** The user enters a textual description of a financial transaction on the main page.
2.  **Task Selection:** The user can choose to perform a full analysis or a specific task, such as categorizing the transaction or extracting the amount.
3.  **API Call:** When the user submits the form, the frontend calls a server action (`getTransactionDetails`).
4.  **AI Processing:** The server action invokes a Genkit AI flow (`extractTransactionDetailsFlow`) that uses the Google Gemini model to process the text and extract the relevant details.
5.  **Display Results:** The extracted information is returned to the frontend and displayed to the user.

## File Structure

Here is a breakdown of the key files and directories in the project:

### `src/app/`

*   `page.tsx`: The main entry point of the application. It renders the `FinanceFlow` component.
*   `actions.ts`: Contains the server-side actions that are called from the client. This is the bridge between the frontend and the AI flows.

### `src/components/`

*   `finance-flow.tsx`: The main React component for the user interface. It includes the input form, task selection, and results display.

### `src/ai/`

*   `genkit.ts`: The main configuration file for Genkit. It initializes the Genkit instance with the Google AI plugin and specifies the model to be used.

### `src/ai/flows/`

*   `extract-transaction-details.ts`: Defines the core AI logic for extracting transaction details. It includes:
    *   `extractTransactionDetailsFlow`: The main Genkit flow that takes the transaction text and returns the extracted details.
    *   `extractTransactionDetailsPrompt`: The prompt that is sent to the AI model.
    *   `AssignNullTool`: A Genkit tool that allows the AI to assign `null` to fields that it cannot confidently extract.
*   `handle-missing-transaction-data.ts`: Defines a separate flow for handling missing data, though it is not currently used in the main application flow.

## Key Methods

### `getTransactionDetails(input: ExtractTransactionDetailsInput): Promise<ActionResult>`

*   **File:** `src/app/actions.ts`
*   **Description:** A Next.js server action that serves as the entry point for the AI processing. It calls the `extractTransactionDetails` flow and returns the result to the client.

### `extractTransactionDetails(input: ExtractTransactionDetailsInput): Promise<ExtractTransactionDetailsOutput>`

*   **File:** `src/ai/flows/extract-transaction-details.ts`
*   **Description:** The main function that orchestrates the transaction detail extraction process. It calls the `extractTransactionDetailsFlow`.

### `extractTransactionDetailsFlow`

*   **File:** `src/ai/flows/extract-transaction-details.ts`
*   **Description:** A Genkit flow that takes the user's input and uses a prompt to the AI model to extract the transaction details. It can be customized to perform specific tasks.
