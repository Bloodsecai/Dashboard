'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subDays, startOfMonth, eachDayOfInterval, format } from 'date-fns';
import {
  RawSaleDoc,
  NormalizedSale,
  normalizeSales,
  filterByDateRange,
  getPaidSales,
  calculateSalesMetrics,
  calculateStatusBreakdown,
  aggregateDailySales,
  aggregateProductSales,
  getRecentSales,
  calculateSparklineData,
  normalizeDate,
} from '@/lib/salesDataService';

/**
 * DASHBOARD DATA HOOK
 *
 * This hook provides all dashboard metrics using the CANONICAL
 * salesDataService for normalization. This ensures 100% accuracy
 * and consistency across all dashboard widgets.
 *
 * ALL metrics are derived from the same normalized dataset.
 */

// ============================================================================
// TYPES
// ============================================================================

interface ActivityDoc {
  id: string;
  type: string;
  createdAt?: any;
}

interface CustomerDoc {
  id: string;
  name: string;
  createdAt?: any;
}

interface TargetDoc {
  monthlyRevenue?: number;
  targetCustomers?: number;
  targetCalls?: number;
  targetDeals?: number;
  targetConversionRate?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTIVITY_COLORS: Record<string, string> = {
  'email': '#7c3aed',
  'call': '#8b5cf6',
  'meeting': '#a855f7',
  'follow-up': '#d946ef',
  'other': '#ec4899',
};

const STATE_POSITIONS: Record<string, { name: string; x: number; y: number }> = {
  'AL': { name: 'Alabama', x: 68, y: 62 },
  'AK': { name: 'Alaska', x: 12, y: 85 },
  'AZ': { name: 'Arizona', x: 22, y: 60 },
  'AR': { name: 'Arkansas', x: 55, y: 55 },
  'CA': { name: 'California', x: 10, y: 45 },
  'CO': { name: 'Colorado', x: 35, y: 45 },
  'CT': { name: 'Connecticut', x: 88, y: 32 },
  'DE': { name: 'Delaware', x: 85, y: 42 },
  'FL': { name: 'Florida', x: 78, y: 80 },
  'GA': { name: 'Georgia', x: 72, y: 65 },
  'HI': { name: 'Hawaii', x: 25, y: 90 },
  'ID': { name: 'Idaho', x: 18, y: 25 },
  'IL': { name: 'Illinois', x: 60, y: 40 },
  'IN': { name: 'Indiana', x: 65, y: 42 },
  'IA': { name: 'Iowa', x: 52, y: 35 },
  'KS': { name: 'Kansas', x: 45, y: 48 },
  'KY': { name: 'Kentucky', x: 68, y: 48 },
  'LA': { name: 'Louisiana', x: 55, y: 72 },
  'ME': { name: 'Maine', x: 92, y: 18 },
  'MD': { name: 'Maryland', x: 82, y: 42 },
  'MA': { name: 'Massachusetts', x: 90, y: 28 },
  'MI': { name: 'Michigan', x: 65, y: 30 },
  'MN': { name: 'Minnesota', x: 50, y: 22 },
  'MS': { name: 'Mississippi', x: 60, y: 65 },
  'MO': { name: 'Missouri', x: 52, y: 48 },
  'MT': { name: 'Montana', x: 28, y: 18 },
  'NE': { name: 'Nebraska', x: 42, y: 38 },
  'NV': { name: 'Nevada', x: 15, y: 40 },
  'NH': { name: 'New Hampshire', x: 90, y: 22 },
  'NJ': { name: 'New Jersey', x: 85, y: 38 },
  'NM': { name: 'New Mexico', x: 30, y: 58 },
  'NY': { name: 'New York', x: 82, y: 28 },
  'NC': { name: 'North Carolina', x: 78, y: 52 },
  'ND': { name: 'North Dakota', x: 42, y: 18 },
  'OH': { name: 'Ohio', x: 70, y: 40 },
  'OK': { name: 'Oklahoma', x: 45, y: 55 },
  'OR': { name: 'Oregon', x: 12, y: 22 },
  'PA': { name: 'Pennsylvania', x: 78, y: 35 },
  'RI': { name: 'Rhode Island', x: 92, y: 30 },
  'SC': { name: 'South Carolina', x: 75, y: 58 },
  'SD': { name: 'South Dakota', x: 42, y: 25 },
  'TN': { name: 'Tennessee', x: 65, y: 52 },
  'TX': { name: 'Texas', x: 40, y: 70 },
  'UT': { name: 'Utah', x: 22, y: 42 },
  'VT': { name: 'Vermont', x: 88, y: 20 },
  'VA': { name: 'Virginia', x: 78, y: 45 },
  'WA': { name: 'Washington', x: 12, y: 15 },
  'WV': { name: 'West Virginia', x: 75, y: 45 },
  'WI': { name: 'Wisconsin', x: 58, y: 28 },
  'WY': { name: 'Wyoming', x: 30, y: 32 },
};

const TARGET_COLORS = ['#7c3aed', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDashboardData(periodDays: number = 30) {
  // Raw Firestore data
  const [rawSales, setRawSales] = useState<RawSaleDoc[]>([]);
  const [activities, setActivities] = useState<ActivityDoc[]>([]);
  const [customers, setCustomers] = useState<CustomerDoc[]>([]);
  const [targets, setTargets] = useState<TargetDoc>({});
  const [loading, setLoading] = useState(true);

  // Track if we've received server data (not from cache)
  // This prevents ghost rows from appearing during tab switches
  const [isServerReady, setIsServerReady] = useState(false);

  // Error state and retry mechanism
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listenerKey, setListenerKey] = useState(0); // Used to force re-create listeners on retry

  // ============================================================================
  // FIRESTORE LISTENERS
  // Only render data from server (not cache) to prevent ghost rows
  // ============================================================================

  useEffect(() => {
    // Reset state when starting/retrying listeners
    let serverReadyLocal = false;
    let loadCount = 0;
    let serverReadyCount = 0;
    setLoading(true);
    setErrorMsg(null);

    const checkLoaded = () => {
      loadCount++;
      if (loadCount >= 4) setLoading(false);
    };

    const checkServerReady = () => {
      serverReadyCount++;
      // All 4 listeners have received server data
      if (serverReadyCount >= 4) {
        serverReadyLocal = true;
        setIsServerReady(true);
        setErrorMsg(null);
      }
    };

    // Timeout fallback: if server data doesn't arrive within 4 seconds, show error
    const timeoutId = setTimeout(() => {
      if (!serverReadyLocal) {
        setLoading(false);
        setErrorMsg("Can't reach server right now. Please retry.");
      }
    }, 4000);

    // Error handler for listeners
    const handleError = (error: Error) => {
      console.error('Firestore listener error:', error);
      clearTimeout(timeoutId);
      setErrorMsg(error.message || 'Failed to load data');
      setLoading(false);
    };

    // Sales listener - only update state when server data arrives
    const unsubSales = onSnapshot(
      collection(db, 'sales'),
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        // Skip cached data on initial load to prevent ghost rows
        if (fromCache && !serverReadyLocal) {
          return;
        }

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as RawSaleDoc));
        setRawSales(data);

        if (!fromCache) {
          checkServerReady();
          clearTimeout(timeoutId);
        }
        checkLoaded();
      },
      handleError
    );

