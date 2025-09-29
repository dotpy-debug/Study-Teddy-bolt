export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface ToastNotification {
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationPreferences {
  email: {
    taskReminders: boolean;
    studySessionSummary: boolean;
    weeklyProgress: boolean;
    systemUpdates: boolean;
    aiInsights: boolean;
  };
  push: {
    taskDeadlines: boolean;
    studyBreaks: boolean;
    achievements: boolean;
    chatResponses: boolean;
  };
  inApp: {
    taskUpdates: boolean;
    systemAlerts: boolean;
    tips: boolean;
    achievements: boolean;
  };
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;

  // Toast notifications
  showToast: (notification: ToastNotification) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;

  // Persistent notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;

  // Loading states
  loading: boolean;
  refreshNotifications: () => Promise<void>;
}