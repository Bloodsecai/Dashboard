import { Timestamp } from 'firebase/firestore';

export interface Sale {
  id: string;
  amount: number;
  product: string;
  category?: string;
  customer?: string;
  customerName?: string;
  notes?: string;
  status: 'paid' | 'pending' | 'refunded';
  location?: string; // US state code (e.g., 'CA', 'TX', 'NY')
  source: 'manual' | 'google_sheets' | 'n8n';
  date: Timestamp;
  createdAt: Timestamp;
  importFingerprint?: string;
}

export type ActivityType = 'email' | 'call' | 'meeting' | 'follow-up' | 'other';

export interface Activity {
  id: string;
  type: ActivityType;
  description?: string;
  salesId?: string;
  customerId?: string;
  createdAt: Timestamp;
}

export interface Target {
  id?: string;
  monthlyRevenue: number;
  targetCustomers: number;
  targetCalls: number;
  targetDeals: number;
  targetConversionRate: number;
  month?: string; // Format: 'YYYY-MM'
  updatedAt?: Timestamp;
}

export interface DashboardMetrics {
  totalSales: number;
  totalSalesPrevious: number;
  totalSalesChange: number;
  paidSalesCount: number;
  activitiesCount: number;
  activitiesPrevious: number;
  activitiesChange: number;
  activitiesByType: {
    name: string;
    value: number;
    color: string;
  }[];
  openLeads: number;
  averageDealSize: number;
  salesByState: {
    code: string;
    name: string;
    sales: number;
    x: number;
    y: number;
  }[];
  targetAchievement: {
    name: string;
    current: number;
    target: number;
    color: string;
  }[];
  salesByStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
  recentSales: Sale[];
  sparklineData: { value: number }[];
}

export interface ImportRecord {
  id: string;
  timestamp: Timestamp;
  recordCount: number;
  sheetUrl: string;
  status: 'success' | 'partial' | 'failed';
  importedCount?: number;
  skippedCount?: number;
}

export interface CustomField {
  name: string;
  value: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  customFields: Record<string, string>;
  totalSpent: number;
  orderCount: number;
  lastPurchase?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}