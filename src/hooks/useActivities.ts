import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Activity, ActivityType } from '@/types';

export function useActivities(maxItems?: number) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServerReady, setIsServerReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listenerKey, setListenerKey] = useState(0);

  // Retry function
  const retry = useCallback(() => {
    setIsServerReady(false);
    setErrorMsg(null);
    setLoading(true);
    setActivities([]); // Clear stale data
    setListenerKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setErrorMsg('Firestore not initialized. Check Firebase env vars.');
      setLoading(false);
      return;
    }

    let serverReadyLocal = false;
    setLoading(true);
    setErrorMsg(null);
    setActivities([]); // Clear stale data to prevent ghost rows

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('[useActivities] Subscribing to activities collection', { maxItems });
    }

    // 8-second timeout
    const timeoutId = setTimeout(() => {
      if (!serverReadyLocal) {
        setLoading(false);
        setErrorMsg("Can't reach Firestore. Check Vercel env vars or Firestore rules.");
        if (isDev) {
          console.error('[useActivities] Timeout: No server response after 8 seconds');
        }
      }
    }, 8000);

    let q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));

    if (maxItems) {
      q = query(q, limit(maxItems));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        if (isDev) {
          console.log('[useActivities] Snapshot received:', {
            fromCache,
            docCount: snapshot.docs.length,
          });
        }

        // Skip cache data on initial load to prevent ghost rows
        if (fromCache && !serverReadyLocal) {
          return;
        }

        const activitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Activity));
        setActivities(activitiesData);

        if (!fromCache) {
          serverReadyLocal = true;
          setIsServerReady(true);
          clearTimeout(timeoutId);
          setErrorMsg(null);
        }

        setLoading(false);
      },
      (error: any) => {
        const errorCode = error?.code || 'unknown';
        const errorMessage = error?.message || 'Failed to load activities';

        if (isDev) {
          console.error('[useActivities] Firestore error:', {
            code: errorCode,
            message: errorMessage,
            fullError: error,
          });
        }

        clearTimeout(timeoutId);

        // User-friendly error messages
        let userMessage = errorMessage;
        if (errorCode === 'permission-denied') {
          userMessage = 'Permission denied. Check Firestore security rules.';
        } else if (errorCode === 'unavailable') {
          userMessage = "Can't reach Firestore. Check your internet connection.";
        }

        setErrorMsg(userMessage);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [maxItems, listenerKey]);

  const addActivity = async (activityData: {
    type: ActivityType;
    description?: string;
    salesId?: string;
    customerId?: string;
  }) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    await addDoc(collection(db, 'activities'), {
      ...activityData,
      createdAt: serverTimestamp(),
    });
  };

  const deleteActivity = async (id: string) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    await deleteDoc(doc(db, 'activities', id));
  };

  // Group activities by type
  const activitiesByType = activities.reduce((acc, activity) => {
    const type = activity.type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    activities,
    loading,
    isServerReady,
    errorMsg,
    retry,
    addActivity,
    deleteActivity,
    activitiesByType,
    totalCount: activities.length,
  };
}
