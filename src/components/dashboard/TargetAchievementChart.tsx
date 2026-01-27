'use client';

interface TargetItem {
  name: string;
  current: number;
  target: number;
  color: string;
}

interface TargetAchievementChartProps {
  data?: TargetItem[];
}

// Default targets - will be populated from Firebase targets collection
const defaultData: TargetItem[] = [
  { name: 'Monthly Revenue', current: 0, target: 1500000, color: '#7c3aed' },
  { name: 'New Customers', current: 0, target: 50, color: '#8b5cf6' },
  { name: 'Sales Calls', current: 0, target: 200, color: '#a855f7' },
  { name: 'Deals Closed', current: 0, target: 35, color: '#d946ef' },
  { name: 'Lead Conversion', current: 0, target: 80, color: '#ec4899' },
];

export function TargetAchievementChart({ data = defaultData }: TargetAchievementChartProps) {
  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  return (
    <div className="space-y-5">
      {data.map((item) => {
        const percentage = Math.min((item.current / item.target) * 100, 100);
        const isAchieved = item.current >= item.target;

        return (
          <div key={item.name} className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  {formatValue(item.current)}
                </span>
                <span className="text-xs text-text-muted">/ {formatValue(item.target)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}dd 100%)`,
                  boxShadow: `0 0 12px ${item.color}60`,
                }}
              />
              {/* Glow effect at the end */}
              <div
                className="absolute top-0 h-full w-4 rounded-full blur-sm"
                style={{
                  left: `calc(${percentage}% - 8px)`,
                  background: item.color,
                  opacity: 0.6,
                }}
              />
            </div>

            {/* Percentage Badge */}
            <div className="flex justify-end">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isAchieved
                    ? 'bg-success/10 text-success'
                    : percentage >= 75
                    ? 'bg-warning/10 text-warning'
                    : 'bg-white/5 text-text-secondary'
                }`}
              >
                {percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
