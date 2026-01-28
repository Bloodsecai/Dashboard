import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// =============================================================================
// ENVIRONMENT VARIABLE VALIDATION
// =============================================================================

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

// Optional env vars (not validated, but documented):
// - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
// - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
// - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

// Check for missing required env vars
const missingVars = REQUIRED_ENV_VARS.filter(
  (varName) => !process.env[varName]
);

if (missingVars.length > 0) {
  const errorMessage = `Missing Firebase env vars on Vercel. Check NEXT_PUBLIC_FIREBASE_*\n\nMissing: ${missingVars.join(', ')}\n\nMake sure these environment variables are set in your Vercel project settings.`;

  // Log error in all environments for debugging
  console.error('[Firebase Init Error]', errorMessage);

  // In production, throw to prevent silent failures
  if (typeof window !== 'undefined') {
    throw new Error(errorMessage);
  }
}

// =============================================================================
// FIREBASE CONFIGURATION
// =============================================================================

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// =============================================================================
// DEBUG MODE (Development only)
// =============================================================================

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  console.log('[Firebase Debug] Initializing with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
    hasAppId: !!firebaseConfig.appId,
  });
}

// =============================================================================
// INITIALIZE FIREBASE
// =============================================================================

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  if (isDev) {
    console.log('[Firebase Debug] Successfully initialized Firebase app');
  }
} catch (error) {
  console.error('[Firebase Init Error] Failed to initialize Firebase:', error);
  throw error;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { auth, db };

// Export config for debugging purposes
export const getFirebaseConfig = () => ({
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});