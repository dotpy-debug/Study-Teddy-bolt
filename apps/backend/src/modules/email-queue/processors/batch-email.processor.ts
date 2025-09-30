import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_QUEUE } from '../email-queue.module';
import { ResendEmailService } from '../services/resend-email.service';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';

interface BatchEmailJobData {
  batchId: string;
  userId: string;
  recipients: Array<{
    to: string;
    subject?: string;
    context?: Record<string, any>;
    tags?: string[];
  }>;
  defaultSubject: string;
  template?: string;
  html?: string;
  text?: string;
  defaultContext?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  trackOpens?: boolean;
  trackClicks?: boolean;
  batchDelay?: number;
  batchTags?: string[];
  optimizeSendTime?: boolean;
  metadata?: Record<string, any>;
}

@Processor(EMAIL_QUEUE, { name: 'batch-email' })
export class BatchEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchEmailProcessor.name);

  constructor(
    private resendEmailService: ResendEmailService,
    private emailTemplateService: EmailTemplateService,
    private emailDeliveryService: EmailDeliveryService,
    private notificationPreferencesService: NotificationPreferencesService,
  ) {
    super();
  }

  async process(job: Job<BatchEmailJobData>): Promise<void> {
    const batchData = job.data;
    const { batchId, recipients, userId, batchDelay = 0 } = batchData;

    this.logger.log(`Processing batch email job: ${job.id}`, {
      batchId,
      userId,
      recipientCount: recipients.length,
    });

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        // Add delay between emails if specified
        if (batchDelay > 0 && i > 0) {
          await new Promise((resolve) => setTimeout(resolve, batchDelay));
        }

        // Check user preferences and quiet hours
        const canSend = await this.shouldSendEmail(recipient.to, batchData);
        if (!canSend.allowed) {
          this.logger.debug(`Skipping email to ${recipient.to}: ${canSend.reason}`);
          results.skipped++;
          continue;
        }

        // Optimize send time if requested
        const sendTime = batchData.optimizeSendTime
          ? await this.calculateOptimalSendTime(recipient.to)
          : new Date();

        // Create delivery log
        const deliveryLogId = await this.emailDeliveryService.createDeliveryLog({
          userId,
          emailType: 'batch',
          recipientEmail: recipient.to,
          subject: recipient.subject || batchData.defaultSubject,
          templateUsed: batchData.template || 'custom',
          templateData: {
            ...batchData.defaultContext,
            ...recipient.context,
          },
          priority: this.getPriorityValue(batchData.priority),
          maxRetries: 3,
          batchId,
          scheduledAt: sendTime > new Date() ? sendTime : undefined,
        });

        // Prepare email content
        const emailContent = await this.prepareEmailContent(batchData, recipient);

        // Send email
        const sendResult = await this.resendEmailService.sendEmail({
          to: recipient.to,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          tags: [
            { name: 'batch_id', value: batchId },
            { name: 'user_id', value: userId },
            { name: 'email_type', value: 'batch' },
            ...(recipient.tags || []).map((tag) => ({
              name: 'custom',
              value: tag,
            })),
            ...(batchData.batchTags || []).map((tag) => ({
              name: 'batch_tag',
              value: tag,
            })),
          ],
          scheduledAt: sendTime > new Date() ? sendTime : undefined,
        });

        if (sendResult.success) {
          await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
            status: sendTime > new Date() ? 'scheduled' : 'sent',
            resendId: sendResult.resendId,
            sentAt: sendTime <= new Date() ? new Date() : undefined,
            scheduledAt: sendTime > new Date() ? sendTime : undefined,
          });

          results.sent++;
          this.logger.debug(`Batch email sent to ${recipient.to}`, {
            batchId,
            resendId: sendResult.resendId,
          });
        } else {
          await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
            status: 'failed',
            errorMessage: sendResult.error,
            failedAt: new Date(),
          });

          results.failed++;
          results.errors.push({
            email: recipient.to,
            error: sendResult.error || 'Unknown error',
          });

          this.logger.error(`Failed to send batch email to ${recipient.to}`, {
            batchId,
            error: sendResult.error,
          });
        }

        // Update job progress
        const progress = Math.round(((i + 1) / recipients.length) * 100);
        await job.updateProgress(progress);
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.to,
          error: error.message,
        });

        this.logger.error(`Error processing batch email for ${recipient.to}`, {
          batchId,
          error: error.message,
        });
      }
    }

    // Log batch completion
    await this.emailDeliveryService.logBatchCompletion(batchId, results);

    this.logger.log(`Batch email processing completed: ${job.id}`, {
      batchId,
      results,
    });

    // Store results in job return value
    job.returnvalue = results;
  }

  private async shouldSendEmail(
    email: string,
    batchData: BatchEmailJobData,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check if user has unsubscribed
      const preferences = await this.notificationPreferencesService.getEmailPreferences(email);
      if (!preferences.emailEnabled) {
        return { allowed: false, reason: 'User has disabled emails' };
      }

      // Check quiet hours
      const isQuietHours = await this.notificationPreferencesService.isQuietHours(email);
      if (isQuietHours && !batchData.optimizeSendTime) {
        return { allowed: false, reason: 'Currently in quiet hours' };
      }

      // Check category preferences if batch has specific categories
      if (batchData.batchTags?.length) {
        for (const tag of batchData.batchTags) {
          const categoryAllowed = await this.notificationPreferencesService.isCategoryAllowed(
            email,
            tag,
          );
          if (!categoryAllowed) {
            return { allowed: false, reason: `Category '${tag}' is disabled` };
          }
        }
      }

      return { allowed: true };
    } catch (error) {
      this.logger.warn(`Failed to check email preferences for ${email}, allowing send`);
      return { allowed: true };
    }
  }

  private async calculateOptimalSendTime(email: string): Promise<Date> {
    try {
      const preferences = await this.notificationPreferencesService.getEmailPreferences(email);
      const timezone = preferences.timezone || 'UTC';

      // Calculate optimal time based on timezone (e.g., 9 AM local time)
      const now = new Date();
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

      // If it's already past 9 AM today, schedule for 9 AM tomorrow
      const optimalHour = 9;
      const optimalTime = new Date(localTime);
      optimalTime.setHours(optimalHour, 0, 0, 0);

      if (optimalTime <= localTime) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }

      return optimalTime;
    } catch (error) {
      this.logger.warn(`Failed to calculate optimal send time for ${email}, using immediate send`);
      return new Date();
    }
  }

  private async prepareEmailContent(
    batchData: BatchEmailJobData,
    recipient: { to: string; subject?: string; context?: Record<string, any> },
  ): Promise<{ subject: string; html?: string; text?: string }> {
    const context = {
      ...batchData.defaultContext,
      ...recipient.context,
      recipientEmail: recipient.to,
    };

    const subject = recipient.subject || batchData.defaultSubject;

    if (batchData.template) {
      // Use template
      const template = await this.emailTemplateService.generateTemplate(
        batchData.template,
        context,
      );
      return {
        subject: this.interpolateString(subject, context),
        html: template.html,
        text: template.text,
      };
    } else {
      // Use provided HTML/text with interpolation
      return {
        subject: this.interpolateString(subject, context),
        html: batchData.html ? this.interpolateString(batchData.html, context) : undefined,
        text: batchData.text ? this.interpolateString(batchData.text, context) : undefined,
      };
    }
  }

  private interpolateString(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
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
