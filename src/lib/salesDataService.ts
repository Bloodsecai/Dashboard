'use client';

import { Timestamp } from 'firebase/firestore';

/**
 * CANONICAL SALES DATA SERVICE
 *
 * This is the SINGLE SOURCE OF TRUTH for all sales data normalization.
 * All dashboard metrics, charts, and modals MUST use this service
 * to ensure 100% accuracy and consistency.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RawSaleDoc {
  id: string;
  amount: number | string;
  product: string;
  category?: string;
  customer?: string;
  customerName?: string;
  notes?: string;
  status: string;
  location?: string;
  source?: string;
  date?: any;
  createdAt?: any;
}

export interface NormalizedSale {
  id: string;
  amount: number;
  product: string;
  category: string;
  customer: string;
  notes: string;
  status: 'paid' | 'pending' | 'refunded';
  location: string;
  source: 'manual' | 'google_sheets' | 'n8n';
  date: Date;
  dateISO: string;
  createdAt: Date;
}

export interface SalesMetrics {
  totalPaidAmount: number;
  totalPendingAmount: number;
  totalRefundedAmount: number;
  paidCount: number;
  pendingCount: number;
  refundedCount: number;
  totalCount: number;
  averageDealSize: number;
}

export interface DailySalesData {
  date: string;
  amount: number;
  count: number;
}

export interface ProductSalesData {
  name: string;
  revenue: number;
  count: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize status to lowercase enum values
 * Handles case variations: "Paid", "PAID", "paid" → "paid"
 */
export function normalizeStatus(status: string | undefined | null): 'paid' | 'pending' | 'refunded' {
  if (!status) return 'pending';
  const lower = status.toLowerCase().trim();
  if (lower === 'paid') return 'paid';
  if (lower === 'refunded') return 'refunded';
  return 'pending';
}

/**
 * Normalize amount to a valid number
 * Handles: numbers, strings with currency symbols, comma-separated values
 */
