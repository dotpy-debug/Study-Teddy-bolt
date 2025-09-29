import { Injectable, Logger } from '@nestjs/common';
import { EmailQueueService } from '../../email-queue/email-queue.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../email.service';

export interface EmailNotificationConfig {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  template?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  tags?: string[];
}

export interface NotificationPayload {
  userId: string;
  email: string;
  subject: string;
  title: string;
  message: string;
  type: string;
  data?: Record<string, any>;
  config?: Partial<EmailNotificationConfig>;
}

@Injectable()
export class EmailNotificationIntegrationService {
  private readonly logger = new Logger(
    EmailNotificationIntegrationService.name,
  );

  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Send both email and in-app notification
   */
  async sendCombinedNotification(payload: NotificationPayload): Promise<{
    emailSent: boolean;
    inAppSent: boolean;
    emailId?: string;
    notificationId?: string;
    errors?: string[];
  }> {
    const { userId, email, config = {} } = payload;
    const errors: string[] = [];
    let emailSent = false;
    let inAppSent = false;
    let emailId: string | undefined;
    let notificationId: string | undefined;

    this.logger.log(`Sending combined notification to user ${userId}`, {
      email,
      type: payload.type,
      emailEnabled: config.emailEnabled,
      inAppEnabled: config.inAppEnabled,
    });

    // Send email notification if enabled
    if (config.emailEnabled !== false) {
      try {
        const emailResult = await this.sendEmailNotification(payload);
        emailSent = emailResult.success;
        emailId = emailResult.emailId;

        if (!emailSent && emailResult.error) {
          errors.push(`Email: ${emailResult.error}`);
        }
      } catch (error) {
        errors.push(`Email: ${error.message}`);
        this.logger.error(
          `Failed to send email notification to ${email}`,
          error,
        );
      }
    }

    // Send in-app notification if enabled
    if (config.inAppEnabled !== false) {
      try {
        const notificationResult = await this.sendInAppNotification(payload);
        inAppSent = notificationResult.success;
        notificationId = notificationResult.notificationId;

        if (!inAppSent && notificationResult.error) {
          errors.push(`In-app: ${notificationResult.error}`);
        }
      } catch (error) {
        errors.push(`In-app: ${error.message}`);
        this.logger.error(
          `Failed to send in-app notification to user ${userId}`,
          error,
        );
      }
    }

    // Log integration result
    this.logger.log(`Combined notification result for user ${userId}`, {
      emailSent,
      inAppSent,
      emailId,
      notificationId,
      errorCount: errors.length,
    });

    return {
      emailSent,
      inAppSent,
      emailId,
      notificationId,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Send email notification only
   */
  async sendEmailNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    emailId?: string;
    error?: string;
  }> {
    try {
      const {
        userId,
        email,
        subject,
        message,
        config = {},
        data = {},
      } = payload;

      // Prepare email data
      const emailData = {
        to: email,
        subject,
        html: await this.formatEmailContent(payload),
        text: this.stripHtml(message),
        template: config.template,
        context: {
          ...data,
          userId,
          title: payload.title,
          message,
          appName: 'Study Teddy',
          currentYear: new Date().getFullYear(),
        },
        priority: config.priority || 'normal',
        trackOpens: config.trackOpens,
        trackClicks: config.trackClicks,
        tags: [
          `type:${payload.type}`,
          `category:${config.category || 'general'}`,
          `user:${userId}`,
          ...(config.tags || []),
        ],
        userId,
        metadata: {
          notificationType: payload.type,
          category: config.category,
          sentVia: 'integration',
          timestamp: new Date().toISOString(),
        },
      };

      // Queue the email
      const result = await this.emailQueueService.queueEmail(emailData);

      return {
        success: true,
        emailId: result.id,
      };
    } catch (error) {
      this.logger.error(`Failed to send email notification`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send in-app notification only
   */
  async sendInAppNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    notificationId?: string;
    error?: string;
  }> {
    try {
      const { userId, title, message, type, data = {} } = payload;

      // Create in-app notification
      const notification = await this.notificationsService.createNotification({
        userId,
        title,
        message,
        type,
        data: {
          ...data,
          source: 'email-integration',
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        notificationId: notification.id,
      };
    } catch (error) {
      this.logger.error(`Failed to send in-app notification`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send study reminder (integrates with existing email service)
   */
  async sendStudyReminder(
    userId: string,
    email: string,
    taskTitle: string,
    taskDescription: string | null,
    dueDate: Date,
    config?: Partial<EmailNotificationConfig>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      userId,
      email,
      subject: `Study Reminder: ${taskTitle}`,
      title: 'Study Reminder',
      message: `Don't forget about your task: ${taskTitle}${taskDescription ? ` - ${taskDescription}` : ''}`,
      type: 'study_reminder',
      data: {
        taskTitle,
        taskDescription,
        dueDate: dueDate.toISOString(),
        dashboardLink: '/dashboard',
      },
      config: {
        category: 'study_reminders',
        template: 'study-reminder',
        trackOpens: true,
        ...config,
      },
    };

    await this.sendCombinedNotification(payload);
  }

  /**
   * Send achievement notification
   */
  async sendAchievementNotification(
    userId: string,
    email: string,
    achievement: {
      title: string;
      description: string;
      badge?: string;
      points?: number;
    },
    config?: Partial<EmailNotificationConfig>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      userId,
      email,
      subject: `🎉 Achievement Unlocked: ${achievement.title}`,
      title: 'Achievement Unlocked!',
      message: `Congratulations! You've earned: ${achievement.title}`,
      type: 'achievement',
      data: {
        achievementTitle: achievement.title,
        achievementDescription: achievement.description,
        badge: achievement.badge,
        points: achievement.points || 0,
        dashboardLink: '/dashboard',
      },
      config: {
        category: 'achievements',
        template: 'achievement',
        trackOpens: true,
        priority: 'high',
        ...config,
      },
    };

    await this.sendCombinedNotification(payload);
  }

  /**
   * Send weekly progress report
   */
  async sendWeeklyProgressReport(
    userId: string,
    email: string,
    summary: {
      tasksCompleted: number;
      studyHours: number;
      streakDays: number;
      achievements?: string[];
    },
    config?: Partial<EmailNotificationConfig>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      userId,
      email,
      subject: 'Your Weekly Study Progress',
      title: 'Weekly Progress Report',
      message: `This week you completed ${summary.tasksCompleted} tasks and studied for ${summary.studyHours} hours!`,
      type: 'weekly_report',
      data: {
        ...summary,
        dashboardLink: '/dashboard',
        analyticsLink: '/analytics',
      },
      config: {
        category: 'weekly_reports',
        template: 'weekly-summary',
        trackOpens: true,
        ...config,
      },
    };

    await this.sendCombinedNotification(payload);
  }

  /**
   * Send security notification
   */
  async sendSecurityNotification(
    userId: string,
    email: string,
    securityEvent: {
      type:
        | 'login'
        | 'password_change'
        | 'email_change'
        | 'suspicious_activity';
      description: string;
      location?: string;
      timestamp: Date;
    },
    config?: Partial<EmailNotificationConfig>,
  ): Promise<void> {
    const payload: NotificationPayload = {
      userId,
      email,
      subject: `Security Alert: ${securityEvent.description}`,
      title: 'Security Alert',
      message: securityEvent.description,
      type: 'security',
      data: {
        securityEventType: securityEvent.type,
        description: securityEvent.description,
        location: securityEvent.location,
        timestamp: securityEvent.timestamp.toISOString(),
        accountLink: '/account/security',
      },
      config: {
        category: 'security',
        template: 'security-alert',
        priority: 'urgent',
        trackOpens: true,
        ...config,
      },
    };

    await this.sendCombinedNotification(payload);
  }

  /**
   * Format email content with proper HTML structure
   */
  private async formatEmailContent(
    payload: NotificationPayload,
  ): Promise<string> {
    if (payload.config?.template) {
      // Template will handle formatting
      return '';
    }

    // Simple HTML format for non-template emails
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${payload.title}</h2>
        <p style="color: #666; line-height: 1.6;">${payload.message}</p>

        ${
          payload.data?.dashboardLink
            ? `
          <div style="margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${payload.data.dashboardLink}"
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Dashboard
            </a>
          </div>
        `
            : ''
        }

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">
          This email was sent from Study Teddy. If you no longer wish to receive these emails,
          you can <a href="#">update your preferences</a>.
        </p>
      </div>
    `;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<{
    emailEnabled: boolean;
    inAppEnabled: boolean;
    categories: Record<string, boolean>;
  }> {
    try {
      // This would integrate with the user preferences service
      // For now, return default preferences
      return {
        emailEnabled: true,
        inAppEnabled: true,
        categories: {
          study_reminders: true,
          achievements: true,
          weekly_reports: true,
          security: true,
          system_updates: true,
          marketing: false,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get notification preferences for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: {
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
      categories?: Record<string, boolean>;
    },
  ): Promise<void> {
    try {
      // This would integrate with the user preferences service
      this.logger.log(
        `Updated notification preferences for user ${userId}`,
        preferences,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update notification preferences for user ${userId}`,
        error,
      );
      throw error;
    }
  }
}
