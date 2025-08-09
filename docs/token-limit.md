# Token Limiting and Calculation Plan

This document outlines a plan to measure the number of tokens in a user's input, enforce limits, and log this information for debugging and future pricing models.

## Objective

The primary goal is to control the length of the user's input to prevent excessive API usage and potential abuse. This also lays the groundwork for implementing a usage-based pricing model in the future.

## 1. Server-Side Implementation

The server-side implementation will be done in the `src/app/actions.ts` file. We will use the `@lenml/tokenizer-gemini` library to get an accurate token count before processing the request.

### Steps:

1.  **Install the library:**
    ```bash
    npm install @lenml/tokenizer-gemini
    ```
2.  **Import the tokenizer:** Import the `fromPreTrained` function from `@lenml/tokenizer-gemini`.
3.  **Define Token Limit:** Create a constant for the maximum number of tokens allowed.
4.  **Count Tokens:** In the `getTransactionDetails` action, before calling the AI flow, use the tokenizer to count the tokens in the input text.
5.  **Log the Count:** Use `console.log` to record the token count for debugging purposes.
6.  **Enforce Limit:** If the token count exceeds the defined limit, return an error message.

### Code Example for `src/app/actions.ts`:

```typescript
'use server';

import {
  extractTransactionDetails,
  type ExtractTransactionDetailsInput,
  type ExtractTransactionDetailsOutput,
} from '@/ai/flows/extract-transaction-details';
import { fromPreTrained } from '@lenml/tokenizer-gemini';

export type ActionResult = {
  error?: string;
  data?: ExtractTransactionDetailsOutput | null;
};

const TOKEN_LIMIT = 250;
const tokenizer = fromPreTrained();

export async function getTransactionDetails(
  input: ExtractTransactionDetailsInput
): Promise<ActionResult> {
  try {
    const tokens = tokenizer.encode(input.text);
    const totalTokens = tokens.length;
    console.log(`Token count for the input: ${totalTokens}`);

    if (totalTokens > TOKEN_LIMIT) {
      return {
        error: `Input exceeds the maximum of ${TOKEN_LIMIT} tokens. Please shorten your text.`,
      };
    }

    const result = await extractTransactionDetails(input);
    return { data: result };
  } catch (e: any) {
    console.error('Error in getTransactionDetails action:', e);
    return { error: e.message || 'An unexpected error occurred.' };
  }
}
```

## 2. Client-Side Implementation

To provide immediate feedback to the user, we should also perform a token count on the client-side. This will prevent users from submitting requests that will be rejected by the server.

We will use the `@lenml/tokenizer-gemini` library, which is a lightweight, client-side tokenizer for Gemini models.

### Steps:

1.  **Install the library:**

    ```bash
    npm install @lenml/tokenizer-gemini
    ```

2.  **Update the component:** In `src/components/finance-flow.tsx`, we will:
    *   Import the tokenizer.
    *   Keep track of the token count in the component's state.
    *   Update the token count whenever the user types in the textarea.
    *   Display the token count to the user.
    *   Disable the submit button if the token count exceeds the limit.

### Code Example for `src/components/finance-flow.tsx`:

```typescript
// ... (imports)
import { fromPreTrained } from '@lenml/tokenizer-gemini';

const TOKEN_LIMIT = 250;
const tokenizer = fromPreTrained();

export function FinanceFlow() {
  const [text, setText] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  // ... (other state variables)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    const tokens = tokenizer.encode(newText);
    setTokenCount(tokens.length);
  };

  // ... (handleSubmit function)

  return (
    // ... (rest of the component)
    <Textarea
      // ... (other props)
      value={text}
      onChange={handleTextChange}
    />
    <p className="text-xs text-muted-foreground">
      {tokenCount} / {TOKEN_LIMIT} tokens
    </p>
    // ... (rest of the component)
    <Button 
      type="submit" 
      className="w-full" 
      disabled={loading || !text.trim() || tokenCount > TOKEN_LIMIT}
    >
      {/* ... */}
    </Button>
    // ... (rest of the component)
  );
}
```

## 3. Future Considerations

*   **Monitoring:** Use the `@genkit-ai/firebase` plugin to enable Firebase Telemetry for monitoring token usage in production. This will provide valuable insights for debugging and cost analysis.
*   **Pricing:** The token count can be stored and associated with a user account to calculate billing based on usage.
*   **Configuration:** The `TOKEN_LIMIT` could be stored in a central configuration file or as an environment variable to make it easier to manage.
*   **Dynamic Limits:** For different user tiers (e.g., free, pro), you could implement different token limits.