'use client';

import { LucideIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  chartData?: { value: number }[];
  variant?: 'default' | 'large' | 'compact';
  accentColor?: 'purple' | 'pink' | 'green' | 'blue';
}

const defaultChartData = [
  { value: 20 }, { value: 35 }, { value: 25 }, { value: 45 },
  { value: 30 }, { value: 55 }, { value: 40 }, { value: 65 },
  { value: 45 }, { value: 70 }, { value: 55 }, { value: 80 }
];

const colorMap = {
  purple: {
    gradient: ['#7c3aed', '#8b5cf6'],
    glow: 'rgba(124, 58, 237, 0.3)',
    bg: 'from-primary-purple/20 to-primary-purple/5',
  },
  pink: {
    gradient: ['#ec4899', '#f472b6'],
    glow: 'rgba(236, 72, 153, 0.3)',
    bg: 'from-primary-pink/20 to-primary-pink/5',
  },
  green: {
    gradient: ['#10b981', '#34d399'],
    glow: 'rgba(16, 185, 129, 0.3)',
    bg: 'from-success/20 to-success/5',
  },
  blue: {
    gradient: ['#3b82f6', '#60a5fa'],
    glow: 'rgba(59, 130, 246, 0.3)',
    bg: 'from-info/20 to-info/5',
  },
};

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle = 'vs previous period',
  chartData = defaultChartData,
  variant = 'default',
  accentColor = 'purple',
}: KPICardProps) {
  const colors = colorMap[accentColor];
  const gradientId = `gradient-${title.replace(/\s+/g, '-')}`;

  if (variant === 'large') {
    return (
      <div className="glass-card rounded-2xl p-6 card-hover-lift relative overflow-hidden">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-purple via-primary-pink to-primary-purple" />

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${colors.bg}`}>
              <Icon className="w-6 h-6 text-white" style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }} />
            </div>
            <h3 className="text-sm font-medium text-text-secondary mt-4">{title}</h3>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
              trend.isPositive
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger'
            }`}>
              {trend.isPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>

        <p className="text-4xl font-bold text-white mb-2">{value}</p>
        <p className="text-sm text-text-muted">{subtitle}</p>

        {/* Sparkline Chart */}
        <div className="h-16 mt-4 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colors.gradient[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.gradient[0]}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="glass-card rounded-xl p-4 card-hover-lift flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg}`}>
          <Icon className="w-5 h-5 text-white" style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary truncate">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive ? 'text-success' : 'text-danger'
          }`}>
            {trend.isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className="metric-card glass-card rounded-2xl p-6 card-hover-lift">
      {/* Icon and Trend */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg}`}>
          <Icon className="w-5 h-5 text-white" style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-sm font-medium ${
            trend.isPositive ? 'text-success' : 'text-danger'
          }`}>
            {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-text-secondary mb-2">{title}</h3>

      {/* Value */}
      <p className="text-3xl font-bold text-white mb-1">{value}</p>

      {/* Subtitle */}
      <p className="text-xs text-text-muted mb-4">{subtitle}</p>

      {/* Mini Sparkline */}
      <div className="h-12 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity={0.3} />
                <stop offset="100%" stopColor={colors.gradient[1]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.gradient[0]}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
