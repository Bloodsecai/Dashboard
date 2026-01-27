'use client';

import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
} from 'lucide-react';
import { clsx } from 'clsx';
import Papa from 'papaparse';
import { Badge } from '@/components/ui/Badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  NormalizedSale,
  searchSales,
  filterSales,
  salesToCSVData,
  SalesFilter,
} from '@/lib/salesDataService';

interface AllSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: NormalizedSale[];
  title?: string;
}

type SortField = 'date' | 'product' | 'customer' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

export function AllSalesModal({
  isOpen,
  onClose,
  sales,
  title = 'All Sales',
}: AllSalesModalProps) {
  const { formatAmount } = useCurrency();

  // State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'refunded'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search
  const filteredSales = useMemo(() => {
    const filters: SalesFilter = {
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    };
    return filterSales(sales, filters);
  }, [sales, search, statusFilter]);

  // Sort
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = a.date.getTime();
          bValue = b.date.getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'product':
          aValue = a.product.toLowerCase();
          bValue = b.product.toLowerCase();
          break;
        case 'customer':
          aValue = a.customer.toLowerCase();
          bValue = b.customer.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSales, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedSales.length / pageSize);
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSales.slice(start, start + pageSize);
  }, [sortedSales, currentPage, pageSize]);

  // Reset page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: 'all' | 'paid' | 'pending' | 'refunded') => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvData = salesToCSVData(sortedSales);
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `sales_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Calculate summary stats for filtered data
  const summaryStats = useMemo(() => {
    const paid = filteredSales.filter(s => s.status === 'paid');
    const pending = filteredSales.filter(s => s.status === 'pending');
    const refunded = filteredSales.filter(s => s.status === 'refunded');

    return {
      total: filteredSales.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, s) => sum + s.amount, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, s) => sum + s.amount, 0),
      refundedCount: refunded.length,
      refundedAmount: refunded.reduce((sum, s) => sum + s.amount, 0),
    };
  }, [filteredSales]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-white transition-colors text-left"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      )}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            onKeyDown={handleKeyDown}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-6xl max-h-[90vh] glass-strong rounded-2xl shadow-2xl border border-white/10 overflow-hidden pointer-events-auto flex flex-col"
            >
              {/* Gradient top border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-purple via-primary-pink to-primary-purple" />

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <span className="px-2 py-0.5 text-xs font-medium bg-success/20 text-success rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                      Synced
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {summaryStats.total} total records
                    {search && ` matching "${search}"`}
                    {statusFilter !== 'all' && ` (${statusFilter})`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-text-secondary hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="px-6 py-3 border-b border-white/10 grid grid-cols-3 gap-4 shrink-0">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20">
                  <div className="text-success text-sm font-medium">Paid</div>
                  <div className="text-white font-bold">{formatAmount(summaryStats.paidAmount)}</div>
                  <div className="text-text-muted text-sm">({summaryStats.paidCount})</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
                  <div className="text-warning text-sm font-medium">Pending</div>
                  <div className="text-white font-bold">{formatAmount(summaryStats.pendingAmount)}</div>
                  <div className="text-text-muted text-sm">({summaryStats.pendingCount})</div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-danger/10 border border-danger/20">
                  <div className="text-danger text-sm font-medium">Refunded</div>
                  <div className="text-white font-bold">{formatAmount(summaryStats.refundedAmount)}</div>
                  <div className="text-text-muted text-sm">({summaryStats.refundedCount})</div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search by product, customer, or notes..."
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-text-muted focus:outline-none focus:border-primary-purple/50 focus:ring-2 focus:ring-primary-purple/20 transition-all"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all',
                        showFilters
                          ? 'bg-primary-purple/20 border-primary-purple/50 text-white'
                          : 'bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10'
                      )}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                    </button>
                  </div>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 flex items-center gap-3"
                  >
                    <span className="text-sm text-text-secondary">Status:</span>
                    {(['all', 'paid', 'pending', 'refunded'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusFilterChange(status)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-sm capitalize transition-all',
                          statusFilter === status
                            ? 'bg-primary-purple text-white'
                            : 'bg-white/5 text-text-secondary hover:text-white hover:bg-white/10'
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        <SortButton field="date">Date</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        <SortButton field="product">Product</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        <SortButton field="customer">Customer</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        <SortButton field="amount">Amount</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        <SortButton field="status">Status</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                              <Package className="w-6 h-6 text-text-muted" />
                            </div>
                            <p className="text-text-secondary">No sales found</p>
                            {search && (
                              <p className="text-sm text-text-muted mt-1">
                                Try adjusting your search or filters
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                            {format(sale.date, 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-purple/20 to-primary-pink/10 flex items-center justify-center">
                                <Package className="w-4 h-4 text-primary-purple" />
                              </div>
                              <span className="truncate max-w-[200px]">{sale.product}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                            {sale.customer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                            {formatAmount(sale.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={sale.status}>
                              {sale.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {sale.location || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary max-w-[200px] truncate">
                            {sale.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary-purple/50"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-text-secondary">entries</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary mr-4">
                    Showing {Math.min((currentPage - 1) * pageSize + 1, sortedSales.length)} - {Math.min(currentPage * pageSize, sortedSales.length)} of {sortedSales.length}
                  </span>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <ChevronLeft className="w-4 h-4 -ml-2" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-1.5 rounded-lg bg-white/5 text-sm text-white">
                    {currentPage} / {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <ChevronRight className="w-4 h-4 -ml-2" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
