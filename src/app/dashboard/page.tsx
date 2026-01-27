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
  BarChart3,
  Trash2,
  Plus,
  Package,
  ImageOff,
} from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme, COLOR_PALETTES } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc, collection, addDoc, Timestamp, serverTimestamp, getDocs } from 'firebase/firestore';
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
} from 'recharts';

// Customer names for test orders
const TEST_CUSTOMERS = [
  'John Smith', 'Maria Garcia', 'David Chen', 'Sarah Johnson', 'Mike Brown',
  'Emily Davis', 'Chris Wilson', 'Lisa Anderson', 'James Taylor', 'Anna Martinez',
];

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
  change,
  icon: Icon,
  iconBg,
  hideChange = false,
}: {
  title: string;
  value: string;
  change: number;
  icon: any;
  iconBg: string;
  hideChange?: boolean;
}) {
  const isPositive = change >= 0;
  const showChange = !hideChange && change !== 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-primary-accent/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {showChange && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-slate-400 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// Sales Report Bar Chart
function SalesReportChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
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
                className="h-full rounded-full bg-gradient-primary"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
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
  const { loading, normalizedSales } = useDashboardData(30);
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const { palette } = useTheme();
  const colors = COLOR_PALETTES[palette];

  // Clear analytics state
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [analyticsResetTimestamp, setAnalyticsResetTimestamp] = useState<Date | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);

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

  // Generate test order handler - fetches REAL products from Firestore
  const handleGenerateTestOrder = async () => {
    if (!user?.uid) {
      toast.error('You must be logged in to generate test orders.');
      return;
    }

    setIsGeneratingOrder(true);
    try {
      // Fetch products from Firestore products collection
      const productsSnapshot = await getDocs(collection(db, 'products'));

      if (productsSnapshot.empty) {
        toast.error('No products found. Please add products first.');
        setIsGeneratingOrder(false);
        return;
      }

      // Map products with their IDs
      const products: FirestoreProduct[] = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unknown Product',
        price: doc.data().price || 0,
        imageUrl: doc.data().imageUrl || '',
        category: doc.data().category || 'Uncategorized',
      }));

      // Select a random product
      const product = products[Math.floor(Math.random() * products.length)];
      const customer = TEST_CUSTOMERS[Math.floor(Math.random() * TEST_CUSTOMERS.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const totalAmount = product.price * quantity;
      const paymentMethod = ['Credit Card', 'Bank Transfer', 'PayPal', 'Cash'][Math.floor(Math.random() * 4)];

      // Random date within last 30 days (more recent for better visibility)
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      const orderTimestamp = Timestamp.fromDate(orderDate);
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Order data using REAL product data from Firestore
      const baseOrderData = {
        orderId: orderId,
        // Product reference fields
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl || '',
        // Legacy fields for compatibility
        product: product.name,
        category: product.category,
        image: product.imageUrl || '',
        // Financial data
        amount: totalAmount,
        price: product.price,
        quantity: quantity,
        // Customer data
        customer: customer,
        customerName: customer,
        // Order metadata
        status: 'paid',
        source: 'test',
        location: ['CA', 'NY', 'TX', 'FL', 'IL'][Math.floor(Math.random() * 5)],
        notes: `Test order - ${quantity}x ${product.name}`,
        // Timestamps
        createdAt: orderTimestamp,
        date: orderTimestamp,
        userId: user.uid,
      };

      console.log('Creating test order with real product:', {
        orderId,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        quantity,
        totalAmount,
      });

      // Write to all three collections: orders, transactions, sales
      const [orderRef, transactionRef, saleRef] = await Promise.all([
        addDoc(collection(db, 'orders'), baseOrderData),
        addDoc(collection(db, 'transactions'), {
          ...baseOrderData,
          type: 'sale',
          paymentMethod: paymentMethod,
        }),
        addDoc(collection(db, 'sales'), baseOrderData),
      ]);

      console.log('Test order created successfully:', {
        orderDocId: orderRef.id,
        transactionDocId: transactionRef.id,
        saleDocId: saleRef.id,
      });

      // Create notification for the new order
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          type: 'order',
          title: 'New test order created',
          message: `${quantity}x ${product.name} for $${totalAmount.toFixed(2)}`,
          read: false,
          createdAt: serverTimestamp(),
          link: '/dashboard/orders',
        });
      } catch (notifError) {
        console.warn('Failed to create notification (non-critical):', notifError);
      }

      toast.success(`Test order created: ${quantity}x ${product.name} ($${totalAmount.toFixed(2)})`);
    } catch (error: any) {
      console.error('Error generating test order:', error);

      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Please check Firestore rules.');
      } else if (error?.code === 'unauthenticated') {
        toast.error('Authentication required. Please log in again.');
      } else if (error?.message?.includes('network')) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(`Failed to generate test order: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setIsGeneratingOrder(false);
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

  // Calculate stats from filtered Firestore orders with proper delta calculations
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period (last 30 days) from filtered sales
    const currentPeriodSales = filteredSales.filter(s => new Date(s.date) >= thirtyDaysAgo);
    // Previous period (30-60 days ago) from filtered sales
    const previousPeriodSales = filteredSales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= sixtyDaysAgo && saleDate < thirtyDaysAgo;
    });

    // Current metrics (only completed/paid orders)
    const currentPaidSales = currentPeriodSales.filter(s => s.status === 'paid');
    const totalRevenue = currentPaidSales.reduce((sum, s) => sum + s.amount, 0);
    const totalTransactions = currentPaidSales.length;
    const uniqueCustomers = new Set(currentPaidSales.map(s => s.customer)).size;
    const productViewed = Math.floor(totalTransactions * 7);

    // Previous metrics (only completed/paid orders)
    const previousPaidSales = previousPeriodSales.filter(s => s.status === 'paid');
    const prevRevenue = previousPaidSales.reduce((sum, s) => sum + s.amount, 0);
    const prevTransactions = previousPaidSales.length;
    const prevUniqueCustomers = new Set(previousPaidSales.map(s => s.customer)).size;
    const prevProductViewed = Math.floor(prevTransactions * 7);

    // Calculate deltas
    const calcDelta = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    const hasCurrentData = totalRevenue > 0 || totalTransactions > 0;
    const hasPreviousData = prevRevenue > 0 || prevTransactions > 0;
    const showDeltas = hasCurrentData && hasPreviousData && !analyticsResetTimestamp;

    return {
      totalRevenue,
      totalTransactions,
      productViewed,
      uniqueUsers: uniqueCustomers,
      revenueChange: showDeltas ? calcDelta(totalRevenue, prevRevenue) : 0,
      transactionsChange: showDeltas ? calcDelta(totalTransactions, prevTransactions) : 0,
      viewsChange: showDeltas ? calcDelta(productViewed, prevProductViewed) : 0,
      usersChange: showDeltas ? calcDelta(uniqueCustomers, prevUniqueCustomers) : 0,
      hideDeltas: !showDeltas,
    };
  }, [filteredSales, analyticsResetTimestamp]);

  // Sales by platform data
  const salesByPlatform = useMemo(() => {
    const hasData = stats.totalRevenue > 0;
    return [
      { name: 'Website', value: hasData ? Math.round(stats.totalRevenue * 0.45) : 0, color: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})` },
      { name: 'Shopping', value: hasData ? Math.round(stats.totalRevenue * 0.25) : 0, color: `linear-gradient(90deg, ${colors.secondary}, #6366f1)` },
      { name: 'Amazon', value: hasData ? Math.round(stats.totalRevenue * 0.20) : 0, color: 'linear-gradient(90deg, #6366f1, #3b82f6)' },
      { name: 'Alibaba', value: hasData ? Math.round(stats.totalRevenue * 0.10) : 0, color: 'linear-gradient(90deg, #3b82f6, #06b6d4)' },
    ];
  }, [stats.totalRevenue, colors]);

  // Traffic data
  const trafficData = useMemo(() => {
    const hasData = stats.totalTransactions > 0;
    const baseViews = stats.totalTransactions * 50;
    return [
      { name: 'Website', views: hasData ? `${Math.round(baseViews * 0.5 / 1000)}k` : '0', percentage: hasData ? 80 : 0 },
      { name: 'Instagram Ads', views: hasData ? `${Math.round(baseViews * 0.25 / 1000)}k` : '0', percentage: hasData ? 45 : 0 },
      { name: 'Facebook Ads', views: hasData ? `${Math.round(baseViews * 0.25 / 1000)}k` : '0', percentage: hasData ? 65 : 0 },
    ];
  }, [stats.totalTransactions]);

  // Popular products from Firestore sales - grouped by productId with images
  const popularProducts = useMemo(() => {
    // Filter to only completed (paid) orders
    const completedOrders = filteredSales.filter(sale => sale.status === 'paid');

    if (completedOrders.length === 0) {
      return [];
    }

    // Group by productId (or productName as fallback) and track image
    const productMap = new Map<string, {
      productId: string;
      name: string;
      image: string;
      quantity: number;
      revenue: number;
    }>();

    completedOrders.forEach(sale => {
      // Use productId if available, otherwise use product name as key
      const saleData = sale as any;
      const productId = saleData.productId || saleData.product || 'unknown';
      const productName = saleData.productName || saleData.product || 'Unknown Product';
      const productImage = saleData.productImage || saleData.image || '';
      const qty = saleData.quantity || 1;

      const existing = productMap.get(productId);
      if (existing) {
        existing.quantity += qty;
        existing.revenue += sale.amount;
        // Keep the first non-empty image found
        if (!existing.image && productImage) {
          existing.image = productImage;
        }
      } else {
        productMap.set(productId, {
          productId,
          name: productName,
          image: productImage,
          quantity: qty,
          revenue: sale.amount,
        });
      }
    });

    // Sort by quantity sold and take top 6
    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  }, [filteredSales]);

  // Monthly sales chart data
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
          title="Total Revenues"
          value={formatAmount(stats.totalRevenue)}
          change={stats.revenueChange}
          icon={DollarSign}
          iconBg="bg-gradient-primary"
          hideChange={stats.hideDeltas}
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions.toLocaleString()}
          change={stats.transactionsChange}
          icon={ShoppingCart}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
          hideChange={stats.hideDeltas}
        />
        <StatCard
          title="Product Viewed"
          value={stats.productViewed.toLocaleString()}
          change={stats.viewsChange}
          icon={Eye}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-600"
          hideChange={stats.hideDeltas}
        />
        <StatCard
          title="Unique Users"
          value={stats.uniqueUsers.toLocaleString()}
          change={stats.usersChange}
          icon={Users}
          iconBg="bg-gradient-to-br from-orange-500 to-red-500"
          hideChange={stats.hideDeltas}
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

          <Link href="/dashboard/products" className="block w-full mt-4 py-3 btn-gradient-primary text-white rounded-xl font-medium transition-all text-center">
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
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
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
