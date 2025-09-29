import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsRepository } from './notifications.repository';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from './notifications.gateway';
import {
  CreateNotificationData,
  NotificationQueryOptions,
  NotificationPreferences,
  NotificationTemplate,
  ScheduledNotification,
  NotificationBatch,
  PushSubscription,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  BulkNotificationOperation,
  NotificationStats,
} from './types/notification.types';
import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';

interface SendTestNotificationDto {
  type: string;
  channel?: string;
}

interface CreateNotificationDto {
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata?: any;
  scheduledAt?: Date;
  expiresAt?: Date;
  templateId?: string;
  templateVariables?: Record<string, any>;
}

interface NotificationQueryDto {
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  isRead?: boolean;
  isArchived?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface MarkAsReadDto {
  notificationIds: string[];
}

interface UpdateNotificationPreferencesDto {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  smsEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  categories?: Record<
    string,
    {
      enabled: boolean;
      channels: NotificationChannel[];
      priority: NotificationPriority;
    }
  >;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly emailService: EmailService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.initializeWebPush();
  }

  private initializeWebPush() {
    const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const vapidSubject = this.configService.get<string>(
      'VAPID_SUBJECT',
      'mailto:noreply@studyteddy.com',
    );

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }
  }

  // CORE NOTIFICATION OPERATIONS
  async createNotification(userId: string, data: CreateNotificationDto) {
    try {
      // Validate expiration date
      if (data.expiresAt && data.expiresAt <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }

      // Get user preferences to determine actual channels
      const preferences = await this.getUserPreferences(userId);
      const effectiveChannels = this.getEffectiveChannels(
        data.channels,
        data.category,
        preferences,
      );

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // If urgent, still send but only critical channels
        if (data.priority === NotificationPriority.URGENT) {
          effectiveChannels.push(NotificationChannel.EMAIL);
        } else {
          // Delay non-urgent notifications
          data.scheduledAt = this.getNextAvailableTime(preferences);
        }
      }

      // Apply template if provided
      let processedData = { ...data };
      if (data.templateId) {
        processedData = await this.applyTemplate(
          data.templateId,
          data.templateVariables || {},
          data,
        );
      }

      // Create notification
      const notification = await this.repository.create({
        userId,
        ...processedData,
        channels: effectiveChannels,
      });

      // Send immediately if not scheduled
      if (!data.scheduledAt || data.scheduledAt <= new Date()) {
        await this.deliverNotification(notification);
      }

      // Emit event for real-time updates
      this.eventEmitter.emit('notification.created', {
        userId,
        notification,
      });

      this.logger.log(
        `Created notification ${notification.id} for user ${userId}`,
      );
      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async getUserNotifications(userId: string, query: NotificationQueryDto) {
    const options: NotificationQueryOptions = {
      userId,
      type: query.type,
      category: query.category,
      priority: query.priority,
      status: query.status,
      isRead: query.isRead,
      isArchived: query.isArchived,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      limit: query.limit || 50,
      offset: query.offset || 0,
      sortBy: (query.sortBy as any) || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    return this.repository.findByUserId(userId, options);
  }

  async getNotificationById(id: string, userId: string) {
    const notification = await this.repository.findById(id);

    if (
      !notification ||
      notification.notifications_enhanced.userId !== userId
    ) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(userId: string, dto: MarkAsReadDto) {
    await this.repository.markAsRead(dto.notificationIds, userId);

    // Emit event for real-time updates
    this.eventEmitter.emit('notifications.read', {
      userId,
      notificationIds: dto.notificationIds,
    });

    return { success: true, message: 'Notifications marked as read' };
  }

  async markAllAsRead(userId: string) {
    await this.repository.markAllAsRead(userId);

    // Emit event for real-time updates
    this.eventEmitter.emit('notifications.allRead', { userId });

    return { success: true, message: 'All notifications marked as read' };
  }

  async deleteNotification(id: string, userId: string) {
    // Verify ownership
    await this.getNotificationById(id, userId);

    await this.repository.delete(id);

    // Emit event for real-time updates
    this.eventEmitter.emit('notification.deleted', {
      userId,
      notificationId: id,
    });

    return { success: true, message: 'Notification deleted' };
  }

  async clearAllNotifications(userId: string) {
    await this.repository.clearAllNotifications(userId);

    // Emit event for real-time updates
    this.eventEmitter.emit('notifications.cleared', { userId });

    return { success: true, message: 'All notifications cleared' };
  }

  async getUnreadCount(userId: string) {
    return this.repository.getUnreadCount(userId);
  }

  async archiveNotifications(userId: string, notificationIds: string[]) {
    await this.repository.archive(notificationIds, userId);

    // Emit event for real-time updates
    this.eventEmitter.emit('notifications.archived', {
      userId,
      notificationIds,
    });

    return { success: true, message: 'Notifications archived' };
  }

  // BULK OPERATIONS
  async bulkOperation(operation: BulkNotificationOperation) {
    await this.repository.bulkOperation(operation);

    // Emit event for real-time updates
    this.eventEmitter.emit('notifications.bulkOperation', operation);

    return { success: true, message: `Bulk ${operation.action} completed` };
  }

  // STATISTICS
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    return this.repository.getNotificationStats(userId);
  }

  // PREFERENCES
  async getPreferences(userId: string) {
    let preferences = await this.repository.getUserPreferences(userId);

    if (!preferences) {
      // Create default preferences
      preferences = await this.repository.upsertUserPreferences(userId, {
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        smsEnabled: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
        categories: this.getDefaultCategoryPreferences(),
      });
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const updated = await this.repository.upsertUserPreferences(userId, dto);

    this.logger.log(`Updated notification preferences for user ${userId}`);
    return updated;
  }

  // PUSH NOTIFICATIONS
  async subscribeToPush(userId: string, subscription: any) {
    const pushSubscription: Omit<
      PushSubscription,
      'id' | 'createdAt' | 'updatedAt'
    > = {
      userId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: subscription.userAgent,
      isActive: true,
    };

    const created =
      await this.repository.createPushSubscription(pushSubscription);

    this.logger.log(`Created push subscription for user ${userId}`);
    return created;
  }

  async unsubscribeFromPush(userId: string, endpoint?: string) {
    await this.repository.deactivatePushSubscription(userId, endpoint);

    this.logger.log(`Deactivated push subscription for user ${userId}`);
    return { success: true, message: 'Unsubscribed from push notifications' };
  }

  async getPushSubscription(userId: string) {
    const subscriptions = await this.repository.getPushSubscriptions(userId);
    return {
      subscribed: subscriptions.length > 0,
      subscriptions,
    };
  }

  // TEMPLATES
  async createTemplate(template: Omit<NotificationTemplate, 'id'>) {
    return this.repository.createTemplate(template);
  }

  async getTemplates() {
    return this.repository.getTemplates();
  }

  async getTemplateById(id: string) {
    const template = await this.repository.getTemplateById(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async updateTemplate(id: string, data: Partial<NotificationTemplate>) {
    const template = await this.getTemplateById(id);
    return this.repository.updateTemplate(id, data);
  }

  async deleteTemplate(id: string) {
    await this.getTemplateById(id);
    await this.repository.deleteTemplate(id);
    return { success: true, message: 'Template deleted' };
  }

  // SCHEDULED NOTIFICATIONS
  async scheduleNotification(
    userId: string,
    notification: Omit<
      ScheduledNotification,
      'id' | 'createdAt' | 'updatedAt' | 'executionCount'
    >,
  ) {
    return this.repository.createScheduledNotification({
      ...notification,
      userId,
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    try {
      const pendingNotifications =
        await this.repository.getPendingScheduledNotifications(100);

      for (const scheduled of pendingNotifications) {
        await this.executeScheduledNotification(scheduled);
      }
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications', error);
    }
  }

  // BATCH NOTIFICATIONS
  async sendBatchNotifications(
    batch: Omit<NotificationBatch, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    const createdBatch = await this.repository.createNotificationBatch({
      ...batch,
      totalCount: batch.userIds.length,
    });

    // Process batch asynchronously
    this.processBatchNotifications(createdBatch.id);

    return createdBatch;
  }

  async getBatchStatus(batchId: string) {
    const batch = await this.repository.getBatchById(batchId);
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    return batch;
  }

  // TEST NOTIFICATION
  async sendTestNotification(userId: string, testDto: SendTestNotificationDto) {
    const testNotification: CreateNotificationDto = {
      title: 'Test Notification',
      message: `This is a test ${testDto.type} notification to verify your settings.`,
      type: (testDto.type as NotificationType) || NotificationType.INFO,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.LOW,
      channels: testDto.channel
        ? [testDto.channel as NotificationChannel]
        : [NotificationChannel.IN_APP],
    };

    return this.createNotification(userId, testNotification);
  }

  // DELIVERY METHODS
  private async deliverNotification(notification: any) {
    const deliveryPromises = notification.channels.map(
      (channel: NotificationChannel) =>
        this.deliverToChannel(notification, channel),
    );

    await Promise.allSettled(deliveryPromises);
  }

  private async deliverToChannel(
    notification: any,
    channel: NotificationChannel,
  ) {
    try {
      // Create delivery record
      const delivery = await this.repository.createDelivery({
        notificationId: notification.id,
        channel,
        status: NotificationStatus.PENDING,
        attempts: 0,
      });

      let success = false;
      let externalId: string | undefined;
      let failureReason: string | undefined;

      switch (channel) {
        case NotificationChannel.IN_APP:
          success = await this.deliverInApp(notification);
          break;

        case NotificationChannel.WEBSOCKET:
          success = await this.deliverWebSocket(notification);
          break;

        case NotificationChannel.EMAIL:
          const emailResult = await this.deliverEmail(notification);
          success = emailResult.success;
          externalId = emailResult.externalId;
          failureReason = emailResult.error;
          break;

        case NotificationChannel.PUSH:
          const pushResult = await this.deliverPush(notification);
          success = pushResult.success;
          failureReason = pushResult.error;
          break;

        case NotificationChannel.SMS:
          // SMS implementation would go here
          success = false;
          failureReason = 'SMS delivery not implemented';
          break;
      }

      // Update delivery status
      await this.repository.updateDeliveryStatus(
        delivery.id,
        success ? NotificationStatus.DELIVERED : NotificationStatus.FAILED,
        {
          deliveredAt: success ? new Date() : undefined,
          failureReason,
          externalId,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to deliver notification ${notification.id} via ${channel}`,
        error,
      );
    }
  }

  private async deliverInApp(notification: any): Promise<boolean> {
    // Update notification status
    await this.repository.update(notification.id, {
      status: NotificationStatus.DELIVERED,
    });
    return true;
  }

  private async deliverWebSocket(notification: any): Promise<boolean> {
    try {
      this.notificationsGateway.sendNotificationToUser(
        notification.userId,
        notification,
      );
      return true;
    } catch (error) {
      this.logger.error('Failed to deliver WebSocket notification', error);
      return false;
    }
  }

  private async deliverEmail(
    notification: any,
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      // Get user email - this would need to be implemented based on your user service
      const userEmail = await this.getUserEmail(notification.userId);

      if (!userEmail) {
        return { success: false, error: 'User email not found' };
      }

      await this.emailService.sendEmail({
        to: userEmail,
        subject: notification.title,
        html: this.buildEmailHtml(notification),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async deliverPush(
    notification: any,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriptions = await this.repository.getPushSubscriptions(
        notification.userId,
      );

      if (subscriptions.length === 0) {
        return { success: false, error: 'No push subscriptions found' };
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: notification.metadata?.icon || '/icon-192x192.png',
        badge: notification.metadata?.badge || '/badge-72x72.png',
        data: {
          notificationId: notification.id,
          url: notification.metadata?.actionUrl,
          ...notification.metadata?.data,
        },
      });

      const deliveryPromises = subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send push notification to subscription ${subscription.id}`,
            error,
          );
          // Deactivate failed subscription
          if (error.statusCode === 410) {
            await this.repository.deactivatePushSubscription(
              notification.userId,
              subscription.endpoint,
            );
          }
        }
      });

      await Promise.allSettled(deliveryPromises);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // HELPER METHODS
  private getEffectiveChannels(
    requestedChannels: NotificationChannel[],
    category: NotificationCategory,
    preferences: any,
  ): NotificationChannel[] {
    const effectiveChannels: NotificationChannel[] = [];

    for (const channel of requestedChannels) {
      const channelEnabled = this.isChannelEnabled(
        channel,
        category,
        preferences,
      );
      if (channelEnabled) {
        effectiveChannels.push(channel);
      }
    }

    // Always include in-app if no other channels are enabled
    if (effectiveChannels.length === 0) {
      effectiveChannels.push(NotificationChannel.IN_APP);
    }

    return effectiveChannels;
  }

  private isChannelEnabled(
    channel: NotificationChannel,
    category: NotificationCategory,
    preferences: any,
  ): boolean {
    if (!preferences) return true;

    // Check global channel preferences
    switch (channel) {
      case NotificationChannel.EMAIL:
        if (!preferences.emailEnabled) return false;
        break;
      case NotificationChannel.PUSH:
        if (!preferences.pushEnabled) return false;
        break;
      case NotificationChannel.IN_APP:
        if (!preferences.inAppEnabled) return false;
        break;
      case NotificationChannel.SMS:
        if (!preferences.smsEnabled) return false;
        break;
    }

    // Check category-specific preferences
    const categoryPrefs = preferences.categories?.[category];
    if (categoryPrefs) {
      return categoryPrefs.enabled && categoryPrefs.channels.includes(channel);
    }

    return true;
  }

  private isInQuietHours(preferences: any): boolean {
    if (!preferences?.quietHoursEnabled) return false;

    const now = new Date();
    const timezone = preferences.timezone || 'UTC';

    // This is a simplified implementation - you'd want to use a proper timezone library
    const currentTime = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const quietStart = preferences.quietHoursStart || '22:00';
    const quietEnd = preferences.quietHoursEnd || '08:00';

    // Handle quiet hours that span midnight
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    } else {
      return currentTime >= quietStart && currentTime <= quietEnd;
    }
  }

  private getNextAvailableTime(preferences: any): Date {
    const now = new Date();
    const quietEnd = preferences.quietHoursEnd || '08:00';
    const [hours, minutes] = quietEnd.split(':').map(Number);

    const nextAvailable = new Date(now);
    nextAvailable.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextAvailable <= now) {
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    return nextAvailable;
  }

  private async applyTemplate(
    templateId: string,
    variables: Record<string, any>,
    baseData: any,
  ) {
    const template = await this.getTemplateById(templateId);

    let title = template.title;
    let message = template.message;

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      title = title.replace(regex, String(value));
      message = message.replace(regex, String(value));
    }

    return {
      ...baseData,
      title,
      message,
      type: template.type,
      category: template.category,
      priority: template.priority,
      channels: template.channels,
      metadata: { ...template.metadata, ...baseData.metadata },
    };
  }

  private async executeScheduledNotification(scheduled: any) {
    try {
      // Create the notification
      await this.createNotification(scheduled.userId, {
        title: scheduled.title,
        message: scheduled.message,
        type: scheduled.type,
        category: scheduled.category,
        priority: scheduled.priority,
        channels: scheduled.channels,
        metadata: scheduled.metadata,
        templateId: scheduled.templateId,
      });

      // Update scheduled notification
      const updateData: any = {
        lastExecutedAt: new Date(),
        executionCount: scheduled.executionCount + 1,
      };

      // Handle recurring notifications
      if (scheduled.recurring) {
        const nextExecution = this.calculateNextExecution(scheduled);
        if (nextExecution) {
          updateData.scheduledAt = nextExecution;
        } else {
          updateData.isActive = false;
        }
      } else {
        updateData.isActive = false;
      }

      await this.repository.updateScheduledNotification(
        scheduled.id,
        updateData,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled notification ${scheduled.id}`,
        error,
      );
    }
  }

  private calculateNextExecution(scheduled: any): Date | null {
    const { recurring } = scheduled;
    const now = new Date();

    if (recurring.endDate && new Date(recurring.endDate) <= now) {
      return null;
    }

    if (
      recurring.maxOccurrences &&
      scheduled.executionCount >= recurring.maxOccurrences
    ) {
      return null;
    }

    const next = new Date(scheduled.scheduledAt);

    switch (recurring.interval) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  private async processBatchNotifications(batchId: string) {
    try {
      await this.repository.updateBatchStatus(batchId, 'processing');

      const batch = await this.repository.getBatchById(batchId);
      if (!batch) return;

      let successCount = 0;
      let failureCount = 0;

      for (const userId of batch.userIds) {
        try {
          let notificationData: CreateNotificationDto;

          if (batch.templateId) {
            const template = await this.getTemplateById(batch.templateId);
            notificationData = {
              title: template.title,
              message: template.message,
              type: template.type,
              category: template.category,
              priority: template.priority,
              channels: template.channels,
              metadata: template.metadata,
              templateId: batch.templateId,
            };
          } else {
            // Use batch name and description as notification content
            notificationData = {
              title: batch.name,
              message: batch.description || batch.name,
              type: NotificationType.INFO,
              category: NotificationCategory.SYSTEM,
              priority: NotificationPriority.MEDIUM,
              channels: [NotificationChannel.IN_APP],
            };
          }

          await this.createNotification(userId, notificationData);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to send batch notification to user ${userId}`,
            error,
          );
          failureCount++;
        }
      }

      await this.repository.updateBatchStatus(batchId, 'completed', {
        success: successCount,
        failure: failureCount,
      });
    } catch (error) {
      this.logger.error(`Failed to process batch ${batchId}`, error);
      await this.repository.updateBatchStatus(batchId, 'failed');
    }
  }

  private getDefaultCategoryPreferences() {
    const defaultChannels = [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
    ];

    return {
      [NotificationCategory.STUDY]: {
        enabled: true,
        channels: defaultChannels,
        priority: NotificationPriority.MEDIUM,
      },
      [NotificationCategory.TASK]: {
        enabled: true,
        channels: defaultChannels,
        priority: NotificationPriority.MEDIUM,
      },
      [NotificationCategory.GOAL]: {
        enabled: true,
        channels: defaultChannels,
        priority: NotificationPriority.MEDIUM,
      },
      [NotificationCategory.SESSION]: {
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        priority: NotificationPriority.LOW,
      },
      [NotificationCategory.SYSTEM]: {
        enabled: true,
        channels: defaultChannels,
        priority: NotificationPriority.HIGH,
      },
      [NotificationCategory.SOCIAL]: {
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        priority: NotificationPriority.LOW,
      },
      [NotificationCategory.REMINDER]: {
        enabled: true,
        channels: [...defaultChannels, NotificationChannel.PUSH],
        priority: NotificationPriority.HIGH,
      },
    };
  }

  private buildEmailHtml(notification: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${notification.title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${notification.title}</h1>
            </div>
            <div class="content">
              <p>${notification.message}</p>
              ${
                notification.metadata?.actionUrl
                  ? `
                <p>
                  <a href="${notification.metadata.actionUrl}" class="button">
                    ${notification.metadata.actionText || 'View Details'}
                  </a>
                </p>
              `
                  : ''
              }
            </div>
            <div class="footer">
              <p>This is an automated message from Study Teddy. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    // This would need to be implemented based on your user service
    // For now, returning null to prevent errors
    this.logger.warn(`getUserEmail not implemented for user ${userId}`);
    return null;
  }
}
