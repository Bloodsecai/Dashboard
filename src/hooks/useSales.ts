import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Sale } from '@/types';

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServerReady, setIsServerReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listenerKey, setListenerKey] = useState(0);

  // Retry function
  const retry = useCallback(() => {
    setIsServerReady(false);
    setErrorMsg(null);
    setLoading(true);
    setSales([]); // Clear stale data
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
    setSales([]); // Clear stale data to prevent ghost rows

    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('[useSales] Subscribing to sales collection');
    }

    // 8-second timeout
    const timeoutId = setTimeout(() => {
      if (!serverReadyLocal) {
        setLoading(false);
        setErrorMsg("Can't reach Firestore. Check Vercel env vars or Firestore rules.");
        if (isDev) {
          console.error('[useSales] Timeout: No server response after 8 seconds');
        }
      }
    }, 8000);

    // Query with orderBy for consistent ordering
    const salesQuery = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      salesQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        if (isDev) {
          console.log('[useSales] Snapshot received:', {
            fromCache,
            docCount: snapshot.docs.length,
          });
        }

        // Skip cache data on initial load to prevent ghost rows
        if (fromCache && !serverReadyLocal) {
          return;
        }

        const salesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Sale));
        setSales(salesData);

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
        const errorMessage = error?.message || 'Failed to load sales';

        if (isDev) {
          console.error('[useSales] Firestore error:', {
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
  }, [listenerKey]);

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    await addDoc(collection(db, 'sales'), {
      ...saleData,
      createdAt: serverTimestamp(),
    });
  };

  const updateSale = async (id: string, updates: Partial<Sale>) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    await updateDoc(doc(db, 'sales', id), updates);
  };

  const deleteSale = async (id: string) => {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');

    await deleteDoc(doc(db, 'sales', id));
  };

  return {
    sales,
    loading,
    isServerReady,
    errorMsg,
    retry,
    addSale,
    updateSale,
    deleteSale,
  };
}
