'use client';

import { ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({
  title = 'Coming Soon',
  description = 'This dashboard is currently under development'
}: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6">
      <div className="relative w-full max-w-lg">
        {/* Background decorative elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary-purple/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary-pink/20 rounded-full blur-3xl" />

        {/* Glassmorphic card */}
        <div className="relative glass-strong rounded-3xl border border-white/10 p-8 md:p-12 text-center overflow-hidden">
          {/* Gradient accent at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-purple via-primary-pink to-primary-purple" />

          {/* Icon container */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-purple to-primary-pink flex items-center justify-center shadow-glow">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-pink to-primary-purple flex items-center justify-center animate-pulse">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-primary-purple via-primary-pink to-primary-purple bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          {/* Description */}
          <p className="text-text-secondary text-lg mb-8 max-w-md mx-auto">
            {description}
          </p>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 text-sm text-text-muted mb-2">
              <span>Development in progress</span>
            </div>
            <div className="w-full max-w-xs mx-auto h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-gradient-to-r from-primary-purple to-primary-pink rounded-full animate-pulse" />
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-purple to-primary-pink text-white font-medium hover:shadow-glow transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          {/* Decorative dots */}
          <div className="absolute bottom-4 left-4 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary-purple/50" />
            <div className="w-2 h-2 rounded-full bg-primary-pink/50" />
            <div className="w-2 h-2 rounded-full bg-primary-purple/50" />
          </div>
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary-purple/50" />
            <div className="w-2 h-2 rounded-full bg-primary-pink/50" />
            <div className="w-2 h-2 rounded-full bg-primary-purple/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