export function normalizeAmount(amount: any): number {
  if (typeof amount === 'number') {
    return isNaN(amount) ? 0 : amount;
  }
  if (typeof amount === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = amount.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Convert Firestore Timestamp or string to JavaScript Date
 * Priority: createdAt → date → current date
 */
export function normalizeDate(field: any): Date {
  if (!field) return new Date();

  // Firestore Timestamp with toDate method
  if (field.toDate && typeof field.toDate === 'function') {
    return field.toDate();
  }

  // Firestore Timestamp as plain object with seconds
  if (field.seconds !== undefined) {
    return new Date(field.seconds * 1000);
  }

  // ISO string or other date string
  if (typeof field === 'string') {
    const parsed = new Date(field);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  // Already a Date object
  if (field instanceof Date) {
    return field;
  }

  return new Date();
}

/**
 * Normalize source field
 */
export function normalizeSource(source: any): 'manual' | 'google_sheets' | 'n8n' {
  if (!source) return 'manual';
  const lower = String(source).toLowerCase().trim();
  if (lower === 'google_sheets' || lower === 'googlesheets') return 'google_sheets';
  if (lower === 'n8n') return 'n8n';
  return 'manual';
}

// ============================================================================
// MAIN NORMALIZATION FUNCTION
// ============================================================================

/**
 * Normalize a single raw sale document into a consistent format
 */
export function normalizeSale(raw: RawSaleDoc): NormalizedSale {
  const date = normalizeDate(raw.createdAt || raw.date);

  return {
    id: raw.id,
    amount: normalizeAmount(raw.amount),
    product: raw.product || 'Unknown Product',
    category: raw.category || raw.product || 'Other',
    customer: raw.customer || raw.customerName || 'Anonymous',
    notes: raw.notes || '',
    status: normalizeStatus(raw.status),
    location: (raw.location || '').toUpperCase(),
    source: normalizeSource(raw.source),
    date,
    dateISO: date.toISOString(),
    createdAt: normalizeDate(raw.createdAt || raw.date),
  };
}

/**
 * Normalize an array of raw sales documents
 */
export function normalizeSales(rawSales: RawSaleDoc[]): NormalizedSale[] {
  return rawSales.map(normalizeSale);
}

// ============================================================================
// FILTERING FUNCTIONS
// ============================================================================

/**
 * Filter normalized sales by date range
 */
export function filterByDateRange(
  sales: NormalizedSale[],
  startDate: Date,
  endDate: Date
): NormalizedSale[] {
  return sales.filter(sale => sale.date >= startDate && sale.date <= endDate);
}

/**
 * Filter normalized sales by status
 */
export function filterByStatus(
  sales: NormalizedSale[],
  status: 'paid' | 'pending' | 'refunded'
): NormalizedSale[] {
  return sales.filter(sale => sale.status === status);
}

/**
 * Get paid sales only
 */
export function getPaidSales(sales: NormalizedSale[]): NormalizedSale[] {
  return filterByStatus(sales, 'paid');
}

// ============================================================================
// METRICS CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate comprehensive sales metrics from normalized sales
 */
export function calculateSalesMetrics(sales: NormalizedSale[]): SalesMetrics {
  const paidSales = sales.filter(s => s.status === 'paid');
  const pendingSales = sales.filter(s => s.status === 'pending');
  const refundedSales = sales.filter(s => s.status === 'refunded');

  const totalPaidAmount = paidSales.reduce((sum, s) => sum + s.amount, 0);
  const totalPendingAmount = pendingSales.reduce((sum, s) => sum + s.amount, 0);
  const totalRefundedAmount = refundedSales.reduce((sum, s) => sum + s.amount, 0);

  return {
    totalPaidAmount,
    totalPendingAmount,
    totalRefundedAmount,
    paidCount: paidSales.length,
    pendingCount: pendingSales.length,
    refundedCount: refundedSales.length,
    totalCount: sales.length,
    averageDealSize: paidSales.length > 0 ? totalPaidAmount / paidSales.length : 0,
  };
}

/**
 * Calculate status breakdown for charts
 */
export function calculateStatusBreakdown(sales: NormalizedSale[]): StatusBreakdown[] {
  const statusMap: Record<string, { count: number; amount: number }> = {
    paid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    refunded: { count: 0, amount: 0 },
  };

  sales.forEach(sale => {
    if (statusMap[sale.status]) {
      statusMap[sale.status].count++;
      statusMap[sale.status].amount += sale.amount;
    }
  });

  return Object.entries(statusMap).map(([status, data]) => ({
    status,
    count: data.count,
    amount: data.amount,
  }));
}

/**
 * Aggregate sales by day for charts
 */
export function aggregateDailySales(
  sales: NormalizedSale[],
  startDate: Date,
  endDate: Date
): DailySalesData[] {
  // Create a map of all dates in range
  const dateMap = new Map<string, { amount: number; count: number }>();

  // Initialize all dates in range with 0
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dateMap.set(dateStr, { amount: 0, count: 0 });
    current.setDate(current.getDate() + 1);
  }

  // Aggregate paid sales by date
  sales
    .filter(s => s.status === 'paid')
    .forEach(sale => {
      const dateStr = sale.date.toISOString().split('T')[0];
      if (dateMap.has(dateStr)) {
        const existing = dateMap.get(dateStr)!;
        existing.amount += sale.amount;
        existing.count++;
      }
    });

  // Convert to array sorted by date
  return Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregate sales by product for charts
 */
export function aggregateProductSales(
  sales: NormalizedSale[],
  limit: number = 10
): ProductSalesData[] {
  const productMap = new Map<string, { revenue: number; count: number }>();

  sales
    .filter(s => s.status === 'paid')
    .forEach(sale => {
      const product = sale.product || 'Other';
      const existing = productMap.get(product) || { revenue: 0, count: 0 };
      existing.revenue += sale.amount;
      existing.count++;
      productMap.set(product, existing);
    });

  return Array.from(productMap.entries())
    .map(([name, data]) => ({
      name,
      revenue: data.revenue,
      count: data.count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/**
 * Get recent sales sorted by date (newest first)
 */
export function getRecentSales(
  sales: NormalizedSale[],
  limit: number = 10
): NormalizedSale[] {
  return [...sales]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}

/**
 * Calculate sparkline data (last N days)
 */
export function calculateSparklineData(
  sales: NormalizedSale[],
  days: number = 12
): { value: number }[] {
  const now = new Date();
  const result: { value: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i - 1);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(now);
    dayEnd.setDate(dayEnd.getDate() - i);
    dayEnd.setHours(0, 0, 0, 0);

    const dayTotal = sales
      .filter(s => s.status === 'paid' && s.date >= dayStart && s.date < dayEnd)
      .reduce((sum, s) => sum + s.amount, 0);

    result.push({ value: dayTotal });
  }

  return result;
}

// ============================================================================
// SEARCH AND FILTER UTILITIES
// ============================================================================

/**
 * Search sales by text (product, customer, notes)
 */
export function searchSales(
  sales: NormalizedSale[],
  searchTerm: string
): NormalizedSale[] {
  if (!searchTerm.trim()) return sales;

  const lower = searchTerm.toLowerCase().trim();

  return sales.filter(sale =>
    sale.product.toLowerCase().includes(lower) ||
    sale.customer.toLowerCase().includes(lower) ||
    sale.notes.toLowerCase().includes(lower) ||
    sale.category.toLowerCase().includes(lower)
  );
}

/**
 * Filter sales by multiple criteria
 */
export interface SalesFilter {
  search?: string;
  status?: 'paid' | 'pending' | 'refunded' | 'all';
  startDate?: Date;
  endDate?: Date;
  location?: string;
}

export function filterSales(
  sales: NormalizedSale[],
  filters: SalesFilter
): NormalizedSale[] {
  let result = [...sales];

  if (filters.search) {
    result = searchSales(result, filters.search);
  }

  if (filters.status && filters.status !== 'all') {
    result = result.filter(s => s.status === filters.status);
  }

  if (filters.startDate) {
    result = result.filter(s => s.date >= filters.startDate!);
  }

  if (filters.endDate) {
    result = result.filter(s => s.date <= filters.endDate!);
  }

  if (filters.location) {
    const locationUpper = filters.location.toUpperCase();
    result = result.filter(s => s.location === locationUpper);
  }

  return result;
}

// ============================================================================
// CSV EXPORT UTILITY
// ============================================================================

/**
 * Convert normalized sales to CSV-ready format
 */
export function salesToCSVData(sales: NormalizedSale[]): Record<string, any>[] {
  return sales.map(sale => ({
    Date: sale.date.toISOString().split('T')[0],
    Product: sale.product,
    Category: sale.category,
    Customer: sale.customer,
    Amount: sale.amount,
    Status: sale.status,
    Location: sale.location,
    Source: sale.source,
    Notes: sale.notes,
  }));
}
