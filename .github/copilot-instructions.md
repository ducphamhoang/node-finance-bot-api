# FinanceFlow AI - GitHub Copilot Instructions

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

FinanceFlow AI is a Next.js application that uses a multi-provider LLM architecture to extract transaction details from text. It provides both a web UI and REST API with Firebase authentication.

## Working Effectively

### Bootstrap, Build, and Test the Repository

**Prerequisites:**
- Node.js v20 or higher is required
- Check version: `node --version && npm --version`

**Installation and Setup:**
1. Clone the repository: `git clone <repo-url> && cd node-finance-bot-api`
2. Install dependencies: `npm install` -- takes ~40 seconds. Expect some peer dependency warnings (safe to ignore).
3. Create environment file: `cp .env.example .env.local` (if .env.example exists) or create `.env.local` manually
4. Set required environment variables in `.env.local`:
   ```bash
   # Required for basic functionality
   GOOGLE_API_KEY=your_google_api_key_here
   API_DEBUG_MODE_ENABLED=true
   
   # Optional for enhanced reliability
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   LLM_FALLBACK_ENABLED=true
   
   # Firebase (required for API endpoints)
   FIREBASE_PROJECT_ID=your_project_id
   ```

**Build and Test Commands:**
- Type checking: `npm run typecheck` -- takes ~3 seconds. **WARNING: Currently fails with 11 TypeScript errors in genkit provider, validation, and test files. Build still succeeds.**
- Testing: `npm test` -- takes ~3 seconds. **All 133 tests pass.** NEVER CANCEL. Set timeout to 30+ minutes for safety.
- Building: `npm run build` -- takes ~32 seconds with warnings but succeeds. NEVER CANCEL. Set timeout to 60+ minutes.
- Linting: `npm run lint` -- **Currently requires interactive ESLint setup. Use with caution in automated environments.**

### Development Servers

**Main Development Server:**
- Start: `npm run dev` -- runs on http://localhost:9002
- Ready in ~1 second, uses Turbopack for fast builds
- **Always test API functionality** after making changes by calling endpoints

**Genkit Development Server:**
- Start: `npm run genkit:dev` -- runs on http://localhost:4000  
- **Requires valid GOOGLE_API_KEY** or will fail with FAILED_PRECONDITION error
- Used for debugging AI flows and LLM interactions
- **Note:** UI assets download may fail with 403 error (external service issue)

### Validation and Testing

**Manual Validation Steps:**
1. **Web UI Test:** Navigate to http://localhost:9002 and verify the transaction analysis form loads
2. **API Test:** Test transaction extraction endpoint:
   ```bash
   curl -X POST http://localhost:9002/api/v1/transactions/extract \
     -H "Content-Type: application/json" \
     -d '{"text": "Coffee at Starbucks for $5.50 yesterday", "omnibusMode": true}'
   ```
3. **Expected Result:** With valid API keys: structured transaction data. Without keys: 500 error with LLM provider failures.

**Always run these validation steps after making changes:**
- `npm run typecheck` (expect current failures, focus on new errors)
- `npm test` (all tests must pass)
- `npm run build` (must succeed despite TypeScript warnings)
- Manual API test with curl command above

## Architecture Overview

### LLM System
- **Primary Provider:** Genkit (Google AI/Gemini 2.0 Flash)
- **Fallback Provider:** OpenRouter (multiple open-source models)
- **Caching:** LRU cache with 1-hour TTL, configurable size
- **Error Handling:** Automatic retries, comprehensive error types, graceful fallbacks

### Key File Locations
- **Main App:** `src/app/page.tsx` (UI), `src/app/actions.ts` (server actions)
- **API Routes:** `src/app/api/v1/transactions/extract/route.ts` (main endpoint)
- **LLM Abstraction:** `src/ai/llm/` directory (client, providers, types, cache)
- **Components:** `src/components/finance-flow.tsx` (main UI component)
- **Authentication:** `src/lib/auth/verifyAppCheck.ts`
- **Validation:** `src/lib/validation.ts` (Zod schemas)
- **Error Handling:** `src/lib/errors.ts` (RFC 7807 problem details)
- **Tests:** `tests/` directory (mirrors src structure)
- **Documentation:** `docs/` directory (codebase, LLM architecture, API docs)

