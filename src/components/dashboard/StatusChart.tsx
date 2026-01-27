'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Sale } from '@/types';
import { PieChart as PieChartIcon } from 'lucide-react';

interface StatusChartProps {
  sales?: Sale[];
  data?: { status: string; count: number; amount: number }[];
}

const COLORS = {
  paid: '#10b981',
  pending: '#f59e0b',
  refunded: '#ef4444',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-xl p-3 border border-white/10 shadow-xl">
        <p className="text-sm text-text-secondary mb-1">{payload[0].name}</p>
        <p className="text-lg font-bold text-white">{payload[0].value} sales</p>
      </div>
    );
  }
  return null;
};

export function StatusChart({ sales, data: preAggregatedData }: StatusChartProps) {
  const data = useMemo(() => {
    // If pre-aggregated data is provided, use it
    if (preAggregatedData && preAggregatedData.length > 0) {
      return preAggregatedData.map(d => ({
        name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
        value: d.count,
        color: COLORS[d.status as keyof typeof COLORS] || '#71717a',
      }));
    }

    // Fall back to calculating from sales array
    if (!sales || sales.length === 0) {
      return [
        { name: 'Paid', value: 0, color: COLORS.paid },
        { name: 'Pending', value: 0, color: COLORS.pending },
        { name: 'Refunded', value: 0, color: COLORS.refunded },
      ];
    }

    const statusCount = sales.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: COLORS[status as keyof typeof COLORS] || '#71717a',
    }));
  }, [sales, preAggregatedData]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="relative">
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <PieChartIcon className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-text-secondary">No status data</p>
            <p className="text-sm text-text-muted mt-1">Sales status breakdown will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <filter key={`glow-${index}`} id={`glow-${entry.name}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{
                    filter: `drop-shadow(0 0 8px ${entry.color}80)`,
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-3xl font-bold text-white">{total}</p>
          <p className="text-xs text-text-muted">Total Sales</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: entry.color,
                boxShadow: `0 0 8px ${entry.color}80`,
              }}
            />
            <span className="text-sm text-text-secondary">{entry.name}</span>
            <span className="text-sm font-medium text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
