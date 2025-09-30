import { Processor, OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: ('push' | 'email' | 'in-app')[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
}

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJob>): Promise<any> {
    this.logger.debug(`Processing notification job ${job.id}`);
    const { userId, type, title, message, data = {}, channels, priority } = job.data;

    try {
      this.logger.log(`Processing notification: ${type} for user ${userId} - ${title}`);

      // Determine notification channels (default to in-app if not specified)
      const notificationChannels = channels || ['in-app'];

      // Process notification based on type
      switch (type) {
        case 'task_reminder':
          await this.processTaskReminder(userId, title, message, data || {}, notificationChannels);
          break;
        case 'study_reminder':
          await this.processStudyReminder(userId, title, message, data || {}, notificationChannels);
          break;
        case 'achievement_unlocked':
          await this.processAchievementNotification(
            userId,
            title,
            message,
            data || {},
            notificationChannels,
          );
          break;
        case 'weekly_summary':
          await this.processWeeklySummary(userId, title, message, data || {}, notificationChannels);
          break;
        case 'system_announcement':
          await this.processSystemAnnouncement(
            userId,
            title,
            message,
            data || {},
            notificationChannels,
          );
          break;
        case 'friend_request':
          await this.processFriendRequest(userId, title, message, data || {}, notificationChannels);
          break;
        case 'study_group_invite':
          await this.processStudyGroupInvite(
            userId,
            title,
            message,
            data || {},
            notificationChannels,
          );
          break;
        default:
          await this.processGenericNotification(
            userId,
            type,
            title,
            message,
            data || {},
            notificationChannels,
          );
      }

      this.logger.log(`Notification ${type} sent successfully to user ${userId}`);
      return {
        success: true,
        userId,
        type,
        title,
        channels: notificationChannels,
        priority,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to process notification ${type} for user ${userId}:`, error);
      throw error;
    }
  }

  private async processTaskReminder(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing task reminder for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async processStudyReminder(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing study reminder for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async processAchievementNotification(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing achievement notification for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async processWeeklySummary(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing weekly summary for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async processSystemAnnouncement(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing system announcement for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async processFriendRequest(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing friend request for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async processStudyGroupInvite(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing study group invite for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async processGenericNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<void> {
    this.logger.debug(`Processing generic notification ${type} for user ${userId}: ${title}`);

    for (const channel of channels) {
      switch (channel) {
        case 'push':
          await this.sendPushNotification(userId, title, message, data);
          break;
        case 'email':
          await this.sendEmailNotification(userId, title, message, data);
          break;
        case 'in-app':
          await this.sendInAppNotification(userId, title, message, data);
          break;
      }
    }
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(`Sending push notification to user ${userId}: ${title}`);
    // Placeholder: would integrate with push notification service (FCM, APNs, etc.)
  }

  private async sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(`Sending email notification to user ${userId}: ${title}`);
    // Placeholder: would integrate with email service or queue email job
  }

  private async sendInAppNotification(
    userId: string,
    title: string,
    message: string,
    data: Record<string, any>,
  ): Promise<void> {
    this.logger.debug(`Sending in-app notification to user ${userId}: ${title}`);
    // Placeholder: would store notification in database for user to see in app
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationJob>) {
    this.logger.debug(`Notification job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJob>, error: Error) {
    this.logger.error(`Notification job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<NotificationJob>) {
    this.logger.debug(`Notification job ${job.id} started`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job<NotificationJob>) {
    this.logger.warn(`Notification job ${job.id} stalled`);
  }
}
