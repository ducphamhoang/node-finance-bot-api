## Completed Tasks ✅

- ✅ **LLM Abstraction Layer**: Implemented multi-provider LLM system with Genkit and OpenRouter
- ✅ **Intelligent Caching**: Added LRU cache with configurable TTL and size limits
- ✅ **Provider Fallback**: Automatic fallback from Genkit to OpenRouter when primary provider fails
- ✅ **Prompt Refactoring**: Separated prompts into dedicated files with system/user message structure
- ✅ **Comprehensive Testing**: Added extensive test coverage for LLM client, cache, and flows
- ✅ **Error Handling**: Implemented structured error types and retry logic
- ✅ **Provider Health Monitoring**: Added health checks and automatic failover
- ✅ **JSON Response Parsing**: Fixed markdown-wrapped JSON parsing with robust error handling
- ✅ **Enhanced Prompts**: Improved system prompts to request pure JSON responses
- ✅ **Integration Testing**: Added comprehensive tests for response parsing scenarios

## Remaining Tasks 📋

- 🔄 **Production UI Security**: Hide UI on production, return error when browsing API endpoints directly
- 🔄 **Enhanced Authentication**: Ensure Firebase App Check is properly configured for production

Example:
const url = "https://openrouter.ai/api/v1/chat/completions";
const headers = {
  "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json"
};
const payload = {
  "models": [
    "google/gemma-3n-e2b-it",
    "google/gemma-3n-e4b-it"
  ],
  "messages": [
    {
      "role": "system",
      "content": "You are an AI assistant that extracts key details from financial transaction descriptions.
  
  Identify all distinct financial transactions in the provided text. For each transaction, extract the following information:
  - description: A concise description of the transaction.
  - category: The category of the transaction (e.g., groceries, dining, utilities). If you cannot determine the category, and omnibusMode is enabled, use the assignNull tool to assign null.
  - type: The type of transaction (income or expense).
  - amount: The numerical amount of the transaction. If you cannot determine the amount, and omnibusMode is enabled, use the assignNull tool to assign null. When extracting the amount field:
    - If the amount includes 'k' (e.g., 100k), interpret as 100,000.
    - If the amount includes 'm' or 'M' (e.g., 1m, 1M), interpret as 1,000,000.
    - Accept both lowercase and uppercase suffixes.
    - Always return the amount as a number in the response.
  - date: The date of the transaction in ISO format (YYYY-MM-DD). If you cannot determine the date, and omnibusMode is enabled, use the assignNull tool to assign null.
  - merchant: The merchant or business name associated with the transaction (e.g., "Starbucks", "Amazon"). If you cannot determine the merchant, and omnibusMode is enabled, use the assignNull tool to assign null.
  - paymentMethod: The payment method used for the transaction (e.g., credit card, cash, debit card, PayPal). If you cannot determine the payment method, and omnibusMode is enabled, use the assignNull tool to assign null.
  - location: The location where the transaction took place (e.g., "New York", "Online"). If you cannot determine the location, and omnibusMode is enabled, use the assignNull tool to assign null.

  Return the extracted information as a JSON array of objects. Each object in the array should represent a single transaction. If no transactions are found, return an empty array."
    },
    {
      "role": "user",
      "content": "Breakfast at lux68 100k"
    }
  ]
};

const response = await fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify(payload)
});

const data = await response.json();
console.log(data);