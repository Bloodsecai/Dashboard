import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// =============================================================================
// ENVIRONMENT VARIABLE VALIDATION & LOGGING
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

// Runtime logger (client-side only) - NEVER logs actual secret values
const logEnvStatus = () => {
  if (typeof window === 'undefined') return;
  
  const envStatus = {
    apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase] Env Status (production):', envStatus);
  }
};

// Track initialization state - NEVER throw, just track
const firebaseInitError: string | null =
  missingVars.length > 0
    ? `Missing Firebase env vars: ${missingVars.join(', ')}. Check Vercel environment variables.`
    : null;

// Log error only on client side (not during build)
if (firebaseInitError && typeof window !== 'undefined') {
  console.error('[Firebase] Initialization Error:', firebaseInitError);
  logEnvStatus();
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
// SAFE EXPORTS - LAZY GETTERS & GUARANTEED INSTANCES
// =============================================================================

// =============================================================================
// SAFE EXPORTS - GETTER FUNCTIONS (Recommended for all new code)
// =============================================================================

/**
 * Get guaranteed non-null Firestore instance.
 * Initializes Firebase on first call.
 * Safe for client-side code only.
 * @throws Error if Firebase configuration is missing
 */
export function getDb(): Firestore {
  initializeFirebase();
  if (!db) {
    throw new Error('[Firebase] Firestore not initialized. Check env vars.');
  }
  return db;
}

/**
 * Get guaranteed non-null Auth instance.
 * Initializes Firebase on first call.
 * Safe for client-side code only.
 * @throws Error if Firebase configuration is missing
 */
export function getAuthInstance(): Auth {
  initializeFirebase();
  if (!auth) {
    throw new Error('[Firebase] Auth not initialized. Check env vars.');
  }
  return auth;
}

/**
 * Get Firestore instance or null if initialization failed.
 * Safe for client-side code only.
 */
export function getFirebaseDb(): Firestore | null {
  initializeFirebase();
  return db;
}

/**
 * Get Auth instance or null if initialization failed.
 * Safe for client-side code only.
 */
export function getFirebaseAuth(): Auth | null {
  initializeFirebase();
  return auth;
}

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

// =============================================================================
// MODULE-LOAD CLIENT-SIDE INIT & DIRECT EXPORTS
// =============================================================================
// Initialize Firebase immediately when this module is loaded on the client.
// This preserves all existing error handling paths and keeps the lazy
// getters available for existing code.
if (typeof window !== 'undefined') {
  initializeFirebase();
}

/**
 * Direct instance exports (live bindings).
 * Prefer the getter functions (`getDb()`, `getAuthInstance()`) when possible,
 * but these are provided for components that import instances directly.
 */
export { app, auth, db };
