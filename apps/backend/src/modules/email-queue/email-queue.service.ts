import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EMAIL_QUEUE,
  WEEKLY_DIGEST_QUEUE,
  RETRY_QUEUE,
} from './email-queue.module';
import {
  EmailJobData,
  EmailJobOptions,
  WeeklyDigestJobData,
  RetryEmailJobData,
} from './types/email-job.types';
import { QuietHoursService } from './services/quiet-hours.service';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private emailQueue: Queue,
    @InjectQueue(WEEKLY_DIGEST_QUEUE) private weeklyDigestQueue: Queue,
    @InjectQueue(RETRY_QUEUE) private retryQueue: Queue,
    private quietHoursService: QuietHoursService,
  ) {}

  async addEmailJob(
    emailData: EmailJobData,
    options: EmailJobOptions = {},
  ): Promise<string> {
    try {
      // Check if we should respect quiet hours
      let delay = options.delay || 0;

      if (emailData.respectQuietHours !== false) {
        const shouldRespect =
          await this.quietHoursService.shouldRespectQuietHours(
            emailData.userId,
            emailData.type,
            emailData.priority || 50,
          );

        if (shouldRespect) {
          const allowedTime =
            await this.quietHoursService.getNextAllowedSendTime(
              emailData.userId,
              emailData.scheduledFor,
            );

          const now = new Date();
          if (allowedTime > now) {
            delay = Math.max(delay, allowedTime.getTime() - now.getTime());
            this.logger.debug(`Email delayed due to quiet hours`, {
              userId: emailData.userId,
              emailType: emailData.type,
              originalSchedule: emailData.scheduledFor,
              newSchedule: allowedTime,
              delayMs: delay,
            });
          }
        }
      }

      const job = await this.emailQueue.add(
        `send-${emailData.type}`,
        emailData,
        {
          delay,
          priority: emailData.priority || 50,
          attempts: emailData.maxRetries || 3,
          removeOnComplete: options.removeOnComplete ?? 100,
          removeOnFail: options.removeOnFail ?? 50,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          ...options,
        },
      );

      this.logger.debug(`Added email job to queue`, {
        jobId: job.id,
        emailType: emailData.type,
        userId: emailData.userId,
        recipient: emailData.recipientEmail,
        priority: emailData.priority,
        delay,
      });

      return job.id as string;
    } catch (error) {
      this.logger.error('Failed to add email job to queue', {
        error: error.message,
        emailData,
        options,
      });
      throw error;
    }
  }

  async addWelcomeEmail(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    verificationUrl?: string,
    options: EmailJobOptions = {},
  ): Promise<string> {
    return this.addEmailJob(
      {
        type: 'welcome',
        userId,
        recipientEmail,
        recipientName,
        verificationUrl,
        priority: 70, // High priority for welcome emails
      },
      options,
    );
  }

  async addVerificationEmail(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    verificationToken: string,
    verificationUrl: string,
    options: EmailJobOptions = {},
  ): Promise<string> {
    return this.addEmailJob(
      {
        type: 'verification',
        userId,
        recipientEmail,
        recipientName,
        verificationToken,
        verificationUrl,
        priority: 90, // Very high priority for verification
        respectQuietHours: false, // Don't respect quiet hours for verification
      },
      options,
    );
  }

  async addPasswordResetEmail(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    resetToken: string,
    resetUrl: string,
    requestedAt: Date,
    options: EmailJobOptions = {},
  ): Promise<string> {
    return this.addEmailJob(
      {
        type: 'password_reset',
        userId,
        recipientEmail,
        recipientName,
        resetToken,
        resetUrl,
        requestedAt,
        priority: 90, // Very high priority for password reset
        respectQuietHours: false, // Don't respect quiet hours for password reset
      },
      options,
    );
  }

  async addTaskReminderEmail(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    taskId: string,
    taskTitle: string,
    dueDate: Date,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    reminderType: 'due_soon' | 'overdue' | 'daily_digest',
    taskDescription?: string,
    subjectName?: string,
    options: EmailJobOptions = {},
  ): Promise<string> {
    const emailPriority =
      reminderType === 'overdue'
        ? 80
        : priority === 'urgent'
          ? 70
          : priority === 'high'
            ? 60
            : 50;

    return this.addEmailJob(
      {
        type: 'task_reminder',
        userId,
        recipientEmail,
        recipientName,
        taskId,
        taskTitle,
        taskDescription,
        dueDate,
        priority,
        subjectName,
        reminderType,
        priority: emailPriority,
      },
      options,
    );
  }

  async addFocusSessionAlertEmail(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    sessionId: string,
    sessionType: 'completed' | 'interrupted' | 'milestone',
    durationMinutes: number,
    focusScore?: number,
    taskTitle?: string,
    subjectName?: string,
    pomodoroCount?: number,
    options: EmailJobOptions = {},
  ): Promise<string> {
    return this.addEmailJob(
      {
        type: 'focus_session_alert',
        userId,
        recipientEmail,
        recipientName,
        sessionId,
        sessionType,
        durationMinutes,
        focusScore,
        taskTitle,
        subjectName,
        pomodoroCount,
        priority: 40, // Lower priority for session alerts
      },
      options,
    );
  }

  async addAchievementEmail(
    userId: string,
    recipientEmail: string,
    recipientName: string,
    achievementType:
      | 'goal_completed'
      | 'streak_milestone'
      | 'focus_milestone'
      | 'task_completion_streak',
    achievementTitle: string,
    achievementDescription: string,
    achievementIcon?: string,
    relatedData?: any,
    options: EmailJobOptions = {},
  ): Promise<string> {
    return this.addEmailJob(
      {
        type: 'achievement',
        userId,
        recipientEmail,
        recipientName,
        achievementType,
        achievementTitle,
        achievementDescription,
        achievementIcon,
        relatedData,
        priority: 30, // Lower priority for achievements
      },
      options,
    );
  }

  async scheduleWeeklyDigest(
    userId: string,
    weekStartDate: Date,
    weekEndDate: Date,
    timezone: string,
    userPreferences: {
      emailEnabled: boolean;
      weeklyDigestEnabled: boolean;
      digestTime: string;
      digestDay: number;
    },
    options: EmailJobOptions = {},
  ): Promise<string> {
    try {
      if (
        !userPreferences.emailEnabled ||
        !userPreferences.weeklyDigestEnabled
      ) {
        this.logger.debug(`Weekly digest disabled for user ${userId}`);
        return null;
      }

      const job = await this.weeklyDigestQueue.add(
        'generate-weekly-digest',
        {
          userId,
          weekStartDate,
          weekEndDate,
          timezone,
          userPreferences,
        } as WeeklyDigestJobData,
        {
          priority: 20, // Lower priority for digest
          removeOnComplete: 10,
          removeOnFail: 5,
          ...options,
        },
      );

      this.logger.debug(`Scheduled weekly digest generation`, {
        jobId: job.id,
        userId,
        weekStartDate,
        weekEndDate,
      });

      return job.id as string;
    } catch (error) {
      this.logger.error('Failed to schedule weekly digest', {
        error: error.message,
        userId,
        weekStartDate,
        weekEndDate,
      });
      throw error;
    }
  }

  async retryFailedEmail(
    originalJobId: string,
    emailDeliveryLogId: string,
    attemptNumber: number,
    originalJobData: EmailJobData,
    options: EmailJobOptions = {},
  ): Promise<string> {
    try {
      const job = await this.retryQueue.add(
        'retry-email',
        {
          originalJobId,
          emailDeliveryLogId,
          attemptNumber,
          originalJobData,
        } as RetryEmailJobData,
        {
          priority: originalJobData.priority || 50,
          attempts: 1, // No retries for retry queue
          removeOnComplete: 50,
          removeOnFail: 25,
          ...options,
        },
      );

      this.logger.debug(`Added email retry job`, {
        jobId: job.id,
        originalJobId,
        emailDeliveryLogId,
        attemptNumber,
      });

      return job.id as string;
    } catch (error) {
      this.logger.error('Failed to add email retry job', {
        error: error.message,
        originalJobId,
        emailDeliveryLogId,
      });
      throw error;
    }
  }

  async getQueueStats(): Promise<{
    email: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    weeklyDigest: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    retry: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    try {
      const [emailStats, digestStats, retryStats] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.weeklyDigestQueue.getWaiting(),
        this.retryQueue.getWaiting(),
      ]);

      const [emailActive, digestActive, retryActive] = await Promise.all([
        this.emailQueue.getActive(),
        this.weeklyDigestQueue.getActive(),
        this.retryQueue.getActive(),
      ]);

      const [emailCompleted, digestCompleted, retryCompleted] =
        await Promise.all([
          this.emailQueue.getCompleted(),
          this.weeklyDigestQueue.getCompleted(),
          this.retryQueue.getCompleted(),
        ]);

      const [emailFailed, digestFailed, retryFailed] = await Promise.all([
        this.emailQueue.getFailed(),
        this.weeklyDigestQueue.getFailed(),
        this.retryQueue.getFailed(),
      ]);

      return {
        email: {
          waiting: emailStats.length,
          active: emailActive.length,
          completed: emailCompleted.length,
          failed: emailFailed.length,
        },
        weeklyDigest: {
          waiting: digestStats.length,
          active: digestActive.length,
          completed: digestCompleted.length,
          failed: digestFailed.length,
        },
        retry: {
          waiting: retryStats.length,
          active: retryActive.length,
          completed: retryCompleted.length,
          failed: retryFailed.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats', {
        error: error.message,
      });
      return {
        email: { waiting: 0, active: 0, completed: 0, failed: 0 },
        weeklyDigest: { waiting: 0, active: 0, completed: 0, failed: 0 },
        retry: { waiting: 0, active: 0, completed: 0, failed: 0 },
      };
    }
  }

  async pauseQueues(): Promise<void> {
    await Promise.all([
      this.emailQueue.pause(),
      this.weeklyDigestQueue.pause(),
      this.retryQueue.pause(),
    ]);
    this.logger.log('All email queues paused');
  }

  async resumeQueues(): Promise<void> {
    await Promise.all([
      this.emailQueue.resume(),
      this.weeklyDigestQueue.resume(),
      this.retryQueue.resume(),
    ]);
    this.logger.log('All email queues resumed');
  }

  async clearFailedJobs(): Promise<number> {
    try {
      const [emailCleared, digestCleared, retryCleared] = await Promise.all([
        this.emailQueue.clean(0, 100, 'failed'),
        this.weeklyDigestQueue.clean(0, 100, 'failed'),
        this.retryQueue.clean(0, 100, 'failed'),
      ]);

      const totalCleared =
        emailCleared.length + digestCleared.length + retryCleared.length;

      this.logger.log(`Cleared ${totalCleared} failed jobs from queues`, {
        email: emailCleared.length,
        weeklyDigest: digestCleared.length,
        retry: retryCleared.length,
      });

      return totalCleared;
    } catch (error) {
      this.logger.error('Failed to clear failed jobs', {
        error: error.message,
      });
      return 0;
    }
  }
}
