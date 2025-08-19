# FinanceFlow AI

FinanceFlow AI is a Next.js application that uses AI to extract transaction details from text. It provides a simple interface for users to paste transaction descriptions and get back structured data. The application also exposes a REST API for programmatic access.

## Features

- **Multi-Transaction Extraction**: Extracts details from multiple transactions in a single piece of text.
- **Rich Data Extraction**: Extracts a wide range of fields: `description`, `category`, `type`, `amount`, `date`, `merchant`, `paymentMethod`, and `location`.
- **Omnibus Mode**: Allows the AI to assign `null` to fields it cannot confidently determine.
- **Task-Specific Analysis**: Allows users to perform specific tasks, such as categorization or amount extraction (most effective for single-transaction inputs).
- **REST API**: A versioned REST API with authentication for programmatic integration.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **AI**: [Genkit](https://firebase.google.com/docs/genkit) with [OpenRouter](https://openrouter.ai/) fallback
- **Backend**: [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) for API authentication.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Testing**: [Vitest](https://vitest.dev/)

## LLM Configuration

FinanceFlow AI uses a multi-provider LLM architecture with automatic fallback capabilities:

### Primary Provider: Genkit (Google AI)
- Uses Google's Gemini 2.0 Flash model via Genkit
- Provides high-quality transaction extraction
- Requires `GOOGLE_API_KEY` environment variable

### Fallback Provider: OpenRouter
- Automatically used when Genkit fails or is unavailable
- Supports multiple open-source models (Gemma, Llama, etc.)
- Requires `OPENROUTER_API_KEY` environment variable
- Can be disabled by setting `LLM_FALLBACK_ENABLED=false`

### Caching System
- In-memory LRU cache for LLM responses
- Reduces API calls and improves response times
- Configurable TTL and cache size
- Can be disabled by setting `LLM_CACHE_ENABLED=false`

### Configuration Options
All LLM settings can be configured via environment variables:

```bash
# Primary provider
GOOGLE_API_KEY=your_google_api_key

# Fallback provider
OPENROUTER_API_KEY=your_openrouter_api_key
LLM_FALLBACK_ENABLED=true

# Caching
LLM_CACHE_ENABLED=true
LLM_CACHE_TTL=3600000          # 1 hour in milliseconds
LLM_CACHE_MAX_SIZE=1000        # Maximum cache entries

# Request settings
LLM_TIMEOUT=30000              # 30 seconds in milliseconds
LLM_MAX_RETRIES=2              # Retries per provider
LLM_RETRY_DELAY=1000           # Delay between retries in milliseconds
```

### Monitoring and Troubleshooting

The application provides detailed logging for LLM operations:
- Provider selection and fallback events
- Cache hit/miss statistics
- Error details with provider information
- Request timing and token usage

Common issues and solutions:
- **All providers failing**: Check API keys and network connectivity
- **Slow responses**: Enable caching or increase timeout values
- **Rate limits**: Configure retry delays or upgrade API plans
- **High costs**: Enable caching and adjust model selection

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or another package manager

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/node-finance-bot-api.git
    cd node-finance-bot-api
    ```

2.  **Install the dependencies:**

    ```bash
    npm install
    ```

3.  **Set up your environment variables:**

    Create a `.env.local` file by copying the example file:

    ```bash
    cp .env.example .env.local
    ```

    Now, edit `.env.local` to add your environment variables:

    **Required for basic functionality:**
    -   `GOOGLE_API_KEY`: Your Google AI API key for Genkit (primary LLM provider).
    -   `API_DEBUG_MODE_ENABLED`: Set to `true` to disable API authentication for local development.

    **Optional for enhanced reliability:**
    -   `OPENROUTER_API_KEY`: Your OpenRouter API key for fallback LLM provider.
    -   `LLM_FALLBACK_ENABLED`: Set to `true` to enable automatic fallback (default: true).
    -   `LLM_CACHE_ENABLED`: Set to `true` to enable response caching (default: true).

    **Firebase Credentials (required for API endpoints):**
    To run the API endpoints, you need to provide Firebase Admin credentials for App Check verification. Follow the instructions in the `.env.local` file to set this up using either a service account file or environment variables.

    See the [LLM Configuration](#llm-configuration) section above for all available configuration options.

### Running the Development Server

To run the Next.js UI and API, use the following command:

```bash
npm run dev
```

This will start the development server on http://localhost:9002.

To run the Genkit development server for flow debugging, use the following command in a separate terminal:

```bash
npm run genkit:dev
```

This will start the Genkit development server on http://localhost:4000.

## API

The project exposes a versioned REST API for extracting transaction details. For more information, see the [API Implementation Documentation](./docs/api-impl.md).

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

## Linting, Type Checking, and Testing

-   **Linting**: `npm run lint`
-   **Type Checking**: `npm run typecheck`
-   **Testing**: `npm test`
