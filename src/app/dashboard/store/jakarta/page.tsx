'use client';

import { Store, MapPin, Clock } from 'lucide-react';

export default function StoreJakartaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Store className="w-12 h-12 text-pink-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Jakarta Store</h1>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 text-slate-300 mb-4">
            <MapPin className="w-5 h-5 text-pink-400" />
            <span>Jl. Sudirman No. 789, Jakarta Pusat</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <Clock className="w-5 h-5 text-pink-400" />
            <span>10:00 - 22:00 WIB</span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl border border-pink-500/30 p-6">
          <p className="text-pink-400 font-medium mb-2">Coming Soon</p>
          <p className="text-slate-400 text-sm">Store management features are under development</p>
        </div>
      </div>
    </div>
  );
}
