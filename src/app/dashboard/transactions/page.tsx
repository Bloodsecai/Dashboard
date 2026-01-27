'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Download, CreditCard, DollarSign, Trash2, Receipt } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TransactionsPage() {
  const { normalizedSales, loading } = useDashboardData(365);
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Clear transactions state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [analyticsResetTimestamp, setAnalyticsResetTimestamp] = useState<Date | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  // Fetch user's analytics reset timestamp on mount
  useEffect(() => {
    const fetchAnalyticsPreference = async () => {
      if (!user?.uid) {
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
            setAnalyticsResetTimestamp(resetTimestamp.toDate ? resetTimestamp.toDate() : new Date(resetTimestamp));
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

  // Clear transactions handler (uses same analyticsResetTimestamp as dashboard)
  const handleClearTransactions = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to clear transactions.');
      return;
    }

    setIsClearing(true);
    try {
      const now = new Date();
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        preferences: {
          analyticsResetTimestamp: now
        }
      }, { merge: true });

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

  // Filter transactions based on analytics reset timestamp
  const filteredSales = useMemo(() => {
    if (!analyticsResetTimestamp) return normalizedSales;
    return normalizedSales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate > analyticsResetTimestamp;
    });
  }, [normalizedSales, analyticsResetTimestamp]);

  // Only show completed transactions (paid status)
  const completedTransactions = useMemo(() => {
    let transactions = filteredSales.filter(s => s.status === 'paid');

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(
        t =>
          t.id.toLowerCase().includes(searchLower) ||
          t.customer.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
  }, [filteredSales, search]);

  // Calculate totals
  const totalAmount = completedTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Pagination
  const totalPages = Math.ceil(completedTransactions.length / pageSize);
  const paginatedTransactions = completedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Mock payment methods
  const paymentMethods = ['Credit Card', 'Bank Transfer', 'PayPal', 'Cash'];
  const getPaymentMethod = (id: string) => {
    const index = id.charCodeAt(0) % paymentMethods.length;
    return paymentMethods[index];
  };

  if (loading || loadingPreferences) {
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
          <p className="text-slate-400 mt-1">Completed payment transactions</p>
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
              <p className="text-2xl font-bold text-white">{completedTransactions.length}</p>
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
                {formatAmount(completedTransactions.length > 0 ? totalAmount / completedTransactions.length : 0)}
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
            placeholder="Search by transaction ID or customer name..."
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
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Transaction ID</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Customer</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Payment Method</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-white font-mono text-sm">TXN-{transaction.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{transaction.customer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-400 font-semibold">{formatAmount(transaction.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400 text-sm">
                      {format(new Date(transaction.date), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300">{getPaymentMethod(transaction.id)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      Completed
                    </span>
                  </td>
                </tr>
              ))}

              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4">
                        <Receipt className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400 text-lg mb-2">No transactions yet</p>
                      <p className="text-slate-500 text-sm">
                        {search ? 'Try a different search term' : 'Transactions will appear here once orders are completed'}
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
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, completedTransactions.length)} of {completedTransactions.length} transactions
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
          <p className="text-slate-300">
            Are you sure you want to clear all transaction analytics?
          </p>
          <p className="text-sm text-slate-400">
            This will reset dashboard calculations but will not delete Firestore records. Your original data remains safe.
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
              onClick={handleClearTransactions}
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
