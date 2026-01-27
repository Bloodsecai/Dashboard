'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  BarChart3,
  Trash2,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
}: {
  title: string;
  value: string;
  change: number;
  icon: any;
  iconBg: string;
}) {
  const isPositive = change >= 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-pink-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
        </div>
      </div>
      <h3 className="text-slate-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
      <button className="mt-4 text-pink-400 text-sm font-medium flex items-center gap-1 hover:text-pink-300 transition-colors">
        View Details <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Sales Report Bar Chart
function SalesReportChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1); // Prevent division by zero
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">{item.name}</span>
            <span className="text-white font-medium">${item.value.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Traffic Analytics
function TrafficAnalytics({ data }: { data: { name: string; views: string; percentage: number }[] }) {
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">{item.name}</span>
              <span className="text-white font-medium">{item.views}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { metrics, weeklySales, productSales, loading, normalizedSales } = useDashboardData(30);
  const { formatAmount } = useCurrency();
  const { user } = useAuth();

  // Clear analytics state
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

  // Clear analytics handler
  const handleClearAnalytics = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to clear analytics.');
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
      toast.success('Analytics cleared.');
    } catch (error) {
      console.error('Error clearing analytics:', error);
      toast.error('Failed to clear analytics.');
    } finally {
      setIsClearing(false);
    }
  };

  // Filter sales based on analytics reset timestamp
  const filteredSales = useMemo(() => {
    if (!analyticsResetTimestamp) return normalizedSales;
    return normalizedSales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate > analyticsResetTimestamp;
    });
  }, [normalizedSales, analyticsResetTimestamp]);

  // Calculate stats from filtered Firebase data
  const stats = useMemo(() => {
    const totalRevenue = filteredSales
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.amount, 0);

    const totalTransactions = filteredSales.length;
    const uniqueCustomers = new Set(filteredSales.map(s => s.customer)).size;

    return {
      totalRevenue,
      totalTransactions,
      productViewed: Math.floor(totalTransactions * 7), // Estimate
      uniqueUsers: uniqueCustomers,
    };
  }, [filteredSales]);

  // Sales by platform data
  const salesByPlatform = useMemo(() => [
    { name: 'Website', value: stats.totalRevenue * 0.45, color: 'linear-gradient(90deg, #ec4899, #8b5cf6)' },
    { name: 'Shopping', value: stats.totalRevenue * 0.25, color: 'linear-gradient(90deg, #8b5cf6, #6366f1)' },
    { name: 'Amazon', value: stats.totalRevenue * 0.20, color: 'linear-gradient(90deg, #6366f1, #3b82f6)' },
    { name: 'Alibaba', value: stats.totalRevenue * 0.10, color: 'linear-gradient(90deg, #3b82f6, #06b6d4)' },
  ], [stats.totalRevenue]);

  // Traffic data (calculated based on filtered sales)
  const trafficData = useMemo(() => {
    const hasData = filteredSales.length > 0;
    return [
      { name: 'Website', views: hasData ? '100k' : '0', percentage: hasData ? 80 : 0 },
      { name: 'Instagram Ads', views: hasData ? '52k' : '0', percentage: hasData ? 45 : 0 },
      { name: 'Facebook Ads', views: hasData ? '78k' : '0', percentage: hasData ? 65 : 0 },
    ];
  }, [filteredSales]);

  // Popular products from sales data
  const popularProducts = useMemo(() => {
    const productMap = new Map<string, number>();
    normalizedSales.forEach(sale => {
      const current = productMap.get(sale.product) || 0;
      productMap.set(sale.product, current + sale.amount);
    });
    return Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, revenue]) => ({ name, revenue }));
  }, [normalizedSales]);

  // Monthly sales chart data (uses filtered sales for analytics reset)
  const monthlySalesData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    return months.slice(0, currentMonth + 1).map((month, index) => {
      const monthSales = filteredSales.filter(s => {
        const saleMonth = new Date(s.date).getMonth();
        return saleMonth === index && s.status === 'paid';
      });
      return {
        name: month,
        sales: monthSales.reduce((sum, s) => sum + s.amount, 0),
      };
    });
  }, [filteredSales]);

  if (loading || loadingPreferences) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <p className="text-slate-400 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview Analytics</h1>
          <p className="text-slate-400 mt-1">Welcome back! Here's what's happening with your store.</p>
        </div>
        <Button
          variant="secondary"
          icon={Trash2}
          onClick={() => setShowClearModal(true)}
          className="self-start sm:self-auto border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 text-red-400"
        >
          Clear All Analytics
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenues"
          value={formatAmount(stats.totalRevenue)}
          change={8.1}
          icon={DollarSign}
          iconBg="bg-gradient-to-br from-pink-500 to-purple-600"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions.toLocaleString()}
          change={3.1}
          icon={ShoppingCart}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Product Viewed"
          value={stats.productViewed.toLocaleString()}
          change={7.6}
          icon={Eye}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-600"
        />
        <StatCard
          title="Unique Users"
          value={stats.uniqueUsers.toLocaleString()}
          change={3.9}
          icon={Users}
          iconBg="bg-gradient-to-br from-orange-500 to-red-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Report */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Sales Report</h2>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <SalesReportChart data={salesByPlatform} />
        </div>

        {/* Traffic Analytics */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Traffic Analytics</h2>
              <p className="text-slate-400 text-sm">Total views from 3 platforms</p>
            </div>
          </div>
          <TrafficAnalytics data={trafficData} />
        </div>

        {/* Popular Products */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Popular Products</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {popularProducts.map((product, index) => (
              <div
                key={index}
                className="aspect-square bg-slate-700/50 rounded-xl flex items-center justify-center p-3 hover:bg-slate-700 transition-colors cursor-pointer border border-white/5 hover:border-pink-500/30"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-pink-400 text-lg">📦</span>
                  </div>
                  <p className="text-white text-xs font-medium truncate">{product.name.slice(0, 15)}</p>
                  <p className="text-slate-400 text-xs">{formatAmount(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/products" className="block w-full mt-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all text-center">
            See all products
          </Link>
        </div>
      </div>

      {/* Sales Analytics Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Sales Analytics</h2>
            <p className="text-slate-400 text-sm">Monthly sales performance</p>
          </div>
          <select className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-white/10">
            <option>This Year</option>
            <option>Last Year</option>
          </select>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySalesData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                }}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Sales']}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#ec4899"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clear Analytics Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Analytics"
        size="sm"
      >
        <div className="space-y-6">
          <p className="text-slate-300">
            Are you sure you want to clear your analytics?
          </p>
          <p className="text-sm text-slate-400">
            This will reset all analytics values to zero. Your sales records and products will remain unchanged.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowClearModal(false)}
            >
              Back
            </Button>
            <Button
              variant="danger"
              onClick={handleClearAnalytics}
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
