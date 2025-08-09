# Core Extraction APIs Implementation Plan

This document outlines the plan to implement the Core Extraction APIs for the Finance Bot.

## 1. Foundation: The All-in-One Extraction API

This will be the base API that provides the full extraction functionality.

**Endpoint:** `POST /api/v1/transactions/extract`

**Request Body:**

```json
{
  "text": "Transaction description goes here"
}
```

**Response Body:**

The full `ExtractTransactionDetailsOutput` object, containing all extracted fields.

**Implementation Steps:**

1.  Create the API route file at `src/app/api/v1/transactions/extract/route.ts`.
2.  In this file, implement the `POST` handler.
3.  The handler will read the `text` from the request body.
4.  It will perform an authentication check (see the Authentication section below).
5.  If the request is authenticated, it will call the `getTransactionDetails` action from `src/app/actions.ts`.
6.  The result from the action will be returned as a JSON response.

## 2. Enhancement: The Selective Extraction API

This will extend the All-in-One API to allow consumers to select specific fields.

**Endpoint:** `POST /api/v1/transactions/extract` (same endpoint)

**Request Body:**

```json
{
  "text": "Transaction description goes here",
  "fields": ["merchant", "amount"]
}
```

The `fields` property is optional. If it's not provided, the API will return the full object as in the All-in-One API.

**Response Body:**

A partial `ExtractTransactionDetailsOutput` object containing only the requested fields.

**Implementation Steps:**

1.  Modify the `POST` handler in `src/app/api/v1/transactions/extract/route.ts`.
2.  After getting the result from `getTransactionDetails`, check if the request body contains a `fields` array.
3.  If it does, filter the result object to include only the keys specified in the `fields` array.
4.  Return the filtered (or full) object as the JSON response.

## 3. Specialization: The Field-Specific APIs

These will be dedicated endpoints for extracting a single, specific field. They will be simple wrappers around the Selective Extraction API.

**Endpoints:**

*   `POST /api/v1/transactions/extract/merchant`
*   `POST /api/v1/transactions/extract/amount`
*   `POST /api/v1/transactions/extract/category`
*   `POST /api/v1/transactions/extract/date`
*   ... (and so on for other extractable fields)

**Request Body:**

```json
{
  "text": "Transaction description goes here"
}
```

**Response Body:**

```json
{
  "merchant": "Example Merchant"
}
```

**Implementation Steps:**

1.  Create a new route file for each field-specific endpoint (e.g., `src/app/api/v1/transactions/extract/merchant/route.ts`).
2.  In each route's `POST` handler, implement the same authentication logic.
3.  Instead of calling `getTransactionDetails` directly, the handler will call the logic of our All-in-One/Selective API, hardcoding the `fields` parameter to the specific field for that route (e.g., `fields: ["merchant"]`).
4.  This approach promotes code reuse and keeps the field-specific endpoints lightweight.

## 4. Authentication

For production, we will use **Firebase App Check** to ensure that requests are coming from a trusted application. For debugging and development, we will have a toggle to disable authentication.

**Environment Variable for Debug Mode:**

*   `API_DEBUG_MODE_ENABLED`: Set to `true` to bypass authentication.

**Authentication Logic:**

1.  Check the value of the `API_DEBUG_MODE_ENABLED` environment variable.
2.  If `true`, bypass all authentication checks.
3.  If `false` or not set, get the App Check token from the `X-Firebase-AppCheck` header.
4.  Verify the token using the Firebase Admin SDK.
5.  If the token is invalid or missing, return a `401 Unauthorized` error.

## 5. Test Cases

Here is a brief outline of the test cases we should cover for the API.

### Happy Path

*   **Test Case:** A valid request with a valid App Check token (or in debug mode).
*   **Expected Result:** A `200 OK` response with the correct extracted data.

### Authentication Errors

*   **Test Case:** A request without an App Check token (and not in debug mode).
*   **Expected Result:** A `401 Unauthorized` error.
*   **Test Case:** A request with an invalid or expired App Check token (and not in debug mode).
*   **Expected Result:** A `401 Unauthorized` error.

### Input Errors

*   **Test Case:** A request with a missing or empty `text` field in the body.
*   **Expected Result:** A `400 Bad Request` error.
*   **Test Case:** A request where the `text` exceeds the token limit.
*   **Expected Result:** A `413 Content Too Large` or `400 Bad Request` error with a descriptive message.

### Selective and Field-Specific APIs

*   **Test Case:** A request to the main endpoint with the `fields` parameter.
*   **Expected Result:** A `200 OK` response containing only the specified fields.
*   **Test Case:** A request to a field-specific endpoint (e.g., `/api/v1/transactions/extract/merchant`).
*   **Expected Result:** A `200 OK` response containing only the `merchant` field.