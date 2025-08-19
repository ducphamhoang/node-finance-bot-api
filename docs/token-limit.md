# Future Implementation: Token Limiting and Calculation

This document outlines a plan to measure the number of tokens in a user's input, enforce limits, and log this information for debugging and future pricing models.

**Status:** This is a proposed feature and has **not yet been implemented**.

## Objective

The primary goal is to control the length of the user's input to prevent excessive API usage and potential abuse. This also lays the groundwork for implementing a usage-based pricing model in the future.

## Implementation Plan

The implementation will be done on both the server and the client side to provide immediate feedback to the user and enforce the limit on the backend. We will use the `@lenml/tokenizer-gemini` library, which is a lightweight tokenizer for Gemini models that works in both environments.

### Steps:

1.  **Install the library:**
    ```bash
npm install @lenml/tokenizer-gemini
```

2.  **Server-Side (`src/app/actions.ts`):**
    *   Import and initialize the tokenizer.
    *   Define a `TOKEN_LIMIT` constant.
    *   In the `getTransactionDetails` action, before calling the AI flow, count the tokens in the input text.
    *   Log the token count for debugging.
    *   If the token count exceeds the limit, return a `413 Content Too Large` error.

3.  **Client-Side (`src/components/finance-flow.tsx`):**
    *   Import and initialize the tokenizer.
    *   Keep track of the token count in the component's state.
    *   Update the token count whenever the user types in the textarea.
    *   Display the current token count to the user (e.g., `150 / 250 tokens`).
    *   Disable the submit button if the token count exceeds the limit to prevent unnecessary server requests.

## Future Considerations

*   **Monitoring:** Use the `@genkit-ai/firebase` plugin to enable Firebase Telemetry for monitoring token usage in production. This will provide valuable insights for debugging and cost analysis.
*   **Pricing:** The token count can be stored and associated with a user account to calculate billing based on usage.
*   **Configuration:** The `TOKEN_LIMIT` could be stored in a central configuration file or as an environment variable to make it easier to manage.
*   **Dynamic Limits:** For different user tiers (e.g., free, pro), you could implement different token limits.
