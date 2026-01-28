import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
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
const firebaseInitError: string | null =
  missingVars.length > 0
    ? `Missing Firebase env vars: ${missingVars.join(', ')}. Check Vercel environment variables.`
    : null;

// Log error only on client side (not during build)
if (firebaseInitError && typeof window !== 'undefined') {
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
// LAZY INITIALIZATION (SSR-SAFE - CLIENT-ONLY)
// Initialize only when needed and only on client-side
// =============================================================================

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initializationError: string | null = firebaseInitError;
let initialized = false;

/**
 * Lazily initialize Firebase only when called from client-side code.
 * This prevents build-time crashes and SSR errors.
 * 
 * Safe to call multiple times - only initializes once.
 */
function initializeFirebase(): { error: string | null } {
  // Already initialized - return result
  if (initialized) {
    return { error: initializationError };
  }

  // Not on client-side - skip initialization
  if (typeof window === 'undefined') {
    return {
      error: 'Firebase cannot be initialized on server. This function must only be called from client-side code.',
    };
  }

  // Mark as attempted to prevent re-initialization
  initialized = true;

  // Don't initialize if env vars are missing
  if (firebaseInitError) {
    initializationError = firebaseInitError;
    return { error: initializationError };
  }

  try {
    // Check if Firebase already initialized (could be initialized elsewhere)
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }

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

    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      console.log('[Firebase] Initialized:', {
        projectId: firebaseConfig.projectId,
        authReady: auth !== null,
        dbReady: db !== null,
        error: initializationError,
      });
    }

    return { error: initializationError };
  } catch (error: any) {
    initializationError = error?.message || 'Failed to initialize Firebase';
    console.error('[Firebase] Initialization failed:', initializationError);
    app = null;
    auth = null;
    db = null;
    return { error: initializationError };
  }
}

// =============================================================================
// SAFE EXPORTS - LAZY GETTERS
// =============================================================================

/**
 * Get Firestore instance. Initializes Firebase if needed.
 * Safe to call from client-side code only.
 * Returns null if Firebase initialization failed.
 */
export function getFirebaseDb(): Firestore | null {
  initializeFirebase();
  return db;
}

/**
 * Get Firebase Auth instance. Initializes Firebase if needed.
 * Safe to call from client-side code only.
 * Returns null if Firebase initialization failed.
 */
export function getFirebaseAuth(): Auth | null {
  initializeFirebase();
  return auth;
}

// For backward compatibility with existing code
export { db, auth };

// BUT: These exports are only safe when called after initialization!
// Better to use getFirebaseDb() and getFirebaseAuth() instead.

/**
 * Check if Firebase is ready to use.
 * Returns true only if both auth and db are initialized successfully.
 */
export function isFirebaseReady(): boolean {
  initializeFirebase();
  return auth !== null && db !== null && initializationError === null;
}

/**
 * Get error message if Firebase failed to initialize.
 * Returns null if Firebase is ready.
 */
export function getFirebaseError(): string | null {
  initializeFirebase();
  return initializationError;
}

/**
 * Get Firebase config for debugging
 */
export function getFirebaseConfig() {
  initializeFirebase();
  return {
    projectId: firebaseConfig.projectId,
    isReady: isFirebaseReady(),
    error: initializationError,
  };
}
