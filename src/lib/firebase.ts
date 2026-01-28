'use client';

import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// =============================================================================
// FIREBASE CONFIGURATION (Direct env access - no dynamic iteration)
// =============================================================================

/**
 * Build Firebase config from environment variables.
 * Uses direct access to avoid Next.js bundling issues.
 * Returns null if required vars are missing.
 */
function buildFirebaseConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
} | null {
  // Check required vars directly (no dynamic access)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  // If any required var is missing, return null
  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  // All required vars present - build config with optional vars
  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

// =============================================================================
// INITIALIZATION STATE
// =============================================================================

let firebaseApp: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
export let firebaseReady = false;
export let firebaseInitError: string | null = null;
let initAttempted = false;

/**
 * Initialize Firebase once on the client.
 * Safe to call multiple times - only initializes once.
 */
function initializeFirebase(): void {
  // Already attempted initialization - skip
  if (initAttempted) {
    return;
  }

  // Mark as attempted
  initAttempted = true;

  // Only run on client side
  if (typeof window === 'undefined') {
    firebaseInitError = 'Firebase must be initialized on client side only';
    firebaseReady = false;
    return;
  }

  // Get config
  const config = buildFirebaseConfig();

  if (!config) {
    firebaseInitError =
      'Missing Firebase environment variables. ' +
      'Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, ' +
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID';
    firebaseReady = false;

    if (process.env.NODE_ENV === 'development') {
      console.error('[Firebase] ' + firebaseInitError);
    }
    return;
  }

  try {
    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      firebaseApp = initializeApp(config);
    }

    // Initialize auth and db
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    // Success
    firebaseReady = true;
    firebaseInitError = null;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase] Initialized successfully for project:', config.projectId);
    }
  } catch (error: any) {
    firebaseInitError = `Firebase initialization failed: ${error?.message || 'Unknown error'}`;
    firebaseReady = false;
    console.error('[Firebase]', firebaseInitError);
  }
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Get Firestore instance or null if initialization failed.
 */
export function getFirebaseDb() {
  return db;
}

/**
 * Get Auth instance or null if initialization failed.
 */
export function getFirebaseAuth() {
  return auth;
}

/**
 * Get Firebase config - returns object or null if config is missing
 */
export function getFirebaseConfig() {
  return buildFirebaseConfig();
}

export { firebaseApp, auth, db };
