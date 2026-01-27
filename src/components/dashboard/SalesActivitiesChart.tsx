'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SalesActivitiesChartProps {
  data?: {
    name: string;
    value: number;
    color: string;
  }[];
}

// Empty default data - will be populated from Firebase
const defaultData = [
  { name: 'Emails', value: 0, color: '#7c3aed' },
  { name: 'Calls', value: 0, color: '#8b5cf6' },
  { name: 'Meetings', value: 0, color: '#a855f7' },
  { name: 'Follow-ups', value: 0, color: '#d946ef' },
  { name: 'Other', value: 0, color: '#ec4899' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-xl p-3 border border-white/10 shadow-xl">
        <p className="text-sm text-text-secondary mb-1">{payload[0].payload.name}</p>
        <p className="text-lg font-bold text-white">{payload[0].value} activities</p>
      </div>
    );
  }
  return null;
};

export function SalesActivitiesChart({ data = defaultData }: SalesActivitiesChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">Total Activities</span>
        <span className="text-lg font-bold text-white">{total}</span>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#71717a"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
              tick={{ fill: '#a1a1aa' }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{
                    filter: `drop-shadow(0 0 6px ${entry.color}50)`,
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-text-secondary">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
