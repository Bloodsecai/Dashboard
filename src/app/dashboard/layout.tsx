'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/contexts/ProfileContext';
import { useNotifications, getTimeAgo } from '@/contexts/NotificationContext';
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
  ShoppingCart,
  Package,
  CreditCard,
  CheckCheck,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Profile image component with fallback
function ProfileAvatar({
  src,
  fallback,
  size = 'sm',
  className = '',
}: {
  src: string | null;
  fallback: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizeClasses = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-10 h-10 text-sm';

  if (!src || hasError) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold ${className}`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full overflow-hidden ${className}`}>
      <img
        src={src}
        alt="Profile"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { profilePicture } = useProfile();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    // Mark all as read when opening
    if (!showNotifications && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="w-4 h-4 text-green-400" />;
      case 'product':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'transaction':
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-green-500';
      case 'product':
        return 'bg-blue-500';
      case 'transaction':
        return 'bg-purple-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const userEmail = user?.email || 'admin@test.com';
  const userName = userEmail.split('@')[0];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Sidebar />
        <div className="pl-64">
          {/* Top Navigation Bar */}
          <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search anything..."
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500/50 transition-colors"
                  />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                  {/* Notifications */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={handleNotificationClick}
                      className="relative p-2.5 rounded-xl hover:bg-white/5 transition-all"
                    >
                      <Bell className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-pink-500 rounded-full text-[10px] text-white font-medium px-1">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                          <h3 className="font-semibold text-white">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                            >
                              <CheckCheck className="w-3 h-3" />
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                              <p className="text-slate-400 text-sm">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <Link
                                key={notif.id}
                                href={notif.link || '#'}
                                onClick={() => setShowNotifications(false)}
                                className={`block p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors ${
                                  !notif.read ? 'bg-white/[0.02]' : ''
                                }`}
                              >
                                <div className="flex gap-3">
                                  <div
                                    className={`w-8 h-8 ${getNotificationColor(
                                      notif.type
                                    )} rounded-lg flex items-center justify-center flex-shrink-0`}
                                  >
                                    {getNotificationIcon(notif.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium truncate">
                                      {notif.title}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                                      {notif.message}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {getTimeAgo(notif.createdAt)}
                                    </p>
                                  </div>
                                  {!notif.read && (
                                    <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0 mt-2" />
                                  )}
                                </div>
                              </Link>
                            ))
                          )}
                        </div>

                        <div className="p-3 border-t border-white/10 text-center">
                          <Link
                            href="/dashboard/settings"
                            className="text-sm text-pink-400 hover:text-pink-300 font-medium transition-colors"
                          >
                            View all notifications
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-white/10" />

                  {/* User Profile */}
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all"
                    >
                      <ProfileAvatar
                        src={profilePicture}
                        fallback={userName.charAt(0).toUpperCase()}
                        size="sm"
                      />
                      <div className="text-left hidden md:block">
                        <p className="text-sm font-medium text-white">{userName}</p>
                        <p className="text-xs text-slate-400">Administrator</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                          <p className="text-sm font-medium text-white">{userEmail}</p>
                          <p className="text-xs text-slate-400 mt-1">Administrator</p>
                        </div>

                        <div className="p-2">
                          <Link
                            href="/dashboard/settings?tab=profile"
                            onClick={() => setShowProfileMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-white">Profile</span>
                          </Link>
                          <Link
                            href="/dashboard/settings"
                            onClick={() => setShowProfileMenu(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-white">Settings</span>
                          </Link>
                        </div>

                        <div className="p-2 border-t border-white/10">
                          <button
                            onClick={async () => {
                              setShowProfileMenu(false);
                              await logout();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 transition-all"
                          >
                            <LogOut className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-400">Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main>{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
