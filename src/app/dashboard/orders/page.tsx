'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ChevronDown, Trash2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'paid' | 'pending' | 'refunded';

export default function OrdersPage() {
  const { normalizedSales, loading, isServerReady, errorMsg, retry } = useDashboardData(365);
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Clear orders state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [ordersClearedAt, setOrdersClearedAt] = useState<Date | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  // Fetch user's ordersClearedAt timestamp on mount
  useEffect(() => {
    const fetchOrdersPreference = async () => {
      if (!user?.uid) {
        setLoadingPreferences(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          const clearedTimestamp = data?.preferences?.ordersClearedAt;
          if (clearedTimestamp) {
            setOrdersClearedAt(clearedTimestamp.toDate ? clearedTimestamp.toDate() : new Date(clearedTimestamp));
          }
        }
      } catch (error) {
        console.error('Error fetching orders preference:', error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    fetchOrdersPreference();
  }, [user]);

  // Clear orders handler
  const handleClearOrders = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to clear orders.');
      return;
    }

    setIsClearing(true);
    try {
      const now = new Date();
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        preferences: {
          ordersClearedAt: now
        }
      }, { merge: true });

      setOrdersClearedAt(now);
      setShowClearModal(false);
      setCurrentPage(1);
      toast.success('Orders cleared.');
    } catch (error) {
      console.error('Error clearing orders:', error);
      toast.error('Failed to clear orders.');
    } finally {
      setIsClearing(false);
    }
  };

  // Filter orders based on ordersClearedAt timestamp
  const visibleOrders = useMemo(() => {
    if (!ordersClearedAt) return normalizedSales;
    return normalizedSales.filter(order => {
      const orderDate = new Date(order.date);
      return orderDate > ordersClearedAt;
    });
  }, [normalizedSales, ordersClearedAt]);

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = [...visibleOrders];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        order =>
          order.id.toLowerCase().includes(searchLower) ||
          order.customer.toLowerCase().includes(searchLower) ||
          order.product.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [visibleOrders, search, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-500/20 text-green-400 border-green-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      refunded: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[status] || styles.pending;
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
          <Button variant="primary" onClick={retry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading until server data is ready (prevents ghost rows from cache)
  if (loading || loadingPreferences || !isServerReady) {
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
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-slate-400 mt-1">View and manage all orders</p>
        </div>
        <Button
          variant="secondary"
          icon={Trash2}
          onClick={() => setShowClearModal(true)}
          className="self-start sm:self-auto border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 text-red-400"
        >
          Clear All Orders
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer, or product..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              className="appearance-none px-4 py-3 pr-10 bg-slate-700/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500/50 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="paid">Completed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Order ID</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Product</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Amount</th>
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
                    <span className="text-white font-mono text-sm">#{order.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{order.customer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300 truncate max-w-[200px] block">{order.product}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400 text-sm">
                      {format(new Date(order.date), 'MMM dd, yyyy')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-semibold">{formatAmount(order.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize border ${getStatusBadge(order.status)}`}>
                      {order.status === 'paid' ? 'Completed' : order.status === 'refunded' ? 'Cancelled' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-400">No orders found</p>
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
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredOrders.length)} of {filteredOrders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-700/50 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg font-medium">
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

      {/* Clear Orders Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Orders"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-slate-300">
            Are you sure you want to clear your orders?
          </p>
          <p className="text-sm text-slate-400">
            This will hide all current orders from view. Your order records will remain in the database.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowClearModal(false)}
              disabled={isClearing}
            >
              Back
            </Button>
            <Button
              variant="danger"
              onClick={handleClearOrders}
              loading={isClearing}
            >
              Yes, Clear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
