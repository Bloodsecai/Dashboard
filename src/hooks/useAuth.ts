'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady, getFirebaseError } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { isAdminEmail } from '@/config/admins';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  firebaseError: string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Guard: only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Get Firebase Auth instance (lazy init, client-side only)
    const auth = getFirebaseAuth();

    // Check if Firebase is properly initialized
    if (!isFirebaseReady()) {
      const error = getFirebaseError();
      setFirebaseError(error);
      setLoading(false);
      console.error('[useAuth] Firebase not ready:', error);
      return;
    }

    // Safety check: ensure auth exists
    if (!auth) {
      setFirebaseError('Firebase Auth not initialized');
      setLoading(false);
      console.error('[useAuth] auth is null');
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        try {
          setUser(currentUser);

          if (currentUser?.email) {
            const adminStatus = isAdminEmail(currentUser.email);
            setIsAdmin(adminStatus);

            // If not admin, redirect to access denied
            if (!adminStatus) {
              router.push('/access-denied');
            }
          } else {
            setIsAdmin(false);
            // If not logged in, redirect to login
            router.push('/login');
          }
        } catch (error) {
          console.error('[useAuth] Error in onAuthStateChanged callback:', error);
          setFirebaseError('Failed to process authentication');
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('[useAuth] Exception setting up auth listener:', error);
      setFirebaseError('Failed to set up authentication');
      setLoading(false);
    }
  }, [router]);

  const logout = async () => {
    const auth = getFirebaseAuth();

    if (!auth) {
      console.error('[useAuth] Firebase Auth not initialized, cannot logout');
      // Fallback: clear local state and redirect
      setUser(null);
      setIsAdmin(false);
      router.push('/login');
      return;
    }

    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: still redirect to login even if signOut fails
      router.push('/login');
    }
  };

  return {
    user,
    loading,
    isAdmin,
    logout,
    firebaseError,
  };
}