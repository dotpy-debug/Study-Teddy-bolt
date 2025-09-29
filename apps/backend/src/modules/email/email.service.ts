import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

interface SendEmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
}

interface PasswordResetContext {
  name: string;
  resetLink: string;
  expiresIn: string;
}

interface WelcomeEmailContext {
  name: string;
  email: string;
  loginLink: string;
}

interface StudyReminderContext {
  name: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  dashboardLink: string;
}

interface EmailVerificationContext {
  name: string;
  verificationLink: string;
  expiresIn: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly appName = 'Study Teddy';

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string,
  ): Promise<void> {
    const resetLink = `${this.frontendUrl}/auth/reset-password?token=${resetToken}`;
    const expiresIn = '1 hour';

    const context: PasswordResetContext = {
      name,
      resetLink,
      expiresIn,
    };

    try {
      await this.sendEmail({
        to: email,
        subject: `Password Reset Request - ${this.appName}`,
        template: 'password-reset',
        context,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send a welcome email to new users
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const loginLink = `${this.frontendUrl}/auth/login`;

    const context: WelcomeEmailContext = {
      name,
      email,
      loginLink,
    };

    try {
      await this.sendEmail({
        to: email,
        subject: `Welcome to ${this.appName}!`,
        template: 'welcome',
        context,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      // Don't throw error for welcome emails - they're not critical
    }
  }

  /**
   * Send study reminder email
   */
  async sendStudyReminderEmail(
    email: string,
    name: string,
    taskTitle: string,
    taskDescription: string | null,
    dueDate: Date,
  ): Promise<void> {
    const dashboardLink = `${this.frontendUrl}/dashboard`;
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const context: StudyReminderContext = {
      name,
      taskTitle,
      taskDescription: taskDescription || undefined,
      dueDate: formattedDueDate,
      dashboardLink,
    };

    try {
      await this.sendEmail({
        to: email,
        subject: `Study Reminder: ${taskTitle}`,
        template: 'study-reminder',
        context,
      });

      this.logger.log(
        `Study reminder email sent to ${email} for task: ${taskTitle}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send study reminder email to ${email}`,
        error,
      );
      // Don't throw error for reminder emails - they're not critical
    }
  }

  /**
   * Send email verification email
   */
  async sendEmailVerificationEmail(
    email: string,
    name: string,
    verificationToken: string,
  ): Promise<void> {
    const verificationLink = `${this.frontendUrl}/auth/verify-email?token=${verificationToken}`;
    const expiresIn = '24 hours';

    const context: EmailVerificationContext = {
      name,
      verificationLink,
      expiresIn,
    };

    try {
      await this.sendEmail({
        to: email,
        subject: `Verify Your Email - ${this.appName}`,
        template: 'email-verification',
        context,
      });

      this.logger.log(`Email verification sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email verification to ${email}`, error);
      throw new Error('Failed to send email verification');
    }
  }

  /**
   * Send password reset success confirmation
   */
  async sendPasswordResetSuccessEmail(
    email: string,
    name: string,
  ): Promise<void> {
    const loginLink = `${this.frontendUrl}/auth/login`;

    try {
      await this.sendEmail({
        to: email,
        subject: `Password Reset Successful - ${this.appName}`,
        template: 'password-reset-success',
        context: {
          name,
          loginLink,
        },
      });

      this.logger.log(`Password reset success email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset success email to ${email}`,
        error,
      );
      // Don't throw error for success confirmation emails
    }
  }

  /**
   * Send batch study reminders (for scheduled jobs)
   */
  async sendBatchStudyReminders(
    reminders: Array<{
      email: string;
      name: string;
      taskTitle: string;
      taskDescription: string | null;
      dueDate: Date;
    }>,
  ): Promise<void> {
    const results = await Promise.allSettled(
      reminders.map((reminder) =>
        this.sendStudyReminderEmail(
          reminder.email,
          reminder.name,
          reminder.taskTitle,
          reminder.taskDescription,
          reminder.dueDate,
        ),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Batch study reminders sent: ${successful} successful, ${failed} failed`,
    );
  }

  /**
   * Core email sending method
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, subject, template, context, html } = options;

    try {
      const mailOptions: any = {
        to,
        subject,
      };

      if (html) {
        mailOptions.html = html;
      } else if (template) {
        mailOptions.template = `./${template}`;
        mailOptions.context = {
          ...context,
          appName: this.appName,
          currentYear: new Date().getFullYear(),
          supportEmail: this.configService.get<string>(
            'SUPPORT_EMAIL',
            'support@studyteddy.com',
          ),
        };
      }

      await this.mailerService.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  /**
   * Send task reminder email (alias for study reminder)
   */
  async sendTaskReminderEmail(
    email: string,
    task: { title: string; description?: string; dueDate?: Date },
  ): Promise<void> {
    const dueDate = task.dueDate || new Date();
    await this.sendStudyReminderEmail(
      email,
      'Student', // Default name, could be improved with user lookup
      task.title,
      task.description || null,
      dueDate,
    );
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummaryEmail(
    email: string,
    summary: {
      tasksCompleted: number;
      studyHours: number;
      streakDays: number;
      achievements?: string[];
    },
  ): Promise<void> {
    const dashboardLink = `${this.frontendUrl}/dashboard`;

    try {
      await this.sendEmail({
        to: email,
        subject: `Weekly Study Summary - ${this.appName}`,
        template: 'weekly-summary',
        context: {
          name: 'Student',
          tasksCompleted: summary.tasksCompleted,
          studyHours: summary.studyHours,
          streakDays: summary.streakDays,
          achievements: summary.achievements || [],
          dashboardLink,
        },
      });

      this.logger.log(`Weekly summary email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send weekly summary email to ${email}`,
        error,
      );
    }
  }

  /**
   * Send achievement email
   */
  async sendAchievementEmail(
    email: string,
    achievement: {
      title: string;
      description: string;
      badge?: string;
      points?: number;
    },
  ): Promise<void> {
    const dashboardLink = `${this.frontendUrl}/dashboard`;

    try {
      await this.sendEmail({
        to: email,
        subject: `🎉 Achievement Unlocked: ${achievement.title}`,
        template: 'achievement',
        context: {
          name: 'Student',
          achievementTitle: achievement.title,
          achievementDescription: achievement.description,
          badge: achievement.badge,
          points: achievement.points || 0,
          dashboardLink,
        },
      });

      this.logger.log(
        `Achievement email sent to ${email} for: ${achievement.title}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send achievement email to ${email}`, error);
    }
  }

  /**
   * Test email functionality (for development)
   */
  async sendTestEmail(email: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Test Email from ${this.appName}`,
        text: 'This is a test email to verify email configuration.',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email from ${this.appName}.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
        `,
      });

      this.logger.log(`Test email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send test email to ${email}`, error);
      throw new Error('Failed to send test email');
    }
  }
}
