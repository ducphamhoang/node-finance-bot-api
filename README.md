# FinanceFlow AI

FinanceFlow AI is a Next.js application that uses AI to extract transaction details from text. It provides a simple interface for users to paste transaction descriptions and get back structured data, such as the transaction description, category, type, amount, and date.

## Features

- **Transaction Detail Extraction**: Extracts transaction details from unstructured text.
- **Categorization**: Categorizes transactions into different types (e.g., groceries, dining, utilities).
- **Transaction Type Identification**: Identifies whether a transaction is an income or an expense.
- **Amount Extraction**: Extracts the transaction amount.
- **Date Extraction**: Extracts the transaction date.
- **Omnibus Mode**: Allows the AI to assign `null` to fields it cannot confidently determine.
- **Task-Specific Analysis**: Allows users to perform specific tasks, such as categorization or amount extraction.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **AI**: [Genkit](https://firebase.google.com/docs/genkit)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/node-finance-bot-api.git
   cd node-finance-bot-api
   ```

2. **Install the dependencies:**

   ```bash
   npm install
   ```

3. **Set up your environment variables:**

   Create a `.env.local` file in the root of your project and add the following:

   ```env
   GOOGLE_API_KEY=your_google_api_key
   ```

   Replace `your_google_api_key` with your actual Google API key.

### Running the Development Server

To run the development server, use the following command:

```bash
npm run dev
```

This will start the Next.js development server on http://localhost:9002.

To run the Genkit development server, use the following command:

```bash
npm run genkit:dev
```

This will start the Genkit development server on http://localhost:4000.

## Building for Production

To build the application for production, use the following command:

```bash
npm run build
```

This will create a production-ready build in the `.next` directory.

## Running in Production

To run the application in production, use the following command:

```bash
npm start
```

This will start the Next.js production server.

## Linting and Type Checking

To lint the code, use the following command:

```bash
npm run lint
```

To type-check the code, use the following command:

```bash
npm run typecheck
```