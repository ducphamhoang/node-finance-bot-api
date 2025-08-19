# Tech Stack

This document outlines the technologies and libraries used in this project.

## Framework

*   **[Next.js](https://nextjs.org/):** A React framework for building full-stack web applications.

## Artificial Intelligence

### LLM Abstraction Layer

*   **Custom LLM Client:** Multi-provider abstraction layer with automatic fallback, caching, and error handling.
*   **Primary Provider:** [Genkit](https://firebase.google.com/docs/genkit) with Google AI/Gemini models.
    *   `@genkit-ai/googleai`: Google AI provider for Genkit.
    *   `@genkit-ai/next`: Next.js integration for Genkit.
*   **Fallback Provider:** [OpenRouter](https://openrouter.ai/) for access to multiple open-source models.

### Features

*   **Intelligent Caching:** LRU cache with configurable TTL and size limits.
*   **Provider Health Monitoring:** Automatic health checks and failover.
*   **Comprehensive Error Handling:** Structured error types with retry logic.
*   **Request/Response Validation:** Zod schema validation for all AI interactions.
*   **Robust Response Parsing:** Markdown-aware JSON parsing with graceful error handling.

## Backend

*   **[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup):** Used for server-side services, specifically for Firebase App Check verification.

## UI

*   **[React](https://react.dev/):** A JavaScript library for building user interfaces.
*   **[Shadcn UI](https://ui.shadcn.com/):** A collection of re-usable components built using Radix UI and Tailwind CSS.
*   **[Radix UI](https://www.radix-ui.com/):** A low-level UI component library for building high-quality, accessible design systems and web apps.
*   **[Tailwind CSS](https://tailwindcss.com/):** A utility-first CSS framework for rapidly building custom user interfaces.
*   **[Recharts](https://recharts.org/):** A composable charting library built on React components.
*   **[Lucide React](https://lucide.dev/):** A library of simply beautiful open-source icons.

## Forms

*   **[React Hook Form](https://react-hook-form.com/):** A library for managing forms in React.
*   **[Zod](httpshttps://zod.dev/):** A TypeScript-first schema declaration and validation library.

## Language & Testing

*   **[TypeScript](https://www.typescriptlang.org/):** A typed superset of JavaScript that compiles to plain JavaScript.
*   **[Vitest](https://vitest.dev/):** A modern test runner for comprehensive API and application testing.

## Other Libraries

*   **[date-fns](https://date-fns.org/):** A modern JavaScript date utility library.
*   **[clsx](https://github.com/lukeed/clsx):** A tiny utility for constructing `className` strings conditionally.
*   **[tailwind-merge](https://github.com/dcastil/tailwind-merge):** A utility for merging Tailwind CSS classes in JavaScript without style conflicts.