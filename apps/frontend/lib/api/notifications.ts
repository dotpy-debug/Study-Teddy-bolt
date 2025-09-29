import { apiClient, type ApiError } from './client';

// Types for Notifications API
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'achievement';
  category: 'study' | 'task' | 'goal' | 'session' | 'system' | 'social' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, any>;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'achievement';
  category: 'study' | 'task' | 'goal' | 'session' | 'system' | 'social' | 'reminder';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, any>;
  scheduledFor?: string;
  sendEmail?: boolean;
  sendPush?: boolean;
}

export interface UpdateNotificationDto {
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'achievement';
  category?: 'study' | 'task' | 'goal' | 'session' | 'system' | 'social' | 'reminder';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, any>;
  scheduledFor?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: {
    enabled: boolean;
    studyReminders: boolean;
    taskDeadlines: boolean;
    goalMilestones: boolean;
    weeklyReports: boolean;
    achievements: boolean;
    systemUpdates: boolean;
  };
  pushNotifications: {
    enabled: boolean;
    studyReminders: boolean;
    taskDeadlines: boolean;
    breakReminders: boolean;
    achievements: boolean;
    socialUpdates: boolean;
  };
  inAppNotifications: {
    enabled: boolean;
    showBadges: boolean;
    playSound: boolean;
    showPreviews: boolean;
  };
  schedule: {
    quietHoursEnabled: boolean;
    quietHoursStart: string; // HH:MM format
    quietHoursEnd: string; // HH:MM format
    weekendsEnabled: boolean;
    timezone: string;
  };
}

export interface NotificationQueryParams {
  limit?: number;
  offset?: number;
  type?: 'info' | 'success' | 'warning' | 'error' | 'reminder' | 'achievement';
  category?: 'study' | 'task' | 'goal' | 'session' | 'system' | 'social' | 'reminder';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  isRead?: boolean;
  isArchived?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
    reminder: number;
    achievement: number;
  };
  byCategory: {
    study: number;
    task: number;
    goal: number;
    session: number;
    system: number;
    social: number;
    reminder: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export interface BulkNotificationAction {
  notificationIds: string[];
  action: 'read' | 'unread' | 'archive' | 'unarchive' | 'delete';
}

// API result interface
export interface NotificationResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export const notificationsApi = {
  // Get all notifications with filtering
  getNotifications: async (params?: NotificationQueryParams): Promise<NotificationResult<{
    notifications: Notification[];
    total: number;
    hasMore: boolean;
  }>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
      if (params?.isArchived !== undefined) queryParams.append('isArchived', params.isArchived.toString());
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);
      if (params?.search) queryParams.append('search', params.search);

      const url = `/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{
        success: boolean;
        data: {
          notifications: Notification[];
          total: number;
          hasMore: boolean;
        }
      }>(url);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get unread notifications
  getUnreadNotifications: async (limit = 50): Promise<NotificationResult<Notification[]>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Notification[]
      }>(`/notifications/unread?limit=${limit}`);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get notification by ID
  getNotificationById: async (id: string): Promise<NotificationResult<Notification>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Notification
      }>(`/notifications/${id}`);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Create a new notification
  createNotification: async (data: CreateNotificationDto): Promise<NotificationResult<Notification>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: Notification;
        message: string
      }>('/notifications', data);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update a notification
  updateNotification: async (id: string, data: UpdateNotificationDto): Promise<NotificationResult<Notification>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: Notification;
        message: string
      }>(`/notifications/${id}`, data);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<NotificationResult<Notification>> => {
    try {
      const response = await apiClient.patch<{
        success: boolean;
        data: Notification;
        message: string
      }>(`/notifications/${id}/read`);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Mark notification as unread
  markAsUnread: async (id: string): Promise<NotificationResult<Notification>> => {
    try {
      const response = await apiClient.patch<{
        success: boolean;
        data: Notification;
        message: string
      }>(`/notifications/${id}/unread`);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Archive notification
  archiveNotification: async (id: string): Promise<NotificationResult<Notification>> => {
    try {
      const response = await apiClient.patch<{
        success: boolean;
        data: Notification;
        message: string
      }>(`/notifications/${id}/archive`);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Unarchive notification
  unarchiveNotification: async (id: string): Promise<NotificationResult<Notification>> => {
    try {
      const response = await apiClient.patch<{
        success: boolean;
        data: Notification;
        message: string
      }>(`/notifications/${id}/unarchive`);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<NotificationResult<void>> => {
    try {
      await apiClient.delete<{
        success: boolean;
        message: string
      }>(`/notifications/${id}`);

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<NotificationResult<{ updatedCount: number }>> => {
    try {
      const response = await apiClient.patch<{
        success: boolean;
        data: { updatedCount: number };
        message: string
      }>('/notifications/mark-all-read');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Clear all notifications
  clearAll: async (): Promise<NotificationResult<{ deletedCount: number }>> => {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        data: { deletedCount: number };
        message: string
      }>('/notifications/clear-all');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Bulk operations on notifications
  bulkAction: async (action: BulkNotificationAction): Promise<NotificationResult<{
    updatedCount: number;
    notifications: Notification[];
  }>> => {
    try {
      const response = await apiClient.patch<{
        success: boolean;
        data: {
          updatedCount: number;
          notifications: Notification[];
        };
        message: string
      }>('/notifications/bulk', action);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get notification statistics
  getStats: async (): Promise<NotificationResult<NotificationStats>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: NotificationStats
      }>('/notifications/stats');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get notification preferences
  getPreferences: async (): Promise<NotificationResult<NotificationPreferences>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: NotificationPreferences
      }>('/notifications/preferences');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update notification preferences
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationResult<NotificationPreferences>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: NotificationPreferences;
        message: string
      }>('/notifications/preferences', preferences);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Test notification (for debugging)
  testNotification: async (type: 'email' | 'push' | 'both' = 'both'): Promise<NotificationResult<{
    emailSent: boolean;
    pushSent: boolean;
    message: string;
  }>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          emailSent: boolean;
          pushSent: boolean;
          message: string;
        };
        message: string
      }>('/notifications/test', { type });

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Subscribe to push notifications (with service worker registration)
  subscribeToPush: async (subscription: PushSubscription): Promise<NotificationResult<{
    subscribed: boolean;
    endpoint: string;
  }>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          subscribed: boolean;
          endpoint: string;
        };
        message: string
      }>('/notifications/push/subscribe', {
        subscription: subscription.toJSON()
      });

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (): Promise<NotificationResult<{
    unsubscribed: boolean;
  }>> => {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        data: {
          unsubscribed: boolean;
        };
        message: string
      }>('/notifications/push/unsubscribe');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }
};

// Export types for use in components
export type {
  Notification,
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationPreferences,
  NotificationQueryParams,
  NotificationStats,
  BulkNotificationAction,
  NotificationResult
};