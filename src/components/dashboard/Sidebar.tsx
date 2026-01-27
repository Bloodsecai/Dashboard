'use client';

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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/contexts/ProfileContext';
import { useTheme, COLOR_PALETTES } from '@/contexts/ThemeContext';

// Main navigation items
const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Store', href: '/dashboard/store', icon: Store },
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
  const { palette } = useTheme();
  const colors = COLOR_PALETTES[palette];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/10 z-50">
      <div className="flex h-full flex-col">
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              boxShadow: `0 10px 25px -5px rgba(${colors.primaryRgb}, 0.25)`
            }}
          >
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
                    ? 'sidebar-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive ? 'sidebar-active-icon' : '')} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}

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
                    ? 'sidebar-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive ? 'sidebar-active-icon' : '')} />
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
                    ? 'sidebar-active text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className={clsx('w-5 h-5', isActive ? 'sidebar-active-icon' : '')} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden"
              style={{
                background: profilePicture ? 'transparent' : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
              }}
            >
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
