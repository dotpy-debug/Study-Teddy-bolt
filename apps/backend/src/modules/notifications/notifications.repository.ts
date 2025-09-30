import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import {
  notificationsEnhanced,
  notificationTemplates,
  notificationPreferences,
  pushSubscriptions,
  notificationDeliveries,
  scheduledNotifications,
  notificationBatches,
} from '../../db/schema/notifications-enhanced.schema';
import { users } from '../../db/schema/users.schema';
import {
  eq,
  and,
  or,
  desc,
  asc,
  count,
  sql,
  inArray,
  gte,
  lte,
  isNull,
  isNotNull,
} from 'drizzle-orm';
import {
  NotificationQueryOptions,
  CreateNotificationData,
  NotificationPreferences as INotificationPreferences,
  NotificationTemplate,
  ScheduledNotification,
  NotificationBatch,
  PushSubscription,
  NotificationDelivery,
  BulkNotificationOperation,
  NotificationStats,
} from './types/notification.types';

@Injectable()
export class NotificationsRepository {
  private readonly logger = new Logger(NotificationsRepository.name);

  constructor(private readonly drizzle: DrizzleService) {}

  // NOTIFICATION CRUD OPERATIONS
  async create(data: CreateNotificationData) {
    const db = this.drizzle.db;

    try {
      const [notification] = await db
        .insert(notificationsEnhanced)
        .values({
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          category: data.category,
          priority: data.priority,
          channels: data.channels,
          metadata: data.metadata,
          scheduledAt: data.scheduledAt,
          expiresAt: data.expiresAt,
          templateId: data.templateId,
          templateVariables: data.templateVariables,
        })
        .returning();

      this.logger.debug(`Created notification ${notification.id} for user ${data.userId}`);
      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async findById(id: string) {
    const db = this.drizzle.db;

    const [notification] = await db
      .select()
      .from(notificationsEnhanced)
      .where(eq(notificationsEnhanced.id, id))
      .leftJoin(users, eq(notificationsEnhanced.userId, users.id))
      .leftJoin(
        notificationTemplates,
        eq(notificationsEnhanced.templateId, notificationTemplates.id),
      );

    return notification;
  }

  async findByUserId(userId: string, options: NotificationQueryOptions = {}) {
    const db = this.drizzle.db;

    let query = db
      .select()
      .from(notificationsEnhanced)
      .where(eq(notificationsEnhanced.userId, userId));

    // Apply filters
    const conditions = [eq(notificationsEnhanced.userId, userId)];

    if (options.type) {
      conditions.push(eq(notificationsEnhanced.type, options.type));
    }

    if (options.category) {
      conditions.push(eq(notificationsEnhanced.category, options.category));
    }

    if (options.priority) {
      conditions.push(eq(notificationsEnhanced.priority, options.priority));
    }

    if (options.status) {
      conditions.push(eq(notificationsEnhanced.status, options.status));
    }

    if (options.isRead !== undefined) {
      conditions.push(eq(notificationsEnhanced.isRead, options.isRead));
    }

    if (options.isArchived !== undefined) {
      conditions.push(eq(notificationsEnhanced.isArchived, options.isArchived));
    }

    if (options.dateFrom) {
      conditions.push(gte(notificationsEnhanced.createdAt, options.dateFrom));
    }

    if (options.dateTo) {
      conditions.push(lte(notificationsEnhanced.createdAt, options.dateTo));
    }

    query = query.where(and(...conditions));

    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    if (sortOrder === 'desc') {
      query = query.orderBy(desc(notificationsEnhanced[sortBy]));
    } else {
      query = query.orderBy(asc(notificationsEnhanced[sortBy]));
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async update(id: string, data: Partial<CreateNotificationData>) {
    const db = this.drizzle.db;

    const [notification] = await db
      .update(notificationsEnhanced)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(notificationsEnhanced.id, id))
      .returning();

    return notification;
  }

  async delete(id: string) {
    const db = this.drizzle.db;

    await db.delete(notificationsEnhanced).where(eq(notificationsEnhanced.id, id));

    this.logger.debug(`Deleted notification ${id}`);
  }

  async markAsRead(notificationIds: string[], userId: string) {
    const db = this.drizzle.db;

    const [result] = await db
      .update(notificationsEnhanced)
      .set({
        isRead: true,
        readAt: new Date(),
        status: 'read',
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(notificationsEnhanced.id, notificationIds),
          eq(notificationsEnhanced.userId, userId),
        ),
      )
      .returning({ id: notificationsEnhanced.id });

    this.logger.debug(`Marked ${notificationIds.length} notifications as read for user ${userId}`);
    return result;
  }

  async markAllAsRead(userId: string) {
    const db = this.drizzle.db;

    await db
      .update(notificationsEnhanced)
      .set({
        isRead: true,
        readAt: new Date(),
        status: 'read',
        updatedAt: new Date(),
      })
      .where(
        and(eq(notificationsEnhanced.userId, userId), eq(notificationsEnhanced.isRead, false)),
      );

    this.logger.debug(`Marked all notifications as read for user ${userId}`);
  }

  async archive(notificationIds: string[], userId: string) {
    const db = this.drizzle.db;

    await db
      .update(notificationsEnhanced)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(notificationsEnhanced.id, notificationIds),
          eq(notificationsEnhanced.userId, userId),
        ),
      );

    this.logger.debug(`Archived ${notificationIds.length} notifications for user ${userId}`);
  }

  async getUnreadCount(userId: string): Promise<{ count: number; hasUnread: boolean }> {
    const db = this.drizzle.db;

    const [result] = await db
      .select({ count: count() })
      .from(notificationsEnhanced)
      .where(
        and(
          eq(notificationsEnhanced.userId, userId),
          eq(notificationsEnhanced.isRead, false),
          eq(notificationsEnhanced.isArchived, false),
        ),
      );

    const unreadCount = result?.count || 0;
    return {
      count: unreadCount,
      hasUnread: unreadCount > 0,
    };
  }

  async clearAllNotifications(userId: string) {
    const db = this.drizzle.db;

    await db.delete(notificationsEnhanced).where(eq(notificationsEnhanced.userId, userId));

    this.logger.debug(`Cleared all notifications for user ${userId}`);
  }

  // BULK OPERATIONS
  async bulkOperation(operation: BulkNotificationOperation) {
    const db = this.drizzle.db;

    const baseCondition = and(
      inArray(notificationsEnhanced.id, operation.notificationIds),
      eq(notificationsEnhanced.userId, operation.userId),
    );

    switch (operation.action) {
      case 'markAsRead':
        await db
          .update(notificationsEnhanced)
          .set({
            isRead: true,
            readAt: new Date(),
            status: 'read',
            updatedAt: new Date(),
          })
          .where(baseCondition);
        break;

      case 'markAsUnread':
        await db
          .update(notificationsEnhanced)
          .set({
            isRead: false,
            readAt: null,
            status: 'sent',
            updatedAt: new Date(),
          })
          .where(baseCondition);
        break;

      case 'archive':
        await db
          .update(notificationsEnhanced)
          .set({
            isArchived: true,
            archivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(baseCondition);
        break;

      case 'delete':
        await db.delete(notificationsEnhanced).where(baseCondition);
        break;

      case 'updatePriority':
        if (operation.data?.priority) {
          await db
            .update(notificationsEnhanced)
            .set({
              priority: operation.data.priority,
              updatedAt: new Date(),
            })
            .where(baseCondition);
        }
        break;
    }

    this.logger.debug(
      `Performed bulk ${operation.action} on ${operation.notificationIds.length} notifications for user ${operation.userId}`,
    );
  }

  // STATISTICS
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const db = this.drizzle.db;

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(notificationsEnhanced)
      .where(eq(notificationsEnhanced.userId, userId));

    // Get unread count
    const [unreadResult] = await db
      .select({ count: count() })
      .from(notificationsEnhanced)
      .where(
        and(eq(notificationsEnhanced.userId, userId), eq(notificationsEnhanced.isRead, false)),
      );

    // Get counts by type
    const typeResults = await db
      .select({
        type: notificationsEnhanced.type,
        count: count(),
      })
      .from(notificationsEnhanced)
      .where(eq(notificationsEnhanced.userId, userId))
      .groupBy(notificationsEnhanced.type);

    // Get counts by category
    const categoryResults = await db
      .select({
        category: notificationsEnhanced.category,
        count: count(),
      })
      .from(notificationsEnhanced)
      .where(eq(notificationsEnhanced.userId, userId))
      .groupBy(notificationsEnhanced.category);

    // Get counts by priority
    const priorityResults = await db
      .select({
        priority: notificationsEnhanced.priority,
        count: count(),
      })
      .from(notificationsEnhanced)
      .where(eq(notificationsEnhanced.userId, userId))
      .groupBy(notificationsEnhanced.priority);

    // Get counts by status
    const statusResults = await db
      .select({
        status: notificationsEnhanced.status,
        count: count(),
      })
      .from(notificationsEnhanced)
      .where(eq(notificationsEnhanced.userId, userId))
      .groupBy(notificationsEnhanced.status);

    // Calculate delivery stats
    const deliveryStats = await db
      .select({
        totalDeliveries: count(),
        successfulDeliveries: sql<number>`COUNT(CASE WHEN ${notificationDeliveries.status} = 'delivered' THEN 1 END)`,
        avgDeliveryTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${notificationDeliveries.deliveredAt} - ${notificationDeliveries.createdAt})))`,
      })
      .from(notificationDeliveries)
      .leftJoin(
        notificationsEnhanced,
        eq(notificationDeliveries.notificationId, notificationsEnhanced.id),
      )
      .where(eq(notificationsEnhanced.userId, userId));

    const deliveryStat = deliveryStats[0];
    const deliveryRate =
      deliveryStat.totalDeliveries > 0
        ? (deliveryStat.successfulDeliveries / deliveryStat.totalDeliveries) * 100
        : 0;

    return {
      total: totalResult?.count || 0,
      unread: unreadResult?.count || 0,
      byType: typeResults.reduce((acc, curr) => ({ ...acc, [curr.type]: curr.count }), {} as any),
      byCategory: categoryResults.reduce(
        (acc, curr) => ({ ...acc, [curr.category]: curr.count }),
        {} as any,
      ),
      byPriority: priorityResults.reduce(
        (acc, curr) => ({ ...acc, [curr.priority]: curr.count }),
        {} as any,
      ),
      byStatus: statusResults.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: curr.count }),
        {} as any,
      ),
      deliveryRate,
      averageDeliveryTime: deliveryStat.avgDeliveryTime || 0,
    };
  }

  // TEMPLATE OPERATIONS
  async createTemplate(template: Omit<NotificationTemplate, 'id'>) {
    const db = this.drizzle.db;

    const [createdTemplate] = await db.insert(notificationTemplates).values(template).returning();

    return createdTemplate;
  }

  async getTemplates() {
    const db = this.drizzle.db;

    return db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.isActive, true))
      .orderBy(asc(notificationTemplates.name));
  }

  async getTemplateById(id: string) {
    const db = this.drizzle.db;

    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.id, id));

    return template;
  }

  async updateTemplate(id: string, data: Partial<NotificationTemplate>) {
    const db = this.drizzle.db;

    const [template] = await db
      .update(notificationTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(notificationTemplates.id, id))
      .returning();

    return template;
  }

  async deleteTemplate(id: string) {
    const db = this.drizzle.db;

    await db
      .update(notificationTemplates)
      .set({ isActive: false })
      .where(eq(notificationTemplates.id, id));
  }

  // PREFERENCES OPERATIONS
  async getUserPreferences(userId: string) {
    const db = this.drizzle.db;

    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    return preferences;
  }

  async upsertUserPreferences(userId: string, preferences: Partial<INotificationPreferences>) {
    const db = this.drizzle.db;

    const [result] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        ...preferences,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  // PUSH SUBSCRIPTION OPERATIONS
  async createPushSubscription(
    subscription: Omit<PushSubscription, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    const db = this.drizzle.db;

    const [created] = await db
      .insert(pushSubscriptions)
      .values({
        userId: subscription.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: subscription.userAgent,
        isActive: subscription.isActive,
      })
      .returning();

    return created;
  }

  async getPushSubscriptions(userId: string) {
    const db = this.drizzle.db;

    return db
      .select()
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));
  }

  async deactivatePushSubscription(userId: string, endpoint?: string) {
    const db = this.drizzle.db;

    const conditions = [eq(pushSubscriptions.userId, userId)];
    if (endpoint) {
      conditions.push(eq(pushSubscriptions.endpoint, endpoint));
    }

    await db
      .update(pushSubscriptions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(...conditions));
  }

  // SCHEDULED NOTIFICATION OPERATIONS
  async createScheduledNotification(
    notification: Omit<ScheduledNotification, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>,
  ) {
    const db = this.drizzle.db;

    const [created] = await db.insert(scheduledNotifications).values(notification).returning();

    return created;
  }

  async getPendingScheduledNotifications(limit = 100) {
    const db = this.drizzle.db;

    return db
      .select()
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.isActive, true),
          lte(scheduledNotifications.scheduledAt, new Date()),
        ),
      )
      .orderBy(asc(scheduledNotifications.scheduledAt))
      .limit(limit);
  }

  async updateScheduledNotification(id: string, data: Partial<ScheduledNotification>) {
    const db = this.drizzle.db;

    const [updated] = await db
      .update(scheduledNotifications)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(scheduledNotifications.id, id))
      .returning();

    return updated;
  }

  // BATCH OPERATIONS
  async createNotificationBatch(batch: Omit<NotificationBatch, 'id' | 'createdAt' | 'updatedAt'>) {
    const db = this.drizzle.db;

    const [created] = await db.insert(notificationBatches).values(batch).returning();

    return created;
  }

  async getBatchById(id: string) {
    const db = this.drizzle.db;

    const [batch] = await db
      .select()
      .from(notificationBatches)
      .where(eq(notificationBatches.id, id));

    return batch;
  }

  async updateBatchStatus(
    id: string,
    status: string,
    counts?: { success?: number; failure?: number },
  ) {
    const db = this.drizzle.db;

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'processing') {
      updateData.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (counts) {
      if (counts.success !== undefined) {
        updateData.successCount = counts.success;
      }
      if (counts.failure !== undefined) {
        updateData.failureCount = counts.failure;
      }
    }

    const [updated] = await db
      .update(notificationBatches)
      .set(updateData)
      .where(eq(notificationBatches.id, id))
      .returning();

    return updated;
  }

  // DELIVERY TRACKING
  async createDelivery(delivery: Omit<NotificationDelivery, 'id' | 'createdAt' | 'updatedAt'>) {
    const db = this.drizzle.db;

    const [created] = await db.insert(notificationDeliveries).values(delivery).returning();

    return created;
  }

  async updateDeliveryStatus(
    id: string,
    status: string,
    data?: { deliveredAt?: Date; failureReason?: string; externalId?: string },
  ) {
    const db = this.drizzle.db;

    const [updated] = await db
      .update(notificationDeliveries)
      .set({
        status,
        ...data,
        lastAttemptAt: new Date(),
        attempts: sql`${notificationDeliveries.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(notificationDeliveries.id, id))
      .returning();

    return updated;
  }

  async getDeliveriesByNotificationId(notificationId: string) {
    const db = this.drizzle.db;

    return db
      .select()
      .from(notificationDeliveries)
      .where(eq(notificationDeliveries.notificationId, notificationId))
      .orderBy(desc(notificationDeliveries.createdAt));
  }
}
