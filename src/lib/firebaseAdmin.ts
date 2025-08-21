import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

/**
 * Initialize Firebase Admin SDK with singleton pattern
 * Supports multiple credential approaches for different deployment scenarios
 */
function initializeFirebaseAdmin(): App {
  // Return existing app if already initialized
  if (adminApp) {
    return adminApp;
  }

  // Check if any Firebase Admin apps are already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required');
  }

  try {
    // Approach 1: Application Default Credentials (for GCP deployment)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Initializing Firebase Admin with service account file');
      adminApp = initializeApp({
        projectId,
      });
      return adminApp;
    }

    // Approach 2: Service account from environment variables
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      console.log('Initializing Firebase Admin with environment variables');
      
      // Replace literal \n with actual newlines in private key
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
        projectId,
      });
      return adminApp;
    }

    // Approach 3: Try Application Default Credentials without explicit path
    console.log('Attempting to initialize Firebase Admin with Application Default Credentials');
    adminApp = initializeApp({
      projectId,
    });
    return adminApp;

  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error(
      'Failed to initialize Firebase Admin SDK. Please check your credentials configuration. ' +
      'See .env.example for setup instructions.'
    );
  }
}

/**
 * Get the initialized Firebase Admin app instance
 */
export function getFirebaseAdmin(): App {
  if (!adminApp) {
    adminApp = initializeFirebaseAdmin();
  }
  return adminApp;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth() {
  return getAuth(getFirebaseAdmin());
}

/**
 * Get Firebase App Check instance
 */
export function getFirebaseAppCheck() {
  return getAppCheck(getFirebaseAdmin());
}

/**
 * Get Firebase Firestore instance
 */
export function getFirebaseFirestore() {
  return getFirestore(getFirebaseAdmin());
}

// Initialize on module load
try {
  getFirebaseAdmin();
} catch (error) {
  console.warn('Firebase Admin SDK initialization deferred:', error);
}
