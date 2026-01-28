'use client';

import { Button } from './Button';

interface ConnectionErrorProps {
  title?: string;
  message: string;
  onRetry: () => void;
  className?: string;
}

export function ConnectionError({
  title = 'Connection Error',
  message,
  onRetry,
  className = '',
}: ConnectionErrorProps) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 max-w-md text-center ${className}`}>
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      <p className="text-slate-400 mb-6">{message}</p>
      <Button variant="primary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

export function FullPageConnectionError({
  title = 'Connection Error',
  message,
  onRetry,
}: ConnectionErrorProps) {
  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <ConnectionError title={title} message={message} onRetry={onRetry} />
    </div>
  );
}
