# Core Extraction APIs Implementation

This document outlines the implementation of the Core Extraction APIs for the Finance Bot. The API is designed to extract details from a text description containing one or more financial transactions.

## Available Fields

The API supports extraction of the following 8 fields based on the `SingleTransactionSchema`:

- **description**: The description of the transaction (string)
- **category**: The category of the transaction (string, nullable)
- **type**: The type of transaction (string, e.g., "income", "expense")
- **amount**: The amount of the transaction (number, nullable)
- **date**: The date of the transaction in ISO format YYYY-MM-DD (string, nullable)
- **merchant**: The merchant or business name (string, nullable)
- **paymentMethod**: The payment method used (string, nullable)
- **location**: The location of the transaction (string, nullable)

## Dependencies

The implementation requires the following additional dependencies:

- **firebase-admin**: For server-side Firebase App Check token verification.
- **vitest**: Modern test runner for comprehensive API testing.
- **@vitest/ui**: Optional UI for test visualization.
- **next-test-api-route-handler**: Helper for testing Next.js App Router API routes.

## 1. The All-in-One Extraction API

This is the base API that provides the full extraction functionality for multiple transactions.

**Endpoint:** `POST /api/v1/transactions/extract`

**Request Body:**

```json
{
  "text": "Transaction description(s) go here"
}
```

**Response Body:**

An array of `SingleTransactionSchema` objects. Each object represents a single extracted transaction.

```json
[
  {
    "description": "Coffee with Sarah",
    "category": "Dining",
    "type": "expense",
    "amount": 5.50,
    "date": "2025-08-18",
    "merchant": "Blue Bottle Cafe",
    "paymentMethod": "credit card",
    "location": null
  }
]
```

## 2. The Selective Extraction API

This extends the All-in-One API to allow consumers to select specific fields.

**Endpoint:** `POST /api/v1/transactions/extract` (same endpoint)

**Request Body:**

```json
{
  "text": "Transaction description(s) go here",
  "fields": ["category", "amount"]
}
```

The `fields` property is optional. If it's not provided, the API will return the full objects as in the All-in-One API.

**Response Body:**

An array of partial `SingleTransactionSchema` objects containing only the requested fields.

```json
[
  {
    "category": "Dining",
    "amount": 5.50
  }
]
```

## 3. The Field-Specific API

This is a dedicated endpoint for extracting a single, specific field for one or more transactions.

**Endpoint:** `POST /api/v1/transactions/extract/[field]`

Where `[field]` is one of the 8 available fields (e.g., `description`, `category`, `type`, `amount`, `date`, `merchant`, `paymentMethod`, `location`).

**Request Body:**

```json
{
  "text": "Transaction description(s) go here"
}
```

**Response Body:**

An array of objects, each containing only the requested field.

**Example for `/api/v1/transactions/extract/category`:**

```json
[
  {
    "category": "dining"
  }
]
```

## 4. Authentication

For production, we use **Firebase App Check** to ensure that requests are coming from a trusted application. For debugging and development, we have a toggle to disable authentication.

**Environment Variable for Debug Mode:**

*   `API_DEBUG_MODE_ENABLED`: Set to `true` to bypass authentication.

**Authentication Logic:**

1.  Check the value of the `API_DEBUG_MODE_ENABLED` environment variable.
2.  If `true`, bypass all authentication checks.
3.  If `false` or not set, get the App Check token from the `X-Firebase-AppCheck` header.
4.  Verify the token using the Firebase Admin SDK.
5.  If the token is invalid or missing, return a `401 Unauthorized` error.

## 5. Test Cases Outline

Here is a brief outline of the test cases for the API.

### Happy Path

*   **Test Case:** A valid request with a valid App Check token (or in debug mode).
*   **Expected Result:** A `200 OK` response with an array of correctly extracted transaction data.
*   **Test Case:** Input text with multiple transactions.
*   **Expected Result:** A `200 OK` response with an array containing multiple transaction objects.

### Authentication Errors

*   **Test Case:** A request without an App Check token (and not in debug mode).
*   **Expected Result:** A `401 Unauthorized` error.
*   **Test Case:** A request with an invalid or expired App Check token.
*   **Expected Result:** A `401 Unauthorized` error.

### Input Errors

*   **Test Case:** A request with a missing or empty `text` field in the body.
*   **Expected Result:** A `400 Bad Request` error.
*   **Test Case:** A request where the `text` exceeds the token limit.
*   **Expected Result:** A `413 Content Too Large` or `400 Bad Request` error.

### Selective and Field-Specific APIs

*   **Test Case:** A request to the main endpoint with the `fields` parameter.
*   **Expected Result:** A `200 OK` response with an array of objects containing only the specified fields.
*   **Test Case:** A request to a field-specific endpoint (e.g., `/api/v1/transactions/extract/category`).
*   **Expected Result:** A `200 OK` response with an array of objects containing only the `category` field.
*   **Test Case:** A request to an invalid field-specific endpoint (e.g., `/api/v1/transactions/extract/invalidField`).
*   **Expected Result:** A `404 Not Found` error.
