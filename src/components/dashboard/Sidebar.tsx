'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Receipt,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/contexts/ProfileContext';

// Main navigation items
const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
];

// Store locations
const storeLocations = [
  { name: 'Bali', href: '/dashboard/store/bali' },
  { name: 'Cikurang', href: '/dashboard/store/cikurang' },
  { name: 'Jakarta', href: '/dashboard/store/jakarta' },
];

const bottomNavigation = [
  { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
];

const preferencesNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { profilePicture } = useProfile();
  const [storeOpen, setStoreOpen] = useState(false);

  const isStoreActive = pathname.includes('/dashboard/store');

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/10 z-50">
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">TEST</h1>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {/* Main Items */}
          {mainNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive ? 'text-pink-400' : '')} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}

          {/* Store with Dropdown */}
          <div>
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              className={clsx(
                'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isStoreActive
                  ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <div className="flex items-center gap-3">
                <Store className={clsx('w-5 h-5', isStoreActive ? 'text-pink-400' : '')} />
                <span className="font-medium text-sm">Store</span>
              </div>
              {storeOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {storeOpen && (
              <div className="mt-2 ml-8 space-y-1">
                {storeLocations.map((location) => {
                  const isActive = pathname === location.href;
                  return (
                    <Link
                      key={location.name}
                      href={location.href}
                      className={clsx(
                        'block px-4 py-2 rounded-lg text-sm transition-all',
                        isActive
                          ? 'text-pink-400 bg-pink-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {location.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transactions */}
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive ? 'text-pink-400' : '')} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}

          {/* Divider */}
          <div className="h-px bg-white/10 my-4" />

          {/* Preferences Label */}
          <p className="px-4 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Preferences
          </p>

          {/* Preferences Items */}
          {preferencesNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border border-pink-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive ? 'text-pink-400' : '')} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.email?.charAt(0).toUpperCase() || 'A'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email?.split('@')[0] || 'Administrator'}
              </p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-all"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
