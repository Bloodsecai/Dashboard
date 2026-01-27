import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// US State positions for the map visualization
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

const ACTIVITY_COLORS: Record<string, string> = {
  'email': '#7c3aed',
  'call': '#8b5cf6',
  'meeting': '#a855f7',
  'follow-up': '#d946ef',
  'other': '#ec4899',
};

const TARGET_COLORS = ['#7c3aed', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

interface SaleDoc {
  id: string;
  amount: number;
  product: string;
  category?: string;
  customer?: string;
  customerName?: string;
  status: 'paid' | 'pending' | 'refunded';
  location?: string;
  date: Timestamp;
  createdAt: Timestamp;
}

interface ActivityDoc {
  id: string;
  type: string;
  createdAt: Timestamp;
}

interface TargetDoc {
  monthlyRevenue: number;
  targetCustomers: number;
  targetCalls: number;
  targetDeals: number;
  targetConversionRate: number;
}

interface CustomerDoc {
  id: string;
  name: string;
  createdAt: Timestamp;
}

export async function getDashboardMetrics(periodDays: number = 30) {
  const db = getAdminDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Fetch all data in parallel
  const [salesSnapshot, activitiesSnapshot, customersSnapshot, targetsSnapshot] = await Promise.all([
    db.collection('sales').get(),
    db.collection('activities').get(),
    db.collection('customers').get(),
    db.collection('targets').limit(1).get(),
  ]);

  // Parse sales data
  const allSales: SaleDoc[] = salesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as SaleDoc));

  // Parse activities data
  const allActivities: ActivityDoc[] = activitiesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as ActivityDoc));

  // Parse customers data
  const allCustomers: CustomerDoc[] = customersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as CustomerDoc));

  // Parse targets (use first document or defaults)
  const targets: TargetDoc = targetsSnapshot.empty
    ? {
        monthlyRevenue: 1500000,
        targetCustomers: 50,
        targetCalls: 200,
        targetDeals: 35,
        targetConversionRate: 80,
      }
    : (targetsSnapshot.docs[0].data() as TargetDoc);

  // Filter sales by period
  const currentPeriodSales = allSales.filter(sale => {
    const saleDate = sale.createdAt?.toDate?.() || sale.date?.toDate?.() || new Date();
    return saleDate >= periodStart && saleDate <= now;
  });

  const previousPeriodSales = allSales.filter(sale => {
    const saleDate = sale.createdAt?.toDate?.() || sale.date?.toDate?.() || new Date();
    return saleDate >= previousPeriodStart && saleDate < periodStart;
  });

  // Filter activities by period
  const currentPeriodActivities = allActivities.filter(activity => {
    const activityDate = activity.createdAt?.toDate?.() || new Date();
    return activityDate >= periodStart && activityDate <= now;
  });

  const previousPeriodActivities = allActivities.filter(activity => {
    const activityDate = activity.createdAt?.toDate?.() || new Date();
    return activityDate >= previousPeriodStart && activityDate < periodStart;
  });

  // 1. Total Sales (paid only)
  const paidSales = currentPeriodSales.filter(s => s.status === 'paid');
  const totalSales = paidSales.reduce((sum, s) => sum + (s.amount || 0), 0);

  const previousPaidSales = previousPeriodSales.filter(s => s.status === 'paid');
  const totalSalesPrevious = previousPaidSales.reduce((sum, s) => sum + (s.amount || 0), 0);

  const totalSalesChange = totalSalesPrevious > 0
    ? ((totalSales - totalSalesPrevious) / totalSalesPrevious) * 100
    : 0;

  // 2. Activities Count
  const activitiesCount = currentPeriodActivities.length;
  const activitiesPrevious = previousPeriodActivities.length;
  const activitiesChange = activitiesPrevious > 0
    ? ((activitiesCount - activitiesPrevious) / activitiesPrevious) * 100
    : 0;

  // 3. Activities by Type
  const activityTypeCounts: Record<string, number> = {
    'email': 0,
    'call': 0,
    'meeting': 0,
    'follow-up': 0,
    'other': 0,
  };

  currentPeriodActivities.forEach(activity => {
    const type = (activity.type || 'other').toLowerCase();
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

  // 4. Open Leads (customers without a paid sale)
  const customersWithPaidSales = new Set(
    allSales
      .filter(s => s.status === 'paid')
      .map(s => s.customer || s.customerName)
      .filter(Boolean)
  );

  const openLeads = allCustomers.filter(c => !customersWithPaidSales.has(c.name)).length;

  // 5. Average Deal Size (paid sales only)
  const averageDealSize = paidSales.length > 0
    ? totalSales / paidSales.length
    : 0;

  // 6. Sales by State
  const salesByStateMap: Record<string, number> = {};
  paidSales.forEach(sale => {
    const state = sale.location?.toUpperCase();
    if (state && STATE_POSITIONS[state]) {
      salesByStateMap[state] = (salesByStateMap[state] || 0) + (sale.amount || 0);
    }
  });

  const salesByState = Object.entries(salesByStateMap)
    .map(([code, sales]) => ({
      code,
      name: STATE_POSITIONS[code]?.name || code,
      sales,
      x: STATE_POSITIONS[code]?.x || 50,
      y: STATE_POSITIONS[code]?.y || 50,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  // 7. Target Achievement
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSales = allSales.filter(sale => {
    const saleDate = sale.createdAt?.toDate?.() || sale.date?.toDate?.() || new Date();
    return saleDate >= monthStart && saleDate <= now;
  });

  const monthPaidSales = monthSales.filter(s => s.status === 'paid');
  const monthlyRevenue = monthPaidSales.reduce((sum, s) => sum + (s.amount || 0), 0);

  const monthActivities = allActivities.filter(activity => {
    const activityDate = activity.createdAt?.toDate?.() || new Date();
    return activityDate >= monthStart && activityDate <= now;
  });

  const monthCalls = monthActivities.filter(a => a.type === 'call').length;

  const monthCustomers = allCustomers.filter(customer => {
    const createdDate = customer.createdAt?.toDate?.() || new Date();
    return createdDate >= monthStart && createdDate <= now;
  }).length;

  const dealsCount = monthPaidSales.length;
  const conversionRate = monthSales.length > 0
    ? (monthPaidSales.length / monthSales.length) * 100
    : 0;

  const targetAchievement = [
    { name: 'Monthly Revenue', current: monthlyRevenue, target: targets.monthlyRevenue, color: TARGET_COLORS[0] },
    { name: 'New Customers', current: monthCustomers, target: targets.targetCustomers, color: TARGET_COLORS[1] },
    { name: 'Sales Calls', current: monthCalls, target: targets.targetCalls, color: TARGET_COLORS[2] },
    { name: 'Deals Closed', current: dealsCount, target: targets.targetDeals, color: TARGET_COLORS[3] },
    { name: 'Lead Conversion', current: Math.round(conversionRate), target: targets.targetConversionRate, color: TARGET_COLORS[4] },
  ];

  // 8. Sales by Status
  const statusCounts: Record<string, { count: number; amount: number }> = {
    'paid': { count: 0, amount: 0 },
    'pending': { count: 0, amount: 0 },
    'refunded': { count: 0, amount: 0 },
  };

  currentPeriodSales.forEach(sale => {
    const status = sale.status || 'pending';
    if (statusCounts[status]) {
      statusCounts[status].count++;
      statusCounts[status].amount += sale.amount || 0;
    }
  });

  const salesByStatus = Object.entries(statusCounts).map(([status, data]) => ({
    status,
    count: data.count,
    amount: data.amount,
  }));

  // 9. Recent Sales
  const recentSales = allSales
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || a.date?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || b.date?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10)
    .map(sale => ({
      ...sale,
      date: sale.date?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdAt: sale.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

  // 10. Sparkline data (daily sales for last 12 periods)
  const sparklineData: { value: number }[] = [];
  const sparklineDays = 12;
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = sparklineDays - 1; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - (i + 1) * dayMs);
    const dayEnd = new Date(now.getTime() - i * dayMs);

    const dayTotal = allSales
      .filter(sale => {
        const saleDate = sale.createdAt?.toDate?.() || sale.date?.toDate?.();
        return saleDate && saleDate >= dayStart && saleDate < dayEnd && sale.status === 'paid';
      })
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    sparklineData.push({ value: dayTotal });
  }

  return {
    totalSales,
    totalSalesPrevious,
    totalSalesChange: parseFloat(totalSalesChange.toFixed(1)),
    paidSalesCount: paidSales.length,
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
}

export async function getWeeklySalesPerformance(periodDays: number = 30) {
  const db = getAdminDb();
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const salesSnapshot = await db.collection('sales').get();

  const sales = salesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as SaleDoc));

  // Group sales by day
  const dailySales: Record<string, number> = {};
  const dayMs = 24 * 60 * 60 * 1000;

  // Initialize all days with 0
  for (let i = 0; i < periodDays; i++) {
    const day = new Date(periodStart.getTime() + i * dayMs);
    const dateKey = day.toISOString().split('T')[0];
    dailySales[dateKey] = 0;
  }

  // Sum sales by day (paid only)
  sales
    .filter(sale => sale.status === 'paid')
    .forEach(sale => {
      const saleDate = sale.createdAt?.toDate?.() || sale.date?.toDate?.();
      if (saleDate && saleDate >= periodStart && saleDate <= now) {
        const dateKey = saleDate.toISOString().split('T')[0];
        dailySales[dateKey] = (dailySales[dateKey] || 0) + (sale.amount || 0);
      }
    });

  return Object.entries(dailySales)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date,
      amount,
    }));
}

export async function getSalesByProduct(limit: number = 10) {
  const db = getAdminDb();
  const salesSnapshot = await db.collection('sales').get();

  const productSales: Record<string, number> = {};

  salesSnapshot.docs.forEach(doc => {
    const sale = doc.data() as SaleDoc;
    if (sale.status === 'paid') {
      const product = sale.product || sale.category || 'Other';
      productSales[product] = (productSales[product] || 0) + (sale.amount || 0);
    }
  });

  return Object.entries(productSales)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getTargets() {
  const db = getAdminDb();
  const targetsSnapshot = await db.collection('targets').limit(1).get();

  if (targetsSnapshot.empty) {
    return {
      monthlyRevenue: 1500000,
      targetCustomers: 50,
      targetCalls: 200,
      targetDeals: 35,
      targetConversionRate: 80,
    };
  }

  return targetsSnapshot.docs[0].data() as TargetDoc;
}

export async function updateTargets(targets: Partial<TargetDoc>) {
  const db = getAdminDb();
  const targetsRef = db.collection('targets').doc('current');

  await targetsRef.set({
    ...targets,
    updatedAt: Timestamp.now(),
  }, { merge: true });

  return { success: true };
}