### Configuration Files
- **Package.json:** Main dependencies and scripts
- **tsconfig.json:** TypeScript configuration with `@/*` path aliases
- **vitest.config.ts:** Test configuration with Node.js environment
- **tailwind.config.ts:** Tailwind CSS styling configuration  
- **components.json:** shadcn/ui component configuration
- **apphosting.yaml:** Firebase App Hosting deployment config

## Common Issues and Solutions

### TypeScript Errors
- **Current known issues:** 11 errors in genkit provider, validation, and test files
- **Impact:** Build succeeds despite errors (Next.js skips validation)
- **Action:** Focus on new errors introduced by your changes

### LLM Provider Failures
- **Symptom:** "All LLM providers failed" errors
- **Cause:** Missing or invalid API keys (GOOGLE_API_KEY, OPENROUTER_API_KEY)
- **Solution:** Verify API keys in .env.local or set API_DEBUG_MODE_ENABLED=true for testing without real LLM calls

### Build Warnings
- **OpenTelemetry warnings:** Safe to ignore, related to Genkit instrumentation
- **Handlebars warnings:** Safe to ignore, related to dotprompt dependencies
- **Missing modules:** Some optional modules missing, app functions normally

### ESLint Setup
- **Issue:** First `npm run lint` requires interactive setup
- **Solution:** Choose "Strict (recommended)" if prompted, or skip linting in automated environments

## Development Workflow

### Making Changes
1. **Start development server:** `npm run dev`
2. **Make incremental changes** to code
3. **Test immediately:** Use manual validation steps above
4. **Run tests:** `npm test` to ensure no regressions
5. **Type check:** `npm run typecheck` to catch TypeScript issues early

### Before Committing
1. **Type check:** `npm run typecheck` (address new errors, ignore known issues)
2. **Test:** `npm test` (all tests must pass)
3. **Build:** `npm run build` (must succeed)
4. **Manual validation:** Test key user scenarios with curl or UI

### Common Tasks Reference

**Repository Structure:**
```
├── src/
│   ├── app/              # Next.js app router (pages, API routes, actions)
│   ├── components/       # React components (UI, forms)
│   ├── ai/              # LLM abstraction layer and AI flows
│   ├── lib/             # Utilities (auth, validation, errors)
│   └── hooks/           # React hooks
├── tests/               # Test suite (mirrors src structure)
├── docs/               # Documentation (codebase, architecture)
└── public/             # Static assets
```

**Key Environment Variables:**
```bash
# Core functionality
GOOGLE_API_KEY=            # Primary LLM provider (required)
API_DEBUG_MODE_ENABLED=    # Set to 'true' for local development
FIREBASE_PROJECT_ID=       # Required for API authentication

# Enhanced features  
OPENROUTER_API_KEY=        # Fallback LLM provider
LLM_FALLBACK_ENABLED=      # Enable automatic provider fallback
LLM_CACHE_ENABLED=         # Enable response caching
LLM_TIMEOUT=30000          # Request timeout in milliseconds
```

**API Endpoints:**
- `POST /api/v1/transactions/extract` - Extract all transaction fields
- `POST /api/v1/transactions/extract/[field]` - Extract specific field only
- Authentication via Firebase App Check (bypassed when API_DEBUG_MODE_ENABLED=true)

**Testing Strategy:**
- **Unit tests:** Individual components and utilities
- **Integration tests:** LLM provider interactions and API routes  
- **Mock providers:** For testing without API calls
- **All tests must pass** - 133 tests in current suite

Remember: This codebase has a sophisticated LLM architecture with automatic fallbacks, comprehensive error handling, and robust testing. Always validate your changes thoroughly using both automated tests and manual API calls.