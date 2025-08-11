import { vi } from 'vitest';

// Set up environment variables for testing
process.env.API_DEBUG_MODE_ENABLED = 'true';
process.env.FIREBASE_PROJECT_ID = 'test-project';

// Mock Firebase Admin SDK
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
  cert: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/app-check', () => ({
  getAppCheck: vi.fn(() => ({
    verifyToken: vi.fn().mockResolvedValue({
      appId: 'test-app-id',
    }),
  })),
}));

// Mock the server actions
vi.mock('@/app/actions', () => ({
  getTransactionDetails: vi.fn(),
}));
