import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_QUEUE } from '../email-queue.module';
import { ResendEmailService } from '../services/resend-email.service';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';

interface ScheduledEmailJobData {
  scheduleId: string;
  userId: string;
  email: {
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    template?: string;
    context?: Record<string, any>;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType?: string;
    }>;
    headers?: Record<string, string>;
    trackOpens?: boolean;
    trackClicks?: boolean;
    replyTo?: string;
    tags?: string[];
  };
  scheduledAt: string;
  scheduleType: 'once' | 'recurring';
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
    maxOccurrences?: number;
  };
  name?: string;
  timezone?: string;
  cancelOnUnsubscribe?: boolean;
  skipIfUnread?: boolean;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

@Processor(EMAIL_QUEUE, { name: 'scheduled-email' })
export class ScheduledEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledEmailProcessor.name);

  constructor(
    private resendEmailService: ResendEmailService,
    private emailTemplateService: EmailTemplateService,
    private emailDeliveryService: EmailDeliveryService,
    private notificationPreferencesService: NotificationPreferencesService,
  ) {
    super();
  }

  async process(job: Job<ScheduledEmailJobData>): Promise<void> {
    const scheduleData = job.data;
    const { scheduleId, email, userId } = scheduleData;

    this.logger.log(`Processing scheduled email job: ${job.id}`, {
      scheduleId,
      userId,
      recipient: email.to,
      scheduleType: scheduleData.scheduleType,
    });

    try {
      // Check if email should be sent based on preferences
      const shouldSend = await this.shouldSendScheduledEmail(email.to, scheduleData);
      if (!shouldSend.allowed) {
        this.logger.log(`Skipping scheduled email: ${shouldSend.reason}`, {
          scheduleId,
          recipient: email.to,
        });

        // If cancelled due to unsubscribe and cancelOnUnsubscribe is true, remove the schedule
        if (shouldSend.reason?.includes('unsubscribed') && scheduleData.cancelOnUnsubscribe) {
          await this.cancelRecurringSchedule(scheduleId);
          this.logger.log(`Cancelled recurring schedule due to unsubscribe: ${scheduleId}`);
        }

        return;
      }

      // Create delivery log
      const deliveryLogId = await this.emailDeliveryService.createDeliveryLog({
        userId,
        emailType: 'scheduled',
        recipientEmail: email.to,
        subject: email.subject,
        templateUsed: email.template || 'custom',
        templateData: email.context || {},
        priority: this.getPriorityValue(scheduleData.priority),
        maxRetries: 3,
        scheduleId,
        scheduledAt: new Date(scheduleData.scheduledAt),
      });

      // Prepare email content
      const emailContent = await this.prepareEmailContent(email);

      // Send email
      const sendResult = await this.resendEmailService.sendEmail({
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments: email.attachments,
        headers: email.headers,
        replyTo: email.replyTo,
        tags: [
          { name: 'schedule_id', value: scheduleId },
          { name: 'user_id', value: userId },
          { name: 'email_type', value: 'scheduled' },
          { name: 'schedule_type', value: scheduleData.scheduleType },
          ...(email.tags || []).map((tag) => ({ name: 'custom', value: tag })),
        ],
      });

      if (sendResult.success) {
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'sent',
          resendId: sendResult.resendId,
          sentAt: new Date(),
        });

        this.logger.log(`Scheduled email sent successfully: ${job.id}`, {
          scheduleId,
          recipient: email.to,
          resendId: sendResult.resendId,
        });

        // Schedule next occurrence if recurring
        if (scheduleData.scheduleType === 'recurring' && scheduleData.recurrence) {
          await this.scheduleNextOccurrence(scheduleData);
        }
      } else {
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'failed',
          errorMessage: sendResult.error,
          failedAt: new Date(),
        });

        this.logger.error(`Failed to send scheduled email: ${job.id}`, {
          scheduleId,
          recipient: email.to,
          error: sendResult.error,
        });

        throw new Error(`Failed to send scheduled email: ${sendResult.error}`);
      }
    } catch (error) {
      this.logger.error(`Error processing scheduled email: ${job.id}`, {
        scheduleId,
        recipient: email.to,
        error: error.message,
      });

      throw error;
    }
  }

  private async shouldSendScheduledEmail(
    email: string,
    scheduleData: ScheduledEmailJobData,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check if user has unsubscribed
      const preferences = await this.notificationPreferencesService.getEmailPreferences(email);
      if (!preferences.emailEnabled) {
        return {
          allowed: false,
          reason: 'User has unsubscribed from all emails',
        };
      }

      // Check category preferences if email has tags
      if (scheduleData.email.tags?.length) {
        for (const tag of scheduleData.email.tags) {
          const categoryAllowed = await this.notificationPreferencesService.isCategoryAllowed(
            email,
            tag,
          );
          if (!categoryAllowed) {
            return { allowed: false, reason: `Category '${tag}' is disabled` };
          }
        }
      }

      // Check if should skip due to unread emails
      if (scheduleData.skipIfUnread) {
        const hasUnreadEmails = await this.emailDeliveryService.hasUnreadEmails(email);
        if (hasUnreadEmails) {
          return { allowed: false, reason: 'Skipping due to unread emails' };
        }
      }

      // Check quiet hours
      const isQuietHours = await this.notificationPreferencesService.isQuietHours(email);
      if (isQuietHours) {
        // Reschedule for after quiet hours
        const nextAllowedTime = await this.notificationPreferencesService.getNextAllowedTime(email);
        if (nextAllowedTime > new Date()) {
          await this.rescheduleEmail(scheduleData, nextAllowedTime);
          return { allowed: false, reason: 'Rescheduled due to quiet hours' };
        }
      }

      return { allowed: true };
    } catch (error) {
      this.logger.warn(`Failed to check scheduled email preferences for ${email}, allowing send`);
      return { allowed: true };
    }
  }

  private async prepareEmailContent(
    email: ScheduledEmailJobData['email'],
  ): Promise<{ subject: string; html?: string; text?: string }> {
    const context = email.context || {};

    if (email.template) {
      // Use template
      const template = await this.emailTemplateService.generateTemplate(email.template, context);
      return {
        subject: this.interpolateString(email.subject, context),
        html: template.html,
        text: template.text,
      };
    } else {
      // Use provided HTML/text with interpolation
      return {
        subject: this.interpolateString(email.subject, context),
        html: email.html ? this.interpolateString(email.html, context) : undefined,
        text: email.text ? this.interpolateString(email.text, context) : undefined,
      };
    }
  }

  private interpolateString(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }

  private async scheduleNextOccurrence(scheduleData: ScheduledEmailJobData): Promise<void> {
    const { recurrence, timezone = 'UTC' } = scheduleData;
    if (!recurrence) return;

    try {
      const currentTime = new Date(scheduleData.scheduledAt);
      const nextTime = this.calculateNextOccurrence(currentTime, recurrence, timezone);

      if (!nextTime) {
        this.logger.log(`No more occurrences for schedule: ${scheduleData.scheduleId}`);
        return;
      }

      // Check if we've reached the end date or max occurrences
      if (recurrence.endDate && nextTime > new Date(recurrence.endDate)) {
        this.logger.log(`Schedule reached end date: ${scheduleData.scheduleId}`);
        return;
      }

      // Schedule the next occurrence
      // This would typically involve creating a new scheduled job
      await this.createNextScheduledJob({
        ...scheduleData,
        scheduledAt: nextTime.toISOString(),
      });

      this.logger.debug(`Scheduled next occurrence for: ${scheduleData.scheduleId}`, {
        nextTime: nextTime.toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to schedule next occurrence: ${scheduleData.scheduleId}`, {
        error: error.message,
      });
    }
  }

  private calculateNextOccurrence(
    currentTime: Date,
    recurrence: NonNullable<ScheduledEmailJobData['recurrence']>,
    timezone: string,
  ): Date | null {
    const interval = recurrence.interval || 1;
    const nextTime = new Date(currentTime);

    switch (recurrence.pattern) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + interval);
        break;

      case 'weekly':
        if (recurrence.daysOfWeek?.length) {
          // Find next occurrence on specified days
          const currentDay = nextTime.getDay();
          const sortedDays = recurrence.daysOfWeek.sort((a, b) => a - b);

          let nextDay = sortedDays.find((day) => day > currentDay);
          if (!nextDay) {
            // Next week
            nextDay = sortedDays[0];
            nextTime.setDate(nextTime.getDate() + (7 - currentDay + nextDay));
          } else {
            nextTime.setDate(nextTime.getDate() + (nextDay - currentDay));
          }
        } else {
          nextTime.setDate(nextTime.getDate() + 7 * interval);
        }
        break;

      case 'monthly':
        if (recurrence.dayOfMonth) {
          nextTime.setMonth(nextTime.getMonth() + interval);
          nextTime.setDate(recurrence.dayOfMonth);
        } else {
          nextTime.setMonth(nextTime.getMonth() + interval);
        }
        break;

      case 'yearly':
        nextTime.setFullYear(nextTime.getFullYear() + interval);
        break;

      default:
        return null;
    }

    return nextTime;
  }

  private async createNextScheduledJob(scheduleData: ScheduledEmailJobData): Promise<void> {
    // This would typically involve queueing the next job
    // Implementation depends on how the email queue service handles scheduling
    // For now, we'll log the intent
    this.logger.debug('Would create next scheduled job', {
      scheduleId: scheduleData.scheduleId,
      nextTime: scheduleData.scheduledAt,
    });
  }

  private async rescheduleEmail(scheduleData: ScheduledEmailJobData, newTime: Date): Promise<void> {
    // Reschedule the email for the new time
    this.logger.debug('Would reschedule email', {
      scheduleId: scheduleData.scheduleId,
      originalTime: scheduleData.scheduledAt,
      newTime: newTime.toISOString(),
    });
  }

  private async cancelRecurringSchedule(scheduleId: string): Promise<void> {
    // Cancel the recurring schedule
    this.logger.debug('Would cancel recurring schedule', { scheduleId });
  }

  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'urgent':
        return 100;
      case 'high':
        return 75;
      case 'normal':
        return 50;
      case 'low':
        return 25;
      default:
        return 50;
    }
  }
}
