'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  writeBatch,
  Timestamp,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'product' | 'transaction' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAllAsRead: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  markAllAsRead: async () => {},
  markAsRead: async () => {},
  addNotification: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time notifications listener
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        setNotifications(notifs);
        const unread = notifs.filter((n) => !n.read).length;
        setUnreadCount(unread);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.uid || notifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        if (!notif.read) {
          const notifRef = doc(db, 'notifications', notif.id);
          batch.update(notifRef, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [user?.uid, notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const batch = writeBatch(db);
      const notifRef = doc(db, 'notifications', notificationId);
      batch.update(notifRef, { read: true });
      await batch.commit();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const addNotification = useCallback(
    async (notification: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'read'>) => {
      if (!user?.uid) return;

      try {
        await addDoc(collection(db, 'notifications'), {
          ...notification,
          userId: user.uid,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error adding notification:', error);
      }
    },
    [user?.uid]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAllAsRead,
        markAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Helper function to get time ago string
export function getTimeAgo(timestamp: Timestamp | null): string {
  if (!timestamp) return 'Just now';

  const now = new Date();
  const date = timestamp.toDate();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Icon mapping for notification types
export function getNotificationIcon(type: Notification['type']): {
  icon: string;
  color: string;
  bgColor: string;
} {
  switch (type) {
    case 'order':
      return { icon: 'ShoppingCart', color: 'text-green-400', bgColor: 'bg-green-500' };
    case 'product':
      return { icon: 'Package', color: 'text-blue-400', bgColor: 'bg-blue-500' };
    case 'transaction':
      return { icon: 'CreditCard', color: 'text-purple-400', bgColor: 'bg-purple-500' };
    case 'system':
      return { icon: 'Bell', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
    default:
      return { icon: 'Bell', color: 'text-gray-400', bgColor: 'bg-gray-500' };
  }
}
