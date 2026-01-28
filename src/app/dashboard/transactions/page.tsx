'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Download, CreditCard, DollarSign, Trash2, Receipt } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseReady, getFirebaseError } from '@/lib/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Order type from Firestore
interface FirestoreOrder {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  amount: number;
  customer: string;
  paymentMethod: string;
  status: string;
  createdAt: Date;
}

export default function TransactionsPage() {
  const { formatAmount } = useCurrency();
  const { user, loading: authLoading, firebaseError } = useAuth();

  // Check Firebase init on mount
  const [firebaseInitError, setFirebaseInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseReady()) {
      setFirebaseInitError(getFirebaseError());
    }
  }, []);

  // Show Firebase init error
  if (firebaseInitError) {
    return (
      <ErrorState
        title="Firebase Configuration Error"
        message={firebaseInitError}
      />
    );
  }

  // Show Firebase hook error
  if (firebaseError) {
    return (
      <ErrorState
        title="Authentication Error"
        message={firebaseError}
      />
    );
  }

  // Show auth loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-400 mt-4">Loading transactions...</p>
        </div>
      </div>
    );
  }

  // Show if not authenticated
  if (!user?.uid) {
    return (
      <ErrorState
        title="Not Authenticated"
        message="Please log in to view transactions."
      />
    );
  }

  // Firestore orders state (realtime)
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isServerReady, setIsServerReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listenerKey, setListenerKey] = useState(0); // Used to force re-create listener on retry

  // UI state
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Clear transactions state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [analyticsResetTimestamp, setAnalyticsResetTimestamp] = useState<Date | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  // Realtime listener for orders collection
  // Only render data from server (not cache) to prevent ghost rows
  useEffect(() => {
    // Get Firebase instance (lazy init, client-side only)
    const db = getFirebaseDb();

    // GUARD: Ensure Firebase and auth are ready
    if (!isFirebaseReady() || !db || !user?.uid) {
      setLoadingOrders(false);
      setErrorMsg('Firebase not ready or user not authenticated');
      return;
    }

    // Reset state when starting/retrying listener
    let serverReadyLocal = false;
    setLoadingOrders(true);
    setErrorMsg(null);
    setOrders([]); // Clear stale data immediately to prevent ghost rows

    // Query orders sorted by date (most recent first)
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    // Debug logging in development
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('[Transactions] Subscribing to orders collection');
    }

    // Timeout fallback: if server data doesn't arrive within 6 seconds, show error
    const timeoutId = setTimeout(() => {
      if (!serverReadyLocal) {
        setLoadingOrders(false);
        setErrorMsg("Can't reach Firestore. Check Vercel env vars or Firestore rules.");
        if (isDev) {
          console.error('[Transactions] Timeout: No server response after 6 seconds');
        }
      }
    }, 6000);

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onSnapshot(
        ordersQuery,
      (snapshot) => {
        // Check if this is from cache or server
        const fromCache = snapshot.metadata.fromCache;

        // Debug logging in development
        if (isDev) {
          console.log('[Transactions] Snapshot received:', {
            fromCache,
            docCount: snapshot.docs.length,
            serverReady: serverReadyLocal,
          });
        }

        // If from cache and server not ready yet, skip updating state
        // This prevents ghost rows from appearing during initial load
        if (fromCache && !serverReadyLocal) {
          return;
        }

        const ordersData: FirestoreOrder[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            orderId: data.orderId || doc.id,
            productId: data.productId || '',
            productName: data.productName || data.product || 'Unknown Product',
            productImage: data.productImage || data.image || '',
            amount: data.amount || 0,
            customer: data.customer || 'Unknown',
            paymentMethod: data.paymentMethod || 'Unknown',
            status: data.status || 'ordered',
            createdAt: data.createdAt?.toDate?.() || new Date(),
          };
        });

        setOrders(ordersData);

        // Mark server as ready once we get server data
        if (!fromCache) {
          serverReadyLocal = true;
          setIsServerReady(true);
          clearTimeout(timeoutId);
          setErrorMsg(null);
        }

        setLoadingOrders(false);
      },
      (error: any) => {
        // Enhanced error logging with Firebase error code
        const errorCode = error?.code || 'unknown';
        const errorMessage = error?.message || 'Failed to load transactions';

        if (isDev) {
          console.error('[Transactions] Firestore error:', {
            code: errorCode,
            message: errorMessage,
            fullError: error,
          });
        } else {
          console.error('[Transactions] Firestore error:', errorCode);
        }

        clearTimeout(timeoutId);

        // Provide user-friendly error messages
        let userMessage = errorMessage;
        if (errorCode === 'permission-denied') {
          userMessage = 'Permission denied. Check Firestore security rules.';
        } else if (errorCode === 'unavailable') {
          userMessage = "Can't reach Firestore. Check your internet connection.";
        } else if (errorCode === 'unauthenticated') {
          userMessage = 'Authentication required. Please sign in again.';
        }

        setErrorMsg(userMessage);
        setLoadingOrders(false);
      }
      );
    } catch (error: any) {
      console.error('[Transactions] Exception in listener setup:', error);
      setLoadingOrders(false);
      setErrorMsg('Failed to set up real-time updates. Please refresh the page.');
      clearTimeout(timeoutId);
    }

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [listenerKey, user?.uid]);

  // Fetch user's analytics reset timestamp on mount
  useEffect(() => {
    const fetchAnalyticsPreference = async () => {
      const db = getFirebaseDb();

      if (!user?.uid || !db || !isFirebaseReady()) {
        setLoadingPreferences(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const resetTimestamp = data?.preferences?.analyticsResetTimestamp;
          if (resetTimestamp) {
            setAnalyticsResetTimestamp(
              resetTimestamp.toDate ? resetTimestamp.toDate() : new Date(resetTimestamp)
            );
          }
        }
      } catch (error) {
        console.error('Error fetching analytics preference:', error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    fetchAnalyticsPreference();
  }, [user]);

  // Clear transactions handler
  const handleClearTransactions = async () => {
    const db = getFirebaseDb();

    if (!user?.uid || !db) {
      toast.error('You must be logged in to clear transactions.');
      return;
    }

    setIsClearing(true);
    try {
      const now = new Date();
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(
        userDocRef,
        {
          preferences: {
            analyticsResetTimestamp: now,
          },
        },
        { merge: true }
      );

      setAnalyticsResetTimestamp(now);
      setShowClearModal(false);
      setCurrentPage(1);
      toast.success('Transactions cleared.');
    } catch (error) {
      console.error('Error clearing transactions:', error);
      toast.error('Failed to clear transactions.');
    } finally {
      setIsClearing(false);
    }
  };

  // Filter orders based on analytics reset timestamp
  const filteredOrders = useMemo(() => {
    if (!analyticsResetTimestamp) return orders;
    return orders.filter((order) => order.createdAt > analyticsResetTimestamp);
  }, [orders, analyticsResetTimestamp]);

  // Apply search filter
  const searchedOrders = useMemo(() => {
    if (!search) return filteredOrders;

    const searchLower = search.toLowerCase();
    return filteredOrders.filter(
      (order) =>
        order.orderId.toLowerCase().includes(searchLower) ||
        order.customer.toLowerCase().includes(searchLower) ||
        order.productName.toLowerCase().includes(searchLower)
    );
  }, [filteredOrders, search]);

  // Calculate totals
  const totalAmount = searchedOrders.reduce((sum, order) => sum + order.amount, 0);

  // Pagination
  const totalPages = Math.ceil(searchedOrders.length / pageSize);
  const paginatedOrders = searchedOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'ordered':
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // Retry handler: resets state and re-creates the listener
  const handleRetry = () => {
    setIsServerReady(false);
    setErrorMsg(null);
    setLoadingOrders(true);
    setListenerKey((prev) => prev + 1);
  };

  // Show error state with retry button
  if (errorMsg && !isServerReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-slate-400 mb-6">{errorMsg}</p>
          <Button variant="primary" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading until server data is ready (prevents ghost rows from cache)
  if (loadingOrders || loadingPreferences || !isServerReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 mt-1">All orders from Firestore</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 border border-white/10 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors">
            <Download className="w-5 h-5" />
            Export
          </button>
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={() => setShowClearModal(true)}
            className="border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 text-red-400"
          >
            Clear All Transactions
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">{formatAmount(totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Transactions</p>
              <p className="text-2xl font-bold text-white">{searchedOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Average Transaction</p>
              <p className="text-2xl font-bold text-white">
                {formatAmount(searchedOrders.length > 0 ? totalAmount / searchedOrders.length : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order ID, customer, or product..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-accent/50"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">
                  Transaction ID
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">
                  Payment Method
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-mono text-sm">
                      {order.orderId.slice(0, 20)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{order.customer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-400 font-semibold">
                      {formatAmount(order.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400 text-sm">
                      {format(order.createdAt, 'MMM dd, yyyy HH:mm')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300">{order.paymentMethod}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4">
                        <Receipt className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400 text-lg mb-2">No transactions yet</p>
                      <p className="text-slate-500 text-sm">
                        {search
                          ? 'Try a different search term'
                          : 'Transactions will appear here once orders are created'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <p className="text-sm text-slate-400">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, searchedOrders.length)} of {searchedOrders.length}{' '}
              transactions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-700/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-primary-accent/20 text-primary-accent rounded-lg font-medium">
                {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-700/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Transactions Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear Transactions?"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-slate-300">Are you sure you want to clear all transaction history?</p>
          <p className="text-sm text-slate-400">
            This will hide transactions from the display but will not delete Firestore records. Your
            original data remains safe.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowClearModal(false)} disabled={isClearing}>
              Back
            </Button>
            <Button variant="danger" onClick={handleClearTransactions} loading={isClearing}>
              Yes, Clear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
