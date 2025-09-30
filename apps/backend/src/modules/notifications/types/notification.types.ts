export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  REMINDER = 'reminder',
  ACHIEVEMENT = 'achievement',
}

export enum NotificationCategory {
  STUDY = 'study',
  TASK = 'task',
  GOAL = 'goal',
  SESSION = 'session',
  SYSTEM = 'system',
  SOCIAL = 'social',
  REMINDER = 'reminder',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
  ARCHIVED = 'archived',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
  WEBSOCKET = 'websocket',
}

export interface NotificationMetadata {
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  image?: string;
  sound?: string;
  badge?: string;
  data?: Record<string, any>;
  [key: string]: any;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string; // HH:mm format
  timezone: string;
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean;
      channels: NotificationChannel[];
      priority: NotificationPriority;
    };
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  variables?: string[];
  channels: NotificationChannel[];
  isActive: boolean;
}

export interface ScheduledNotification {
  id: string;
  userId: string;
  templateId?: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata?: NotificationMetadata;
  scheduledAt: Date;
  timezone: string;
  recurring?: {
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    dayOfMonth?: number; // 1-31
    endDate?: Date;
    maxOccurrences?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  attempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  externalId?: string; // ID from external service (email provider, push service, etc.)
  metadata?: Record<string, any>;
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationBatch {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  userIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalCount: number;
  successCount: number;
  failureCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata?: NotificationMetadata;
  scheduledAt?: Date;
  expiresAt?: Date;
  templateId?: string;
  templateVariables?: Record<string, any>;
}

export interface NotificationQueryOptions {
  userId?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  isRead?: boolean;
  isArchived?: boolean;
  channel?: NotificationChannel;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'priority' | 'type' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
  byStatus: Record<NotificationStatus, number>;
  deliveryRate: number;
  averageDeliveryTime: number;
}

export interface BulkNotificationOperation {
  action: 'markAsRead' | 'markAsUnread' | 'archive' | 'delete' | 'updatePriority';
  notificationIds: string[];
  userId: string;
  data?: any;
}
