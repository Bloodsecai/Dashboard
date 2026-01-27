'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';

interface StateData {
  code: string;
  name: string;
  sales: number;
  x: number;
  y: number;
}

interface SalesByStateMapProps {
  data?: StateData[];
}

// Empty default - will be populated from Firebase sales with location data
const defaultData: StateData[] = [];

const getBubbleSize = (value: number, max: number) => {
  const minSize = 12;
  const maxSize = 36;
  return minSize + (value / max) * (maxSize - minSize);
};

const getBubbleColor = (value: number, max: number) => {
  const percentage = value / max;
  if (percentage >= 0.8) return '#7c3aed';
  if (percentage >= 0.6) return '#8b5cf6';
  if (percentage >= 0.4) return '#a855f7';
  if (percentage >= 0.2) return '#d946ef';
  return '#ec4899';
};

export function SalesByStateMap({ data = defaultData }: SalesByStateMapProps) {
  const [hoveredState, setHoveredState] = useState<StateData | null>(null);
  const maxSales = data.length > 0 ? Math.max(...data.map(d => d.sales)) : 0;
  const totalSales = data.reduce((sum, d) => sum + d.sales, 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
  };

  // Show empty state if no location data
  if (data.length === 0) {
    return (
      <div className="relative">
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
              <MapPin className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-text-secondary">No location data</p>
            <p className="text-sm text-text-muted mt-1">Add location to sales to see geographic distribution</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Map Container */}
      <div className="relative h-64 w-full">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* US outline simplified */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {/* Simplified US border */}
          <path
            d="M5,20 Q10,15 15,18 L20,15 L30,12 L45,15 L55,12 L70,15 L80,18 L88,25 L90,35 L92,50 L90,65 L85,75 L78,85 L70,88 L55,85 L45,88 L30,85 L20,82 L12,75 L8,60 L5,45 Z"
            fill="none"
            stroke="rgba(124, 58, 237, 0.2)"
            strokeWidth="0.5"
          />
        </svg>

        {/* State Bubbles */}
        {data.map((state) => {
          const size = getBubbleSize(state.sales, maxSales);
          const color = getBubbleColor(state.sales, maxSales);
          const isHovered = hoveredState?.code === state.code;

          return (
            <div
              key={state.code}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
              style={{
                left: `${state.x}%`,
                top: `${state.y}%`,
                zIndex: isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredState(state)}
              onMouseLeave={() => setHoveredState(null)}
            >
              {/* Glow effect */}
              <div
                className="absolute rounded-full blur-md transition-opacity duration-300"
                style={{
                  width: size * 2,
                  height: size * 2,
                  left: -size / 2,
                  top: -size / 2,
                  backgroundColor: color,
                  opacity: isHovered ? 0.6 : 0.3,
                }}
              />

              {/* Main bubble */}
              <div
                className="relative rounded-full flex items-center justify-center text-white font-bold transition-transform duration-300"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: color,
                  transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: `0 0 ${isHovered ? 20 : 10}px ${color}80`,
                }}
              >
                <span className="text-xs">{state.code}</span>
              </div>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 glass-strong rounded-lg p-3 border border-white/10 whitespace-nowrap animate-fade-in z-20">
                  <p className="text-sm font-medium text-white">{state.name}</p>
                  <p className="text-lg font-bold gradient-text">
                    {formatCurrency(state.sales)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-purple" />
            <span className="text-xs text-text-secondary">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-pink" />
            <span className="text-xs text-text-secondary">Low</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Total Sales</p>
          <p className="text-lg font-bold text-white">{formatCurrency(totalSales)}</p>
        </div>
      </div>
    </div>
  );
}
