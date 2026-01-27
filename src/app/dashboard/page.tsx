'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Eye,
  Users,
  BarChart3,
  Trash2,
  Plus,
  Package,
  ImageOff,
  PieChart as PieChartIcon,
  List,
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme, COLOR_PALETTES } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

// Product type from Firestore
interface FirestoreProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
}: {
  title: string;
  value: string;
  icon: any;
  iconBg: string;
}) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-primary-accent/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-slate-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// Sales Report Donut Chart
function SalesReportDonut({
  data,
  colors,
  formatAmount,
}: {
  data: { name: string; value: number }[];
  colors: { primary: string; secondary: string; accent: string };
  formatAmount: (amount: number) => string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartColors = [colors.primary, colors.secondary, colors.accent];

  // Filter out zero values for the pie but keep all for legend
  const chartData = data.filter((item) => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-slate-300 text-sm">{payload[0].name}</p>
          <p className="text-white font-semibold">{formatAmount(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData.length > 0 ? chartData : [{ name: 'No Data', value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={chartData.length > 1 ? 4 : 0}
              dataKey="value"
              cornerRadius={4}
              stroke="none"
            >
              {chartData.length > 0 ? (
                chartData.map((entry, index) => {
                  const originalIndex = data.findIndex((d) => d.name === entry.name);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[originalIndex % chartColors.length]}
                    />
                  );
                })
              ) : (
                <Cell fill="#475569" />
              )}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-slate-400 text-xs">Total</span>
          <span className="text-white font-bold text-lg">{formatAmount(total)}</span>
        </div>
      </div>
      {/* Legend */}
      <div className="w-full mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chartColors[index % chartColors.length] }}
              />
              <span className="text-slate-300 text-sm">{item.name}</span>
            </div>
            <span className="text-white font-medium text-sm">{formatAmount(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Traffic Analytics Donut Chart
function TrafficAnalyticsDonut({
  data,
  colors,
}: {
  data: { name: string; views: number }[];
  colors: { primary: string; secondary: string; accent: string };
}) {
  const total = data.reduce((sum, item) => sum + item.views, 0);
  const chartColors = [colors.primary, colors.secondary, colors.accent];

  // Filter out zero values for the pie but keep all for legend
  const chartData = data.filter((item) => item.views > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-slate-300 text-sm">{payload[0].name}</p>
          <p className="text-white font-semibold">{payload[0].value.toLocaleString()} views</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData.length > 0 ? chartData : [{ name: 'No Data', views: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={chartData.length > 1 ? 4 : 0}
              dataKey="views"
              cornerRadius={4}
              stroke="none"
            >
              {chartData.length > 0 ? (
                chartData.map((entry, index) => {
                  const originalIndex = data.findIndex((d) => d.name === entry.name);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[originalIndex % chartColors.length]}
                    />
                  );
                })
              ) : (
                <Cell fill="#475569" />
              )}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-slate-400 text-xs">Total</span>
          <span className="text-white font-bold text-lg">{total.toLocaleString()}</span>
        </div>
      </div>
      {/* Legend */}
      <div className="w-full mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chartColors[index % chartColors.length] }}
              />
              <span className="text-slate-300 text-sm">{item.name}</span>
            </div>
            <span className="text-white font-medium text-sm">{item.views.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sales Report Standard Bar View
function SalesReportStandard({
  data,
  colors,
  formatAmount,
}: {
  data: { name: string; value: number }[];
  colors: { primary: string; secondary: string; accent: string };
  formatAmount: (amount: number) => string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartColors = [colors.primary, colors.secondary, colors.accent];

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.name}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">{item.name}</span>
            <span className="text-white font-medium">{formatAmount(item.value)}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Traffic Analytics Standard Bar View
function TrafficAnalyticsStandard({
  data,
  colors,
}: {
  data: { name: string; views: number }[];
  colors: { primary: string; secondary: string; accent: string };
}) {
  const maxValue = Math.max(...data.map((d) => d.views), 1);
  const chartColors = [colors.primary, colors.secondary, colors.accent];

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={item.name}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">{item.name}</span>
            <span className="text-white font-medium">{item.views.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.views / maxValue) * 100}%`,
                backgroundColor: chartColors[index % chartColors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// View Toggle Button Component
function ViewToggleButton({
  isDonut,
  onToggle,
}: {
  isDonut: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg bg-slate-700/50 border border-white/10 hover:border-white/20 hover:bg-slate-700 transition-all group relative"
      title={isDonut ? 'View Standard' : 'View Donut'}
    >
      {isDonut ? (
        <List className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
      ) : (
        <PieChartIcon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
      )}
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {isDonut ? 'View Standard' : 'View Donut'}
      </span>
    </button>
  );
}

// Product Image Component with fallback
function ProductThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-full h-full bg-slate-600/50 flex items-center justify-center">
        <ImageOff className="w-5 h-5 text-slate-500" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

export default function DashboardPage() {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const { palette } = useTheme();
  const colors = COLOR_PALETTES[palette];

  // Firestore orders state (realtime)
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isServerReady, setIsServerReady] = useState(false);

  // UI state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [analyticsResetTimestamp, setAnalyticsResetTimestamp] = useState<Date | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
  const [salesTimeRange, setSalesTimeRange] = useState<'7d' | '14d' | '1m' | '1y'>('1y');

  // View toggle state (purely presentational - does not affect data)
  const [salesReportView, setSalesReportView] = useState<'donut' | 'standard'>('donut');
  const [trafficAnalyticsView, setTrafficAnalyticsView] = useState<'donut' | 'standard'>('donut');

  // Realtime listener for orders collection
  // Only render data from server (not cache) to prevent ghost rows
  useEffect(() => {
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        // Check if this is from cache or server
        const fromCache = snapshot.metadata.fromCache;

        // If from cache and server not ready yet, skip updating state
        // This prevents ghost rows from appearing during initial load
        if (fromCache && !isServerReady) {
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
          setIsServerReady(true);
        }

        setLoadingOrders(false);
      },
      (error) => {
        console.error('Error listening to orders:', error);
        toast.error('Failed to load orders');
        setLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, [isServerReady]);

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

  // Filter orders based on analytics reset timestamp
  const filteredOrders = useMemo(() => {
    if (!analyticsResetTimestamp) return orders;
    return orders.filter((order) => order.createdAt > analyticsResetTimestamp);
  }, [orders, analyticsResetTimestamp]);

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
      toast.success('Analytics cleared.');
    } catch (error) {
      console.error('Error clearing analytics:', error);
      toast.error('Failed to clear analytics.');
    } finally {
      setIsClearing(false);
    }
  };

  // Generate test order - fetches REAL products from Firestore
  const handleGenerateTestOrder = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to generate test orders.');
      return;
    }

    setIsGeneratingOrder(true);
    try {
      // Fetch all products from Firestore
      const productsSnapshot = await getDocs(collection(db, 'products'));

      if (productsSnapshot.empty) {
        toast.error('No products found. Please add products first.');
        setIsGeneratingOrder(false);
        return;
      }

      // Map products with their IDs
      const products: FirestoreProduct[] = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || 'Unknown Product',
        price: doc.data().price || 0,
        imageUrl: doc.data().imageUrl || '',
        category: doc.data().category || 'Uncategorized',
      }));

      // Randomly select ONE product
      const product = products[Math.floor(Math.random() * products.length)];

      // Generate order ID
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create order document in Firestore
      const orderData = {
        orderId: orderId,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || '',
        amount: product.price,
        customer: 'Test Customer',
        paymentMethod: 'Test',
        status: 'ordered',
        createdAt: serverTimestamp(),
        userId: user.uid,
      };

      console.log('Creating test order:', orderData);

      await addDoc(collection(db, 'orders'), orderData);

      toast.success(`Test order created: ${product.name} ($${product.price.toFixed(2)})`);
    } catch (error: any) {
      console.error('Error generating test order:', error);

      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Please check Firestore rules.');
      } else {
        toast.error(`Failed to generate test order: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setIsGeneratingOrder(false);
    }
  };

  // Dashboard Analytics - derived from orders
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.amount, 0);
    const totalTransactions = filteredOrders.length;
    const uniqueUsers = new Set(filteredOrders.map((order) => order.customer)).size;

    return {
      totalRevenue,
      totalTransactions,
      productViewed: 0, // Keep at 0 as per requirements
      uniqueUsers,
    };
  }, [filteredOrders]);

  // Sales Report - Shopping = Website = sum(amount), Others = 0
  const salesByPlatform = useMemo(() => {
    const totalAmount = stats.totalRevenue;
    return [
      { name: 'Shopping', value: totalAmount },
      { name: 'Website', value: totalAmount },
      { name: 'Others', value: 0 },
    ];
  }, [stats.totalRevenue]);

  // Traffic data
  const trafficData = useMemo(() => {
    return [
      { name: 'Website', views: stats.totalTransactions },
      { name: 'Instagram Ads', views: 0 },
      { name: 'Facebook Ads', views: 0 },
    ];
  }, [stats.totalTransactions]);

  // Popular Products - grouped by productId, sorted by quantity
  const popularProducts = useMemo(() => {
    if (filteredOrders.length === 0) {
      return [];
    }

    // Group by productId and count quantity
    const productMap = new Map<
      string,
      {
        productId: string;
        name: string;
        image: string;
        quantity: number;
      }
    >();

    filteredOrders.forEach((order) => {
      const productId = order.productId || order.productName;
      const existing = productMap.get(productId);

      if (existing) {
        existing.quantity += 1;
      } else {
        productMap.set(productId, {
          productId,
          name: order.productName,
          image: order.productImage,
          quantity: 1,
        });
      }
    });

    // Sort by quantity (highest first) and take top 6
    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [filteredOrders]);

  // Sales chart data - filtered by time range and aggregated
  const salesChartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let aggregateByMonth = false;

    switch (salesTimeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '14d':
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getFullYear(), 0, 1); // Start of current year
        aggregateByMonth = true;
        break;
    }

    // Filter orders by date range
    const rangeOrders = filteredOrders.filter((order) => order.createdAt >= startDate);

    if (aggregateByMonth) {
      // Aggregate by month for 1y view
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = now.getMonth();

      return months.slice(0, currentMonth + 1).map((month, index) => {
        const monthOrders = rangeOrders.filter((order) => order.createdAt.getMonth() === index);
        return {
          name: month,
          sales: monthOrders.reduce((sum, order) => sum + order.amount, 0),
        };
      });
    } else {
      // Aggregate by day for 7d/14d/1m views
      const dayMap = new Map<string, number>();

      // Initialize all days in range
      const daysInRange = salesTimeRange === '7d' ? 7 : salesTimeRange === '14d' ? 14 : 30;
      for (let i = daysInRange - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayMap.set(key, 0);
      }

      // Sum amounts by day
      rangeOrders.forEach((order) => {
        const key = order.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dayMap.has(key)) {
          dayMap.set(key, (dayMap.get(key) || 0) + order.amount);
        }
      });

      return Array.from(dayMap.entries()).map(([name, sales]) => ({ name, sales }));
    }
  }, [filteredOrders, salesTimeRange]);

  // Get label for time range
  const timeRangeLabel = useMemo(() => {
    switch (salesTimeRange) {
      case '7d': return 'Last 7 days';
      case '14d': return 'Last 14 days';
      case '1m': return 'Last 30 days';
      case '1y': return 'This year';
    }
  }, [salesTimeRange]);

  // Show loading until server data is ready (prevents ghost rows from cache)
  if (loadingOrders || loadingPreferences || !isServerReady) {
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
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            icon={Plus}
            onClick={handleGenerateTestOrder}
            loading={isGeneratingOrder}
          >
            Generate Test Order
          </Button>
          <Button
            variant="secondary"
            icon={Trash2}
            onClick={() => setShowClearModal(true)}
            className="border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10 text-red-400"
          >
            Clear All Analytics
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={formatAmount(stats.totalRevenue)}
          icon={DollarSign}
          iconBg="bg-gradient-primary"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions.toLocaleString()}
          icon={ShoppingCart}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
        />
        <StatCard
          title="Product Viewed"
          value={stats.productViewed.toLocaleString()}
          icon={Eye}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-600"
        />
        <StatCard
          title="Unique Users"
          value={stats.uniqueUsers.toLocaleString()}
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
            <div className="flex items-center gap-2">
              <ViewToggleButton
                isDonut={salesReportView === 'donut'}
                onToggle={() => setSalesReportView(salesReportView === 'donut' ? 'standard' : 'donut')}
              />
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          {salesReportView === 'donut' ? (
            <SalesReportDonut data={salesByPlatform} colors={colors} formatAmount={formatAmount} />
          ) : (
            <SalesReportStandard data={salesByPlatform} colors={colors} formatAmount={formatAmount} />
          )}
        </div>

        {/* Traffic Analytics */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Traffic Analytics</h2>
              <p className="text-slate-400 text-sm">Total views from platforms</p>
            </div>
            <ViewToggleButton
              isDonut={trafficAnalyticsView === 'donut'}
              onToggle={() => setTrafficAnalyticsView(trafficAnalyticsView === 'donut' ? 'standard' : 'donut')}
            />
          </div>
          {trafficAnalyticsView === 'donut' ? (
            <TrafficAnalyticsDonut data={trafficData} colors={colors} />
          ) : (
            <TrafficAnalyticsStandard data={trafficData} colors={colors} />
          )}
        </div>

        {/* Popular Products */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Popular Products</h2>
            <span className="text-xs text-slate-400">By quantity sold</span>
          </div>

          {popularProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm mb-2">No sales yet</p>
              <p className="text-slate-500 text-xs">Generate test orders to see popular products</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {popularProducts.map((product) => (
                <div
                  key={product.productId}
                  className="aspect-square bg-slate-700/50 rounded-xl overflow-hidden hover:bg-slate-700 transition-colors cursor-pointer border border-white/5 hover:border-primary-accent/30"
                >
                  <div className="flex flex-col h-full">
                    {/* Product Image */}
                    <div className="flex-1 min-h-0 relative">
                      <ProductThumbnail src={product.image} alt={product.name} />
                    </div>
                    {/* Product Info */}
                    <div className="p-2 bg-slate-800/80">
                      <p className="text-white text-xs font-medium truncate">{product.name}</p>
                      <p className="text-slate-400 text-xs">{product.quantity} sold</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/dashboard/products"
            className="block w-full mt-4 py-3 btn-gradient-primary text-white rounded-xl font-medium transition-all text-center"
          >
            See all products
          </Link>
        </div>
      </div>

      {/* Sales Analytics Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Sales Analytics</h2>
            <p className="text-slate-400 text-sm">
              {salesTimeRange === '1y' ? 'Monthly' : 'Daily'} sales performance - {timeRangeLabel}
            </p>
          </div>
          <select
            value={salesTimeRange}
            onChange={(e) => setSalesTimeRange(e.target.value as '7d' | '14d' | '1m' | '1y')}
            className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="1m">Last 1 month</option>
            <option value="1y">Last 1 year</option>
          </select>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesChartData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
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
                stroke={colors.primary}
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
          <p className="text-slate-300">Are you sure you want to clear your analytics?</p>
          <p className="text-sm text-slate-400">
            This will reset all analytics values to zero. Your order records will remain unchanged.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowClearModal(false)}>
              Back
            </Button>
            <Button variant="danger" onClick={handleClearAnalytics} loading={isClearing}>
              Yes, Clear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
