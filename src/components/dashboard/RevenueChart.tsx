'use client';

import { useMemo, useState } from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Sale } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';

interface RevenueChartProps {
  sales?: Sale[];
  data?: { date: string; amount: number }[];
}

const CustomTooltip = ({ active, payload, label, formatAmount }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-xl p-4 border border-white/10 shadow-xl">
        <p className="text-sm text-text-secondary mb-1">{label}</p>
        <p className="text-lg font-bold text-white">{formatAmount(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ sales, data: preAggregatedData }: RevenueChartProps) {
  const [period, setPeriod] = useState<'30' | '60' | '90'>('30');
  const { formatAmount } = useCurrency();

  const days = parseInt(period);

  const data = useMemo(() => {
    // If pre-aggregated data is provided, use it filtered by period
    if (preAggregatedData && preAggregatedData.length > 0) {
      const filteredData = preAggregatedData.slice(-days);
      return filteredData.map(d => ({
        date: format(new Date(d.date), 'MMM dd'),
        amount: d.amount || 0,
      }));
    }

    // Fall back to calculating from sales array
    if (!sales || sales.length === 0) {
      // Generate empty data for the period
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      return dateRange.map(date => ({
        date: format(date, 'MMM dd'),
        amount: 0,
      }));
    }

    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    return dateRange.map(date => {
      const daySales = sales.filter(sale => {
        const saleDate = sale.date?.toDate?.() || new Date(sale.date as unknown as string);
        return format(saleDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      const revenue = daySales
        .filter(sale => sale.status === 'paid')
        .reduce((sum, sale) => sum + (sale.amount || 0), 0);

      return {
        date: format(date, 'MMM dd'),
        amount: revenue,
      };
    });
  }, [sales, preAggregatedData, days]);

  // Calculate total and percentage change
  const totalRevenue = data.reduce((sum, d) => sum + d.amount, 0);
  const halfLength = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, halfLength).reduce((sum, d) => sum + d.amount, 0);
  const secondHalf = data.slice(halfLength).reduce((sum, d) => sum + d.amount, 0);
  const percentageChange = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  const isPositive = percentageChange >= 0;

  return (
    <div>
      {/* Period Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['30', '60', '90'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                period === p
                  ? 'bg-gradient-to-r from-primary-purple to-primary-pink text-white shadow-glow-sm'
                  : 'glass text-text-secondary hover:text-white hover:bg-white/10'
              }`}
            >
              {p}D
            </button>
          ))}
        </div>

        {/* Percentage Change Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          isPositive
            ? 'bg-success/10 text-success'
            : 'bg-danger/10 text-danger'
        }`}>
          {isPositive ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {Math.abs(percentageChange).toFixed(1)}% vs previous
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#ec4899" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="strokeRevenue" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                return value.toString();
              }}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip formatAmount={formatAmount} />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="url(#strokeRevenue)"
              strokeWidth={3}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
