import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// =============================================================================
// ENVIRONMENT VARIABLE VALIDATION (SAFE - NEVER THROWS)
// =============================================================================

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

// Check for missing required env vars
const missingVars = REQUIRED_ENV_VARS.filter(
  (varName) => !process.env[varName]
);

// Track initialization state - NEVER throw, just track
export const firebaseInitError: string | null =
  missingVars.length > 0
    ? `Missing Firebase env vars: ${missingVars.join(', ')}. Check Vercel environment variables.`
    : null;

// Log error but DO NOT throw - let UI handle it gracefully
if (firebaseInitError) {
  console.error('[Firebase] ' + firebaseInitError);
}

// =============================================================================
// FIREBASE CONFIGURATION
// =============================================================================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// =============================================================================
// SAFE INITIALIZATION (NEVER THROWS)
// =============================================================================

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initializationError: string | null = firebaseInitError;

// Only initialize if we have the required env vars
if (!firebaseInitError) {
  try {
    app = initializeApp(firebaseConfig);
    
    // Safely initialize auth and db with null checks
    try {
      auth = getAuth(app);
    } catch (authError: any) {
      initializationError = `Failed to initialize Firebase Auth: ${authError?.message || 'Unknown error'}`;
      console.error('[Firebase] Auth initialization failed:', initializationError);
      auth = null;
    }

    try {
      db = getFirestore(app);
    } catch (dbError: any) {
      initializationError = `Failed to initialize Firestore: ${dbError?.message || 'Unknown error'}`;
      console.error('[Firebase] Firestore initialization failed:', initializationError);
      db = null;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Firebase] Initialized:', {
        projectId: firebaseConfig.projectId,
        authReady: auth !== null,
        dbReady: db !== null,
        error: initializationError,
      });
    }
  } catch (error: any) {
    initializationError = error?.message || 'Failed to initialize Firebase';
    console.error('[Firebase] Initialization failed:', initializationError);
    app = null;
    auth = null;
    db = null;
  }
}

// =============================================================================
// SAFE EXPORTS
// =============================================================================

// Export auth and db - may be null if init failed
// Components MUST check isFirebaseReady() before using these
export { auth, db };

// Check if Firebase is ready to use
export function isFirebaseReady(): boolean {
  return auth !== null && db !== null && !initializationError;
}

// Get error message if Firebase failed to initialize
export function getFirebaseError(): string | null {
  return initializationError;
}

// Get config info for debugging
export function getFirebaseConfig() {
  return {
    projectId: firebaseConfig.projectId,
    isReady: isFirebaseReady(),
    error: initializationError,
  };
}
