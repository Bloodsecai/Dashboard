'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  fullScreen = true,
  size = 'md',
}: ErrorStateProps) {
  const containerClass = fullScreen
    ? 'flex items-center justify-center w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
    : 'flex items-center justify-center w-full p-4';

  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className={containerClass}>
      <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 ${sizeMap[size]} text-center`}>
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-slate-400 mb-6">{message}</p>
        {onRetry && (
          <Button variant="primary" onClick={onRetry} icon={RefreshCw}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
