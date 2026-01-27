'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sale } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Package } from 'lucide-react';

interface ProductChartProps {
  sales?: Sale[];
  data?: { name: string; revenue: number }[];
}

const CustomTooltip = ({ active, payload, formatAmount }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-xl p-4 border border-white/10 shadow-xl">
        <p className="text-sm text-text-secondary mb-1">{payload[0].payload.fullName || payload[0].payload.product || payload[0].payload.name}</p>
        <p className="text-lg font-bold text-white">{formatAmount(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function ProductChart({ sales, data: preAggregatedData }: ProductChartProps) {
  const { formatAmount } = useCurrency();

  const data = useMemo(() => {
    // If pre-aggregated data is provided, use it
    if (preAggregatedData && preAggregatedData.length > 0) {
      return preAggregatedData.map(d => ({
        product: d.name.length > 25 ? d.name.substring(0, 25) + '...' : d.name,
        fullName: d.name,
        revenue: d.revenue || 0,
      }));
    }

    // Fall back to calculating from sales array
    if (!sales || sales.length === 0) {
      return [];
    }

    const productMap = new Map<string, number>();

    sales
      .filter(sale => sale.status === 'paid')
      .forEach(sale => {
        const product = sale.product || sale.category || 'Other';
        const current = productMap.get(product) || 0;
        productMap.set(product, current + (sale.amount || 0));
      });

    return Array.from(productMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([product, revenue]) => ({
        product: product.length > 25 ? product.substring(0, 25) + '...' : product,
        fullName: product,
        revenue,
      }));
  }, [sales, preAggregatedData]);

  // Color gradient from purple to pink based on index
  const getBarColor = (index: number) => {
    const colors = [
      '#7c3aed', // purple
      '#8b5cf6',
      '#a855f7',
      '#c084fc',
      '#d946ef',
      '#e879f9',
      '#ec4899', // pink
      '#f472b6',
    ];
    return colors[index % colors.length];
  };

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-text-muted" />
          </div>
          <p className="text-text-secondary">No product data</p>
          <p className="text-sm text-text-muted mt-1">Sales by product will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <XAxis
            type="number"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
              return value.toString();
            }}
          />
          <YAxis
            type="category"
            dataKey="product"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={140}
            tick={{ fill: '#a1a1aa' }}
          />
          <Tooltip
            content={<CustomTooltip formatAmount={formatAmount} />}
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
          />
          <Bar
            dataKey="revenue"
            radius={[0, 6, 6, 0]}
            maxBarSize={32}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(index)}
                style={{
                  filter: `drop-shadow(0 0 8px ${getBarColor(index)}40)`,
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