    // Activities listener
    const unsubActivities = onSnapshot(
      collection(db, 'activities'),
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        if (fromCache && !serverReadyLocal) {
          return;
        }

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ActivityDoc));
        setActivities(data);

        if (!fromCache) {
          checkServerReady();
          clearTimeout(timeoutId);
        }
        checkLoaded();
      },
      handleError
    );

    // Customers listener
    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        if (fromCache && !serverReadyLocal) {
          return;
        }

        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CustomerDoc));
        setCustomers(data);

        if (!fromCache) {
          checkServerReady();
          clearTimeout(timeoutId);
        }
        checkLoaded();
      },
      handleError
    );

    // Targets listener
    const unsubTargets = onSnapshot(
      collection(db, 'targets'),
      (snapshot) => {
        const fromCache = snapshot.metadata.fromCache;

        if (fromCache && !serverReadyLocal) {
          return;
        }

        if (!snapshot.empty) {
          setTargets(snapshot.docs[0].data() as TargetDoc);
        }

        if (!fromCache) {
          checkServerReady();
          clearTimeout(timeoutId);
        }
        checkLoaded();
      },
      handleError
    );

    return () => {
      clearTimeout(timeoutId);
      unsubSales();
      unsubActivities();
      unsubCustomers();
      unsubTargets();
    };
  }, [listenerKey]);

  // ============================================================================
  // RETRY FUNCTION
  // ============================================================================

  const retry = useCallback(() => {
    setIsServerReady(false);
    setErrorMsg(null);
    setLoading(true);
    setListenerKey((prev) => prev + 1);
  }, []);

  // ============================================================================
  // NORMALIZE ALL SALES (SINGLE SOURCE OF TRUTH)
  // ============================================================================

  const normalizedSales = useMemo(() => {
    return normalizeSales(rawSales);
  }, [rawSales]);

  // ============================================================================
  // DATE RANGES
  // ============================================================================

  const dateRanges = useMemo(() => {
    const now = new Date();
    const periodStart = subDays(now, periodDays);
    const previousPeriodStart = subDays(periodStart, periodDays);
    const monthStart = startOfMonth(now);

    return {
      now,
      periodStart,
      previousPeriodStart,
      periodEnd: now,
      monthStart,
    };
  }, [periodDays]);

  // ============================================================================
  // FILTERED SALES BY PERIOD
  // ============================================================================

  const periodSales = useMemo(() => {
    const { periodStart, periodEnd, previousPeriodStart } = dateRanges;

    const currentPeriod = filterByDateRange(normalizedSales, periodStart, periodEnd);
    const previousPeriod = filterByDateRange(normalizedSales, previousPeriodStart, periodStart);

    return {
      current: currentPeriod,
      previous: previousPeriod,
    };
  }, [normalizedSales, dateRanges]);

  // ============================================================================
  // DASHBOARD METRICS (ALL DERIVED FROM SAME NORMALIZED DATA)
  // ============================================================================

  const metrics = useMemo(() => {
    const { now, periodStart, monthStart } = dateRanges;
    const { current: currentPeriodSales, previous: previousPeriodSales } = periodSales;

    // ========================================================================
    // 1. TOTAL SALES (PAID ONLY in current period)
    // ========================================================================
    const currentMetrics = calculateSalesMetrics(currentPeriodSales);
    const previousMetrics = calculateSalesMetrics(previousPeriodSales);

    const totalSales = currentMetrics.totalPaidAmount;
    const totalSalesPrevious = previousMetrics.totalPaidAmount;

    const totalSalesChange = totalSalesPrevious > 0
      ? ((totalSales - totalSalesPrevious) / totalSalesPrevious) * 100
      : 0;

    // ========================================================================
    // 2. ACTIVITIES
    // ========================================================================
    const currentActivities = activities.filter(a => {
      const date = normalizeDate(a.createdAt);
      return date >= periodStart && date <= now;
    });
    const previousActivities = activities.filter(a => {
      const date = normalizeDate(a.createdAt);
      return date >= dateRanges.previousPeriodStart && date < periodStart;
    });

    const activitiesCount = currentActivities.length;
    const activitiesPrevious = previousActivities.length;
    const activitiesChange = activitiesPrevious > 0
      ? ((activitiesCount - activitiesPrevious) / activitiesPrevious) * 100
      : 0;

    // ========================================================================
    // 3. ACTIVITIES BY TYPE
    // ========================================================================
    const activityTypeCounts: Record<string, number> = {
      'email': 0, 'call': 0, 'meeting': 0, 'follow-up': 0, 'other': 0,
    };
    currentActivities.forEach(a => {
      const type = (a.type || 'other').toLowerCase();
      if (activityTypeCounts[type] !== undefined) {
        activityTypeCounts[type]++;
      } else {
        activityTypeCounts['other']++;
      }
    });
    const activitiesByType = Object.entries(activityTypeCounts).map(([type, value]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
      value,
      color: ACTIVITY_COLORS[type] || '#ec4899',
    }));

    // ========================================================================
    // 4. OPEN LEADS
    // ========================================================================
    const customersWithPaidSales = new Set(
      getPaidSales(normalizedSales).map(s => s.customer).filter(Boolean)
    );
    const openLeads = customers.filter(c => !customersWithPaidSales.has(c.name)).length;

    // ========================================================================
    // 5. AVERAGE DEAL SIZE
    // ========================================================================
    const averageDealSize = currentMetrics.averageDealSize;

    // ========================================================================
    // 6. SALES BY STATE (from current period paid sales)
    // ========================================================================
    const currentPaidSales = getPaidSales(currentPeriodSales);
    const salesByStateMap: Record<string, number> = {};
    currentPaidSales.forEach(sale => {
      const state = sale.location;
      if (state && STATE_POSITIONS[state]) {
        salesByStateMap[state] = (salesByStateMap[state] || 0) + sale.amount;
      }
    });
    const salesByState = Object.entries(salesByStateMap)
      .map(([code, salesAmount]) => ({
        code,
        name: STATE_POSITIONS[code]?.name || code,
        sales: salesAmount,
        x: STATE_POSITIONS[code]?.x || 50,
        y: STATE_POSITIONS[code]?.y || 50,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // ========================================================================
    // 7. TARGET ACHIEVEMENT (Monthly)
    // ========================================================================
    const monthSales = filterByDateRange(normalizedSales, monthStart, now);
    const monthMetrics = calculateSalesMetrics(monthSales);
    const monthlyRevenue = monthMetrics.totalPaidAmount;

    const monthActivities = activities.filter(a => {
      const date = normalizeDate(a.createdAt);
      return date >= monthStart && date <= now;
    });
    const monthCalls = monthActivities.filter(a => (a.type || '').toLowerCase() === 'call').length;

    const monthCustomers = customers.filter(c => {
      const date = normalizeDate(c.createdAt);
      return date >= monthStart && date <= now;
    }).length;

    const dealsCount = monthMetrics.paidCount;
    const conversionRate = monthMetrics.totalCount > 0
      ? (monthMetrics.paidCount / monthMetrics.totalCount) * 100
      : 0;

    const targetAchievement = [
      { name: 'Monthly Revenue', current: monthlyRevenue, target: targets.monthlyRevenue || 1500000, color: TARGET_COLORS[0] },
      { name: 'New Customers', current: monthCustomers, target: targets.targetCustomers || 50, color: TARGET_COLORS[1] },
      { name: 'Sales Calls', current: monthCalls, target: targets.targetCalls || 200, color: TARGET_COLORS[2] },
      { name: 'Deals Closed', current: dealsCount, target: targets.targetDeals || 35, color: TARGET_COLORS[3] },
      { name: 'Lead Conversion', current: Math.round(conversionRate), target: targets.targetConversionRate || 80, color: TARGET_COLORS[4] },
    ];

    // ========================================================================
    // 8. SALES BY STATUS (current period)
    // ========================================================================
    const salesByStatus = calculateStatusBreakdown(currentPeriodSales);

    // ========================================================================
    // 9. RECENT SALES (from ALL normalized sales, sorted by date)
    // ========================================================================
    const recentSales = getRecentSales(normalizedSales, 10);

    // ========================================================================
    // 10. SPARKLINE DATA (last 12 days)
    // ========================================================================
    const sparklineData = calculateSparklineData(normalizedSales, 12);

    return {
      totalSales,
      totalSalesPrevious,
      totalSalesChange: parseFloat(totalSalesChange.toFixed(1)),
      paidSalesCount: currentMetrics.paidCount,
      activitiesCount,
      activitiesPrevious,
      activitiesChange: parseFloat(activitiesChange.toFixed(1)),
      activitiesByType,
      openLeads,
      averageDealSize,
      salesByState,
      targetAchievement,
      salesByStatus,
      recentSales,
      sparklineData,
    };
  }, [normalizedSales, activities, customers, targets, periodSales, dateRanges]);

  // ============================================================================
  // WEEKLY SALES CHART DATA
  // ============================================================================

  const weeklySales = useMemo(() => {
    const { now, periodStart } = dateRanges;
    return aggregateDailySales(normalizedSales, periodStart, now);
  }, [normalizedSales, dateRanges]);

  // ============================================================================
  // PRODUCT SALES DATA
  // ============================================================================

  const productSales = useMemo(() => {
    // Use all paid sales for product breakdown (not filtered by period)
    // This matches common dashboard behavior where product performance is cumulative
    return aggregateProductSales(normalizedSales, 10);
  }, [normalizedSales]);

  // ============================================================================
  // RETURN ALL DATA
  // ============================================================================

  return {
    // Dashboard metrics
    metrics,

    // Chart data
    weeklySales,
    productSales,

    // Loading state
    loading,

    // Server ready state (prevents ghost rows from cache)
    isServerReady,

    // Error state and retry function
    errorMsg,
    retry,

    // Raw counts for debugging/verification
    salesCount: rawSales.length,

    // IMPORTANT: Expose normalized sales for the "View All Sales" modal
    // This ensures the modal shows the EXACT same data used for metrics
    normalizedSales,

    // Period info for UI
    periodDays,
  };
}
