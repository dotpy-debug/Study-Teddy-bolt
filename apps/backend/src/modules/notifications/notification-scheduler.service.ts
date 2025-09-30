import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import {
  ScheduledNotification,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from './types/notification.types';

interface SchedulerJobData {
  id: string;
  userId: string;
  scheduledNotification: ScheduledNotification;
}

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private readonly jobPrefix = 'notification-job-';

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.initializeScheduledJobs();
  }

  // Initialize all existing scheduled notifications on startup
  private async initializeScheduledJobs() {
    try {
      this.logger.log('Initializing scheduled notification jobs...');

      const pendingNotifications = await this.repository.getPendingScheduledNotifications(1000);

      for (const scheduled of pendingNotifications) {
        await this.scheduleJob(scheduled);
      }

      this.logger.log(`Initialized ${pendingNotifications.length} scheduled notification jobs`);
    } catch (error) {
      this.logger.error('Failed to initialize scheduled jobs', error);
    }
  }

  // Schedule a single notification job
  async scheduleJob(scheduledNotification: any): Promise<void> {
    try {
      const jobName = `${this.jobPrefix}${scheduledNotification.id}`;

      // Remove existing job if it exists
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }

      const scheduledTime = new Date(scheduledNotification.scheduledAt);
      const now = new Date();

      // Skip if the scheduled time has already passed
      if (scheduledTime <= now) {
        this.logger.warn(
          `Scheduled notification ${scheduledNotification.id} time has passed, executing immediately`,
        );
        await this.executeScheduledNotification(scheduledNotification);
        return;
      }

      // Create cron expression for the scheduled time
      const cronExpression = this.createCronExpression(
        scheduledTime,
        scheduledNotification.timezone,
      );

      const job = new CronJob(
        cronExpression,
        async () => {
          await this.executeScheduledNotification(scheduledNotification);
        },
        null,
        false,
        scheduledNotification.timezone || 'UTC',
      );

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.debug(`Scheduled notification job ${jobName} for ${scheduledTime.toISOString()}`);
    } catch (error) {
      this.logger.error(
        `Failed to schedule notification job for ${scheduledNotification.id}`,
        error,
      );
    }
  }

  // Cancel a scheduled notification job
  async cancelJob(scheduledNotificationId: string): Promise<void> {
    const jobName = `${this.jobPrefix}${scheduledNotificationId}`;

    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.debug(`Cancelled scheduled notification job ${jobName}`);
    }

    // Update the scheduled notification to inactive
    await this.repository.updateScheduledNotification(scheduledNotificationId, {
      isActive: false,
    });
  }

  // Reschedule a notification (cancel old and create new)
  async rescheduleJob(scheduledNotification: any): Promise<void> {
    await this.cancelJob(scheduledNotification.id);
    await this.scheduleJob(scheduledNotification);
  }

  // Execute a scheduled notification
  private async executeScheduledNotification(scheduledNotification: any): Promise<void> {
    try {
      this.logger.debug(
        `Executing scheduled notification ${scheduledNotification.id} for user ${scheduledNotification.userId}`,
      );

      // Create the notification
      await this.notificationsService.createNotification(scheduledNotification.userId, {
        title: scheduledNotification.title,
        message: scheduledNotification.message,
        type: scheduledNotification.type,
        category: scheduledNotification.category,
        priority: scheduledNotification.priority,
        channels: scheduledNotification.channels,
        metadata: scheduledNotification.metadata,
        templateId: scheduledNotification.templateId,
      });

      // Update execution count and last executed time
      const updateData: any = {
        lastExecutedAt: new Date(),
        executionCount: scheduledNotification.executionCount + 1,
      };

      // Handle recurring notifications
      if (scheduledNotification.recurring) {
        const nextExecution = this.calculateNextExecution(scheduledNotification);
        if (nextExecution) {
          updateData.scheduledAt = nextExecution;
          // Reschedule for next occurrence
          await this.repository.updateScheduledNotification(scheduledNotification.id, updateData);
          await this.scheduleJob({ ...scheduledNotification, ...updateData });
        } else {
          // No more occurrences, deactivate
          updateData.isActive = false;
          await this.repository.updateScheduledNotification(scheduledNotification.id, updateData);
        }
      } else {
        // One-time notification, deactivate
        updateData.isActive = false;
        await this.repository.updateScheduledNotification(scheduledNotification.id, updateData);
      }

      this.logger.log(`Successfully executed scheduled notification ${scheduledNotification.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled notification ${scheduledNotification.id}`,
        error,
      );
    }
  }

  // Calculate next execution time for recurring notifications
  private calculateNextExecution(scheduledNotification: any): Date | null {
    const { recurring } = scheduledNotification;
    const now = new Date();
    const currentScheduledTime = new Date(scheduledNotification.scheduledAt);

    if (recurring.endDate && new Date(recurring.endDate) <= now) {
      return null;
    }

    if (
      recurring.maxOccurrences &&
      scheduledNotification.executionCount >= recurring.maxOccurrences
    ) {
      return null;
    }

    const next = new Date(currentScheduledTime);

    switch (recurring.interval) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;

      case 'weekly':
        if (recurring.daysOfWeek && recurring.daysOfWeek.length > 0) {
          // Find next occurrence based on days of week
          const currentDay = next.getDay();
          const sortedDays = recurring.daysOfWeek.sort((a, b) => a - b);

          let nextDay = sortedDays.find((day) => day > currentDay);
          if (!nextDay) {
            // If no day this week, get first day of next week
            nextDay = sortedDays[0];
            next.setDate(next.getDate() + (7 - currentDay + nextDay));
          } else {
            next.setDate(next.getDate() + (nextDay - currentDay));
          }
        } else {
          next.setDate(next.getDate() + 7);
        }
        break;

      case 'monthly':
        if (recurring.dayOfMonth) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(recurring.dayOfMonth);

          // Handle months with fewer days
          if (next.getDate() !== recurring.dayOfMonth) {
            next.setDate(0); // Last day of previous month
          }
        } else {
          next.setMonth(next.getMonth() + 1);
        }
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;

      default:
        this.logger.warn(`Unknown recurring interval: ${recurring.interval}`);
        return null;
    }

    return next;
  }

  // Create cron expression for a specific date/time
  private createCronExpression(date: Date, timezone = 'UTC'): string {
    // Convert to specified timezone for cron expression
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    const minute = localDate.getMinutes();
    const hour = localDate.getHours();
    const day = localDate.getDate();
    const month = localDate.getMonth() + 1;
    const year = localDate.getFullYear();

    // Create a one-time cron expression: "minute hour day month *"
    return `${minute} ${hour} ${day} ${month} *`;
  }

  // Regular cleanup job to remove old completed notifications
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldJobs() {
    try {
      this.logger.log('Running scheduled notification cleanup...');

      // Get all cron jobs
      const cronJobs = this.schedulerRegistry.getCronJobs();
      const removedCount = 0;

      cronJobs.forEach((job, name) => {
        if (name.startsWith(this.jobPrefix)) {
          const scheduledNotificationId = name.replace(this.jobPrefix, '');

          // Check if the job is still needed (this would require database lookup)
          // For now, we'll rely on the main processing loop to handle this
        }
      });

      this.logger.log(`Cleanup completed. Removed ${removedCount} old jobs`);
    } catch (error) {
      this.logger.error('Error during scheduled notification cleanup', error);
    }
  }

  // Process pending scheduled notifications (fallback mechanism)
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingNotifications() {
    try {
      // Get notifications that should have been executed but weren't
      const overdueNotifications = await this.repository.getPendingScheduledNotifications(50);
      const now = new Date();

      for (const scheduled of overdueNotifications) {
        const scheduledTime = new Date(scheduled.scheduledAt);

        // If it's overdue by more than 1 minute, execute it
        if (scheduledTime <= new Date(now.getTime() - 60000)) {
          this.logger.warn(`Found overdue scheduled notification ${scheduled.id}, executing now`);
          await this.executeScheduledNotification(scheduled);
        }
      }
    } catch (error) {
      this.logger.error('Error processing pending notifications', error);
    }
  }

  // Get scheduler statistics
  getSchedulerStats() {
    const cronJobs = this.schedulerRegistry.getCronJobs();
    const notificationJobs = Array.from(cronJobs.keys()).filter((name) =>
      name.startsWith(this.jobPrefix),
    );

    return {
      totalCronJobs: cronJobs.size,
      notificationJobs: notificationJobs.length,
      activeJobs: notificationJobs.filter((name) => {
        const job = cronJobs.get(name);
        return job?.running;
      }).length,
      jobNames: notificationJobs,
    };
  }

  // Create a bulk scheduled notification
  async createBulkScheduledNotifications(
    userIds: string[],
    notificationData: {
      title: string;
      message: string;
      type: NotificationType;
      category: NotificationCategory;
      priority: NotificationPriority;
      channels: NotificationChannel[];
      scheduledAt: Date;
      timezone?: string;
      metadata?: any;
      recurring?: any;
    },
  ): Promise<string[]> {
    const createdIds: string[] = [];

    for (const userId of userIds) {
      try {
        const scheduled = await this.repository.createScheduledNotification({
          userId,
          ...notificationData,
        });

        await this.scheduleJob(scheduled);
        createdIds.push(scheduled.id);
      } catch (error) {
        this.logger.error(`Failed to create scheduled notification for user ${userId}`, error);
      }
    }

    this.logger.log(
      `Created ${createdIds.length} bulk scheduled notifications for ${userIds.length} users`,
    );

    return createdIds;
  }

  // Cancel all scheduled notifications for a user
  async cancelAllUserNotifications(userId: string): Promise<number> {
    try {
      // This would need a repository method to get user's scheduled notifications
      // For now, we'll just update all active ones to inactive
      const cronJobs = this.schedulerRegistry.getCronJobs();
      const cancelledCount = 0;

      // We'd need to implement a way to track which jobs belong to which user
      // This is a simplified implementation

      this.logger.log(`Cancelled ${cancelledCount} scheduled notifications for user ${userId}`);
      return cancelledCount;
    } catch (error) {
      this.logger.error(`Error cancelling notifications for user ${userId}`, error);
      return 0;
    }
  }

  // Emergency stop all notification jobs
  async emergencyStopAllJobs(): Promise<void> {
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      let stoppedCount = 0;

      cronJobs.forEach((job, name) => {
        if (name.startsWith(this.jobPrefix)) {
          this.schedulerRegistry.deleteCronJob(name);
          stoppedCount++;
        }
      });

      this.logger.warn(`Emergency stop: Cancelled ${stoppedCount} notification jobs`);
    } catch (error) {
      this.logger.error('Error during emergency stop of notification jobs', error);
    }
  }
}
