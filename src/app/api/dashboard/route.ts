import { NextRequest, NextResponse } from 'next/server';
import { getDashboardMetrics, getWeeklySalesPerformance, getSalesByProduct } from '@/services/dashboard';

// Default empty metrics when Firebase is not configured
const defaultMetrics = {
  totalSales: 0,
  totalSalesPrevious: 0,
  totalSalesChange: 0,
  paidSalesCount: 0,
  activitiesCount: 0,
  activitiesPrevious: 0,
  activitiesChange: 0,
  activitiesByType: [
    { name: 'Emails', value: 0, color: '#7c3aed' },
    { name: 'Calls', value: 0, color: '#8b5cf6' },
    { name: 'Meetings', value: 0, color: '#a855f7' },
    { name: 'Follow-ups', value: 0, color: '#d946ef' },
    { name: 'Other', value: 0, color: '#ec4899' },
  ],
  openLeads: 0,
  averageDealSize: 0,
  salesByState: [],
  targetAchievement: [
    { name: 'Monthly Revenue', current: 0, target: 1500000, color: '#7c3aed' },
    { name: 'New Customers', current: 0, target: 50, color: '#8b5cf6' },
    { name: 'Sales Calls', current: 0, target: 200, color: '#a855f7' },
    { name: 'Deals Closed', current: 0, target: 35, color: '#d946ef' },
    { name: 'Lead Conversion', current: 0, target: 80, color: '#ec4899' },
  ],
  salesByStatus: [
    { status: 'paid', count: 0, amount: 0 },
    { status: 'pending', count: 0, amount: 0 },
    { status: 'refunded', count: 0, amount: 0 },
  ],
  recentSales: [],
  sparklineData: Array(12).fill({ value: 0 }),
  weeklySales: [],
  productSales: [],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30', 10);

    const [metrics, weeklySales, productSales] = await Promise.all([
      getDashboardMetrics(period),
      getWeeklySalesPerformance(period),
      getSalesByProduct(10),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        weeklySales,
        productSales,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);

    // Return default empty metrics instead of error
    // This allows the dashboard to load even without Firebase Admin configured
    return NextResponse.json({
      success: true,
      data: defaultMetrics,
      warning: 'Firebase Admin not configured - showing empty data',
    });
  }
}
