import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  EmailTemplate,
  EmailOptions,
  EmailResponse,
  BatchEmailOptions,
  EmailScheduleOptions,
  EmailTrackingData,
  UnsubscribeOptions,
  DomainVerificationStatus,
  EmailTemplateContext,
  WelcomeEmailContext,
  VerificationEmailContext,
  PasswordResetContext,
  StudyReminderContext,
  TaskDeadlineContext,
  AchievementContext,
  WeeklySummaryContext,
  FocusSessionContext,
} from './types/email.types';
import { EmailTemplateService } from './services/email-template.service';
import { EmailQueueService } from './services/email-queue.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { RateLimitingService } from './services/rate-limiting.service';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;
  private readonly appName = 'Study Teddy';

  // Rate limiting trackers
  private readonly hourlyEmailCount = new Map<string, number>();
  private readonly dailyEmailCount = new Map<string, number>();
  private readonly lastResetTime = {
    hourly: Date.now(),
    daily: Date.now(),
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
    private readonly queueService: EmailQueueService,
    private readonly trackingService: EmailTrackingService,
    private readonly rateLimitingService: RateLimitingService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not found. Email service will not function.',
      );
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'Study Teddy <noreply@studyteddy.com>',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  /**
   * Send a single email with comprehensive options
   */
  async sendEmail(options: EmailOptions): Promise<EmailResponse> {
    try {
      // Check rate limits
      await this.rateLimitingService.checkRateLimit(options.to);

      // Generate email content
      let html: string;
      let text: string;

      if (options.template) {
        const templateResult = await this.templateService.renderTemplate(
          options.template,
          options.context || {},
        );
        html = templateResult.html;
        text = templateResult.text;
      } else {
        html = options.html || '';
        text = options.text || '';
      }

      // Add tracking pixels and unsubscribe links
      if (options.trackOpens !== false) {
        html = await this.trackingService.addTrackingPixel(html, options.to);
      }

      if (options.addUnsubscribe !== false) {
        html = this.addUnsubscribeLink(html, options.to);
        text = this.addUnsubscribeLink(text, options.to);
      }

      // Send email via Resend
      const result = await this.resend.emails.send({
        from: options.from || this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html,
        text,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        tags: options.tags,
        headers: {
          ...options.headers,
          'List-Unsubscribe': `<${this.frontendUrl}/unsubscribe?email=${encodeURIComponent(Array.isArray(options.to) ? options.to[0] : options.to)}>`,
        },
      });

      if (result.error) {
        throw new Error(`Resend API error: ${result.error.message}`);
      }

      // Track email
      await this.trackingService.trackEmailSent({
        emailId: result.data?.id || '',
        to: Array.isArray(options.to) ? options.to[0] : options.to,
        subject: options.subject,
        template: options.template,
        sentAt: new Date(),
      });

      // Update rate limiting counters
      await this.rateLimitingService.incrementCounter(
        Array.isArray(options.to) ? options.to[0] : options.to,
      );

      this.logger.log(
        `Email sent successfully to ${options.to}. ID: ${result.data?.id}`,
      );

      return {
        success: true,
        emailId: result.data?.id || '',
        message: 'Email sent successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to send email',
      };
    }
  }

  /**
   * Send batch emails with rate limiting and error handling
   */
  async sendBatchEmails(emails: BatchEmailOptions[]): Promise<EmailResponse[]> {
    const batchSize = this.configService.get<number>('EMAIL_BATCH_SIZE', 10);
    const results: EmailResponse[] = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchPromises = batch.map(async (emailOptions) => {
        try {
          return await this.sendEmail(emailOptions);
        } catch (error) {
          this.logger.error(
            `Failed to send batch email to ${emailOptions.to}`,
            error,
          );
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Failed to send email',
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Promise rejected',
            message: 'Failed to send email',
          });
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    this.logger.log(
      `Batch email completed: ${successful} successful, ${failed} failed`,
    );

    return results;
  }

  /**
   * Schedule email for future delivery
   */
  async scheduleEmail(options: EmailScheduleOptions): Promise<EmailResponse> {
    try {
      const jobId = await this.queueService.scheduleEmail({
        ...options,
        scheduledFor: options.scheduledFor,
      });

      this.logger.log(
        `Email scheduled for ${options.scheduledFor.toISOString()}. Job ID: ${jobId}`,
      );

      return {
        success: true,
        emailId: jobId,
        message: 'Email scheduled successfully',
      };
    } catch (error) {
      this.logger.error('Failed to schedule email', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to schedule email',
      };
    }
  }

  /**
   * Welcome email for new users
   */
  async sendWelcomeEmail(
    email: string,
    context: WelcomeEmailContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `Welcome to ${this.appName}! 🎉`,
      template: EmailTemplate.WELCOME,
      context: {
        ...context,
        loginLink: context.loginLink || `${this.frontendUrl}/auth/login`,
      },
      tags: [{ name: 'category', value: 'welcome' }],
    });
  }

  /**
   * Email verification
   */
  async sendVerificationEmail(
    email: string,
    context: VerificationEmailContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `Verify your email address`,
      template: EmailTemplate.EMAIL_VERIFICATION,
      context: {
        ...context,
        verificationLink:
          context.verificationLink ||
          `${this.frontendUrl}/auth/verify-email?token=${context.verificationToken}`,
        expiresIn: context.expiresIn || '24 hours',
      },
      tags: [{ name: 'category', value: 'verification' }],
    });
  }

  /**
   * Password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    context: PasswordResetContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `Reset your password`,
      template: EmailTemplate.PASSWORD_RESET,
      context: {
        ...context,
        resetLink:
          context.resetLink ||
          `${this.frontendUrl}/auth/reset-password?token=${context.resetToken}`,
        expiresIn: context.expiresIn || '1 hour',
      },
      tags: [{ name: 'category', value: 'password-reset' }],
    });
  }

  /**
   * Study reminder email
   */
  async sendStudyReminderEmail(
    email: string,
    context: StudyReminderContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `Study Reminder: ${context.taskTitle}`,
      template: EmailTemplate.STUDY_REMINDER,
      context: {
        ...context,
        dashboardLink: context.dashboardLink || `${this.frontendUrl}/dashboard`,
      },
      tags: [{ name: 'category', value: 'reminder' }],
    });
  }

  /**
   * Task deadline reminder
   */
  async sendTaskDeadlineEmail(
    email: string,
    context: TaskDeadlineContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `⏰ Task Deadline Approaching: ${context.taskTitle}`,
      template: EmailTemplate.TASK_DEADLINE,
      context: {
        ...context,
        taskLink:
          context.taskLink || `${this.frontendUrl}/tasks/${context.taskId}`,
      },
      tags: [{ name: 'category', value: 'deadline' }],
    });
  }

  /**
   * Achievement notification
   */
  async sendAchievementEmail(
    email: string,
    context: AchievementContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `🏆 Achievement Unlocked: ${context.achievementTitle}`,
      template: EmailTemplate.ACHIEVEMENT,
      context: {
        ...context,
        dashboardLink: context.dashboardLink || `${this.frontendUrl}/dashboard`,
      },
      tags: [{ name: 'category', value: 'achievement' }],
    });
  }

  /**
   * Weekly summary email
   */
  async sendWeeklySummaryEmail(
    email: string,
    context: WeeklySummaryContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `📊 Your Weekly Study Summary`,
      template: EmailTemplate.WEEKLY_SUMMARY,
      context: {
        ...context,
        dashboardLink: context.dashboardLink || `${this.frontendUrl}/dashboard`,
        weekStart:
          context.weekStart || this.getWeekStart().toLocaleDateString(),
        weekEnd: context.weekEnd || this.getWeekEnd().toLocaleDateString(),
      },
      tags: [{ name: 'category', value: 'summary' }],
    });
  }

  /**
   * Focus session summary
   */
  async sendFocusSessionSummaryEmail(
    email: string,
    context: FocusSessionContext,
  ): Promise<EmailResponse> {
    return this.sendEmail({
      to: email,
      subject: `🎯 Focus Session Complete`,
      template: EmailTemplate.FOCUS_SESSION_SUMMARY,
      context: {
        ...context,
        dashboardLink: context.dashboardLink || `${this.frontendUrl}/dashboard`,
      },
      tags: [{ name: 'category', value: 'focus-session' }],
    });
  }

  /**
   * Get email tracking data
   */
  async getEmailTracking(emailId: string): Promise<EmailTrackingData | null> {
    try {
      return await this.trackingService.getTrackingData(emailId);
    } catch (error) {
      this.logger.error(
        `Failed to get tracking data for email ${emailId}`,
        error,
      );
      return null;
    }
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(options: UnsubscribeOptions): Promise<boolean> {
    try {
      // Add to suppression list in Resend
      await this.resend.contacts.create({
        email: options.email,
        unsubscribed: true,
      });

      // Update local tracking
      await this.trackingService.markAsUnsubscribed(
        options.email,
        options.reason,
      );

      this.logger.log(
        `User ${options.email} unsubscribed. Reason: ${options.reason || 'Not specified'}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to process unsubscribe for ${options.email}`,
        error,
      );
      return false;
    }
  }

  /**
   * Check domain verification status
   */
  async getDomainVerificationStatus(
    domain: string,
  ): Promise<DomainVerificationStatus> {
    try {
      const result = await this.resend.domains.get(domain);

      return {
        domain,
        verified: result.status === 'verified',
        status: result.status,
        records: result.records,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get domain verification status for ${domain}`,
        error,
      );

      return {
        domain,
        verified: false,
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get email sending statistics
   */
  async getEmailStats(startDate?: Date, endDate?: Date) {
    try {
      // This would typically come from Resend analytics API
      // For now, we'll return local tracking data
      return await this.trackingService.getEmailStats(startDate, endDate);
    } catch (error) {
      this.logger.error('Failed to get email statistics', error);
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail: string): Promise<EmailResponse> {
    return this.sendEmail({
      to: testEmail,
      subject: `Test Email from ${this.appName}`,
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from ${this.appName}.</p>
        <p>If you received this email, your Resend configuration is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
      text: `Test Email from ${this.appName}\n\nThis is a test email. If you received this, your configuration is working correctly!\n\nSent at: ${new Date().toISOString()}`,
      tags: [{ name: 'category', value: 'test' }],
    });
  }

  /**
   * Private helper methods
   */
  private addUnsubscribeLink(content: string, email: string): string {
    const unsubscribeLink = `${this.frontendUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

    if (content.includes('</body>')) {
      // HTML content
      const unsubscribeHtml = `
        <div style="text-align: center; margin-top: 20px; padding: 10px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>Don't want to receive these emails? <a href="${unsubscribeLink}" style="color: #666;">Unsubscribe here</a></p>
        </div>
      `;
      return content.replace('</body>', `${unsubscribeHtml}</body>`);
    } else {
      // Text content
      return (
        content +
        `\n\n---\nDon't want to receive these emails? Unsubscribe here: ${unsubscribeLink}`
      );
    }
  }

  private getWeekStart(): Date {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  private getWeekEnd(): Date {
    const startOfWeek = this.getWeekStart();
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
  }

  /**
   * Cleanup methods for rate limiting
   */
  private resetCountersIfNeeded() {
    const now = Date.now();

    // Reset hourly counters
    if (now - this.lastResetTime.hourly > 3600000) {
      // 1 hour
      this.hourlyEmailCount.clear();
      this.lastResetTime.hourly = now;
    }

    // Reset daily counters
    if (now - this.lastResetTime.daily > 86400000) {
      // 24 hours
      this.dailyEmailCount.clear();
      this.lastResetTime.daily = now;
    }
  }
}
