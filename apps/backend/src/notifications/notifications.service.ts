import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../db/drizzle.service';
import {
  notifications,
  notificationPreferences,
  Notification,
  NotificationPreference,
} from '../db/schema';
import { eq, and, lte, gte, desc, or, isNull } from 'drizzle-orm';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  UpdatePreferencesDto,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from './dto';

@Injectable()
export class NotificationsService {
  constructor(private drizzle: DrizzleService) {}

  async create(
    userId: string,
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notificationData = {
      ...createNotificationDto,
      userId,
      expiresAt: createNotificationDto.expiresAt
        ? new Date(createNotificationDto.expiresAt)
        : undefined,
    };

    const [notification] = await this.drizzle.db
      .insert(notifications)
      .values(notificationData)
      .returning();

    return notification;
  }

  async findAll(
    userId: string,
    query?: {
      read?: boolean;
      type?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ notifications: Notification[]; total: number }> {
    const db = this.drizzle.db;

    // Build where conditions
    const conditions = [eq(notifications.userId, userId)];

    // Add expired filter - don't show expired notifications
    conditions.push(or(isNull(notifications.expiresAt), gte(notifications.expiresAt, new Date()))!);

    if (query?.read !== undefined) {
      conditions.push(eq(notifications.read, query.read));
    }

    if (query?.type) {
      conditions.push(eq(notifications.type, query.type as any));
    }

    if (query?.priority) {
      conditions.push(eq(notifications.priority, query.priority as any));
    }

    // Get notifications with pagination
    const notificationsList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(query?.limit || 50)
      .offset(query?.offset || 0);

    // Get total count
    const [{ count }] = await db
      .select({ count: db.$count(notifications) })
      .from(notifications)
      .where(and(...conditions));

    return {
      notifications: notificationsList,
      total: count,
    };
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    const [notification] = await this.drizzle.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async update(
    id: string,
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    // First check if notification exists and belongs to user
    await this.findOne(id, userId);

    const updateData: any = {
      ...updateNotificationDto,
      updatedAt: new Date(),
    };

    // Handle read status change
    if (updateNotificationDto.read === true && !updateData.readAt) {
      updateData.readAt = new Date();
    }

    // Handle dismissed status change
    if (updateNotificationDto.dismissed === true && !updateData.dismissedAt) {
      updateData.dismissedAt = new Date();
    }

    const [updated] = await this.drizzle.db
      .update(notifications)
      .set(updateData)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    return updated;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return this.update(id, userId, { read: true });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.drizzle.db
      .update(notifications)
      .set({
        read: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return { count: result.length || 0 };
  }

  async dismiss(id: string, userId: string): Promise<Notification> {
    return this.update(id, userId, { dismissed: true });
  }

  async delete(id: string, userId: string): Promise<void> {
    // First check if notification exists and belongs to user
    await this.findOne(id, userId);

    await this.drizzle.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async deleteAll(userId: string): Promise<{ count: number }> {
    const result = await this.drizzle.db
      .delete(notifications)
      .where(eq(notifications.userId, userId));

    return { count: result.length || 0 };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [{ count }] = await this.drizzle.db
      .select({ count: this.drizzle.db.$count(notifications) })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.read, false),
          or(isNull(notifications.expiresAt), gte(notifications.expiresAt, new Date())),
        ),
      );

    return count;
  }

  // Notification Preferences Methods
  async getPreferences(userId: string): Promise<NotificationPreference> {
    const [preferences] = await this.drizzle.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    if (!preferences) {
      // Create default preferences if they don't exist
      const [newPreferences] = await this.drizzle.db
        .insert(notificationPreferences)
        .values({ userId })
        .returning();

      return newPreferences;
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<NotificationPreference> {
    // Get existing preferences or create new ones
    const existing = await this.getPreferences(userId);

    const [updated] = await this.drizzle.db
      .update(notificationPreferences)
      .set({
        ...updatePreferencesDto,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, userId))
      .returning();

    return updated;
  }

  // Helper method to create system notifications
  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    return this.create(userId, {
      type,
      title,
      message,
      priority: NotificationPriority.HIGH,
      channel: NotificationChannel.IN_APP,
      metadata,
    });
  }

  // Helper method to create task reminder notifications
  async createTaskReminder(
    userId: string,
    taskTitle: string,
    taskId: string,
    dueDate: Date,
  ): Promise<Notification> {
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));

    let message = `Task "${taskTitle}" is due soon`;
    let priority: NotificationPriority = NotificationPriority.MEDIUM;

    if (hoursDiff <= 1) {
      message = `Task "${taskTitle}" is due in less than 1 hour!`;
      priority = NotificationPriority.URGENT;
    } else if (hoursDiff <= 24) {
      message = `Task "${taskTitle}" is due in ${hoursDiff} hours`;
      priority = NotificationPriority.HIGH;
    }

    return this.create(userId, {
      type: NotificationType.REMINDER,
      title: 'Task Reminder',
      message,
      priority,
      channel: NotificationChannel.IN_APP,
      actionUrl: `/tasks/${taskId}`,
      actionLabel: 'View Task',
      metadata: { taskId, dueDate },
      expiresAt: dueDate.toISOString(),
    });
  }

  // Helper method to create achievement notifications
  async createAchievementNotification(
    userId: string,
    achievementTitle: string,
    achievementDescription: string,
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    return this.create(userId, {
      type: NotificationType.ACHIEVEMENT,
      title: 'Achievement Unlocked!',
      message: `${achievementTitle}: ${achievementDescription}`,
      priority: NotificationPriority.MEDIUM,
      channel: NotificationChannel.IN_APP,
      actionUrl: '/profile#achievements',
      actionLabel: 'View Achievements',
      metadata,
    });
  }
}
