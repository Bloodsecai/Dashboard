'use client';

import { Store } from 'lucide-react';

export default function StorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Store</h1>
        <p className="text-slate-400 mt-1">Manage your store locations</p>
      </div>

      {/* Coming Soon Card */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-12">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Coming Soon</h2>
          <p className="text-slate-400 text-lg">
            Contact your developer to add your store.
          </p>
        </div>
      </div>
    </div>
  );
}
