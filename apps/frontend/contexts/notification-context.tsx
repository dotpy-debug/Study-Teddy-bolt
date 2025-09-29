'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  Notification,
  NotificationContextType,
  NotificationPreferences,
  ToastNotification
} from '@/types/notification';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultPreferences: NotificationPreferences = {
  email: {
    taskReminders: true,
    studySessionSummary: true,
    weeklyProgress: true,
    systemUpdates: true,
    aiInsights: false,
  },
  push: {
    taskDeadlines: true,
    studyBreaks: true,
    achievements: true,
    chatResponses: false,
  },
  inApp: {
    taskUpdates: true,
    systemAlerts: true,
    tips: true,
    achievements: true,
  },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notification-preferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Failed to parse notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem('notification-preferences', JSON.stringify(updated));
  }, [preferences]);

  // Toast notification functions
  const showToast = useCallback((notification: ToastNotification) => {
    const { type, title, message, duration = 4000, action } = notification;

    const toastContent = (
      <div className="flex flex-col gap-1">
        {title && <div className="font-semibold text-sm">{title}</div>}
        <div className="text-sm">{message}</div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1 text-left"
          >
            {action.label}
          </button>
        )}
      </div>
    );

    switch (type) {
      case 'success':
        toast.success(toastContent, { duration });
        break;
      case 'error':
        toast.error(toastContent, { duration });
        break;
      case 'warning':
        toast(toastContent, {
          duration,
          icon: '⚠️',
          style: {
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fbbf24',
          },
        });
        break;
      case 'info':
        toast(toastContent, {
          duration,
          icon: 'ℹ️',
          style: {
            background: '#dbeafe',
            color: '#1e40af',
            border: '1px solid #3b82f6',
          },
        });
        break;
    }
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  // Persistent notification functions
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Also show as toast if it's high priority
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      showToast({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        duration: notification.priority === 'urgent' ? 8000 : 6000,
      });
    }
  }, [showToast]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch notifications from backend
      // const response = await fetch('/api/notifications');
      // const data = await response.json();
      // setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      showError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Clean up expired notifications
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      setNotifications(prev =>
        prev.filter(notification =>
          !notification.expiresAt || notification.expiresAt > now
        )
      );
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,

    // Toast notifications
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Persistent notifications
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,

    // Preferences
    updatePreferences,

    // Loading states
    loading,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            maxWidth: '400px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}