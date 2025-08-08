# Firebase Studio Project

This is a Next.js starter project for Firebase Studio. This document provides a comprehensive guide to setting up, running, and deploying the project, with a focus on integration with Google Cloud Functions and Firebase.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project Locally](#running-the-project-locally)
- [Linting and Formatting](#linting-and-formatting)
- [Building the Project](#building-the-project)
- [Running Tests](#running-tests)
- [Deployment to Google Cloud Functions](#deployment-to-google-cloud-functions)
- [Firebase Integration](#firebase-integration)
- [API Reference](#api-reference)

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- A Google Cloud project with the following APIs enabled:
  - AI Platform API
  - Cloud Functions API
  - Cloud Build API
- Firebase CLI

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install the dependencies:**

   ```bash
   npm install
   ```

## Environment Variables

To run the project, you need to set up the following environment variables. Create a `.env` file in the root of the project and add the following:

```
GEMINI_API_KEY=<your-google-ai-api-key>
```

Replace `<your-google-ai-api-key>` with your actual Google AI API key. You can obtain a key from the Google AI Studio.

## Running the Project Locally

To start the development server, run:

```bash
npm run dev
```

This will start the Next.js application on `http://localhost:3000`.

## Linting and Formatting

This project uses ESLint for linting and Prettier for code formatting. To check for linting errors, run:

```bash
npm run lint
```

To automatically fix linting and formatting issues, run:

```bash
npm run format
```

## Building the Project

To create a production build of the application, run:

```bash
npm run build
```

This will generate an optimized version of the application in the `.next` directory.

## Running Tests

To run the tests, you first need to compile the TypeScript files. Then, you can run the tests using `tsx`:

```bash
npx tsx test.ts
```

## Deployment to Google Cloud Functions

To deploy the Genkit flows to Google Cloud Functions, you can use the Firebase CLI.

1. **Login to Firebase:**

   ```bash
   firebase login
   ```

2. **Initialize Firebase in your project:**

   ```bash
   firebase init functions
   ```

   When prompted, select "Use an existing project" and choose your Google Cloud project. Select TypeScript as the language for Cloud Functions.

3. **Deploy the functions:**

   You will need to modify the `index.ts` file in the `functions` directory to export your Genkit flows.

   ```typescript
   // functions/src/index.ts
   import { https } from 'firebase-functions';
   import { extractTransactionDetails } from '../../src/ai/flows/extract-transaction-details'; // Adjust the path as needed

   export const extractDetails = https.onCall(async (data, context) => {
     return await extractTransactionDetails(data);
   });
   ```

   Then, deploy the function:

   ```bash
   firebase deploy --only functions
   ```

## Firebase Integration

You can integrate this project with other Firebase services like Firestore, Authentication, and Hosting.

- **Firestore:** Use the Firebase Admin SDK to interact with Firestore from your Genkit flows or Next.js API routes.
- **Authentication:** Secure your application and Cloud Functions using Firebase Authentication.
- **Hosting:** Deploy your Next.js application to Firebase Hosting.

## API Reference

### `extractTransactionDetails(input: ExtractTransactionDetailsInput): Promise<ExtractTransactionDetailsOutput>`

Extracts transaction details from a given text.

**Input:**

- `text` (string): The text describing the transaction.
- `task` (string, optional): The specific task to perform (e.g., 'categorize', 'get_transaction_type').
- `omnibusMode` (boolean, optional): Whether to intelligently assign null values.

**Output:**

An object containing the extracted transaction details:

- `description` (string)
- `category` (string | null)
- `type` (string)
- `amount` (number | null)
- `date` (string | null)
