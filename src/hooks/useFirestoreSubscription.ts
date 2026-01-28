'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Query,
  DocumentData,
  onSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { getFirebaseConfig } from '@/lib/firebase';

// =============================================================================
// TYPES
// =============================================================================

export interface FirestoreSubscriptionOptions<T> {
  /** The Firestore query to subscribe to */
  query: Query<DocumentData>;
  /** Transform function to convert document data to your type */
  transform: (doc: DocumentData, id: string) => T;
  /** Optional: Collection name for debug logging */
  collectionName?: string;
  /** Optional: Timeout in ms (default: 8000) */
  timeout?: number;
  /** Optional: Whether to skip cache data entirely (default: true) */
  skipCache?: boolean;
  /** Optional: Dependency array to trigger re-subscription */
  deps?: unknown[];
}

export interface FirestoreSubscriptionResult<T> {
  /** The current data */
  data: T[];
  /** Whether we're still loading */
  loading: boolean;
  /** Whether server data has been received */
  isServerReady: boolean;
  /** Error message if something went wrong */
  errorMsg: string | null;
  /** The full FirestoreError if available */
  error: FirestoreError | null;
  /** Function to retry the subscription */
  retry: () => void;
  /** Number of documents received */
  count: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TIMEOUT = 8000; // 8 seconds
const isDev = process.env.NODE_ENV !== 'production';

// =============================================================================
// DEBUG HELPER
// =============================================================================

function debugLog(message: string, data?: unknown) {
  if (isDev) {
    console.log(`[Firestore Debug] ${message}`, data ?? '');
  }
}

function debugError(message: string, error: unknown) {
  // Always log errors, but with more detail in dev
  if (isDev) {
    console.error(`[Firestore Error] ${message}`, error);
  } else {
    console.error(`[Firestore Error] ${message}`);
  }
}

// =============================================================================
// FORMAT ERROR MESSAGE
// =============================================================================

function formatFirestoreError(error: FirestoreError): string {
  const code = error.code;
  const message = error.message;

  // Provide user-friendly messages for common errors
  switch (code) {
    case 'permission-denied':
      return 'Permission denied. Check Firestore security rules.';
    case 'unavailable':
      return "Can't reach Firestore. Check your internet connection.";
    case 'unauthenticated':
      return 'Authentication required. Please sign in again.';
    case 'not-found':
      return 'Collection or document not found.';
    case 'resource-exhausted':
      return 'Too many requests. Please wait and try again.';
    case 'failed-precondition':
      return 'Operation failed. The database may need an index.';
    case 'cancelled':
      return 'Request was cancelled.';
    case 'invalid-argument':
      return 'Invalid query parameters.';
    default:
      // For unknown errors, include the code and message
      return `${message || 'Unknown error'} (${code})`;
  }
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useFirestoreSubscription<T>(
  options: FirestoreSubscriptionOptions<T>
): FirestoreSubscriptionResult<T> {
  const {
    query,
    transform,
    collectionName = 'unknown',
    timeout = DEFAULT_TIMEOUT,
    skipCache = true,
    deps = [],
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServerReady, setIsServerReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [error, setError] = useState<FirestoreError | null>(null);
  const [listenerKey, setListenerKey] = useState(0);

  // Refs for cleanup
  const serverReadyRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Retry function
  const retry = useCallback(() => {
    debugLog(`Retrying subscription to ${collectionName}`);
    setIsServerReady(false);
    setErrorMsg(null);
    setError(null);
    setLoading(true);
    setData([]); // Clear stale data
    setListenerKey((prev) => prev + 1);
  }, [collectionName]);

  // Main subscription effect
  useEffect(() => {
    // Reset state
    serverReadyRef.current = false;
    setLoading(true);
    setErrorMsg(null);
    setError(null);
    setData([]); // Start with empty array - no stale/cached data

    const configResult = getFirebaseConfig();
    debugLog(`Subscribing to ${collectionName}`, {
      projectId: configResult.ok ? configResult.config.projectId : 'unknown',
      timeout,
      skipCache,
    });

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      if (!serverReadyRef.current) {
        setLoading(false);
        const timeoutError = `Can't reach Firestore. Check Vercel env vars or Firestore rules.`;
        setErrorMsg(timeoutError);
        debugError(`Timeout on ${collectionName}`, { timeout });
      }
    }, timeout);

    // Subscribe to Firestore
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        debugLog(`Snapshot received for ${collectionName}`, {
          fromCache,
          docCount: snapshot.docs.length,
          serverReady: serverReadyRef.current,
        });

        // Skip cache data if skipCache is enabled and server not ready yet
        if (skipCache && fromCache && !serverReadyRef.current) {
          debugLog(`Skipping cache data for ${collectionName}`);
          return;
        }

        // Transform documents
        const transformedData = snapshot.docs.map((doc) =>
          transform(doc.data(), doc.id)
        );

        setData(transformedData);

        // Mark as server ready when we get non-cache data
        if (!fromCache) {
          serverReadyRef.current = true;
          setIsServerReady(true);
          setErrorMsg(null);
          setError(null);

          // Clear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }

          debugLog(`Server data received for ${collectionName}`, {
            docCount: transformedData.length,
          });
        }

        setLoading(false);
      },
      (err: FirestoreError) => {
        debugError(`Listener error for ${collectionName}`, {
          code: err.code,
          message: err.message,
        });

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setError(err);
        setErrorMsg(formatFirestoreError(err));
        setLoading(false);
      }
    );

    // Cleanup
    return () => {
      debugLog(`Unsubscribing from ${collectionName}`);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenerKey, collectionName, timeout, skipCache, ...deps]);

  return {
    data,
    loading,
    isServerReady,
    errorMsg,
    error,
    retry,
    count: data.length,
  };
}

// =============================================================================
// ERROR UI COMPONENT HELPER
// =============================================================================

export interface ConnectionErrorProps {
  errorMsg: string;
  onRetry: () => void;
  title?: string;
}

// Note: The actual UI component should be created separately in components/ui
// This is just the interface for consistency
