import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_QUEUE } from '../email-queue.module';
import { EmailJobData } from '../types/email-job.types';
import { ResendEmailService } from '../services/resend-email.service';
import { EmailTemplateService } from '../services/email-template.service';
import { EmailDeliveryService } from '../services/email-delivery.service';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private resendEmailService: ResendEmailService,
    private emailTemplateService: EmailTemplateService,
    private emailDeliveryService: EmailDeliveryService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const emailData = job.data;

    this.logger.debug(`Processing email job: ${job.id}`, {
      emailType: emailData.type,
      userId: emailData.userId,
      recipient: emailData.recipientEmail,
    });

    let deliveryLogId: string;

    try {
      // Create delivery log entry
      deliveryLogId = await this.emailDeliveryService.createDeliveryLog({
        userId: emailData.userId,
        emailType: emailData.type,
        recipientEmail: emailData.recipientEmail,
        subject: 'Pending', // Will be updated after template generation
        templateUsed: emailData.type,
        templateData: emailData,
        priority: emailData.priority || 50,
        maxRetries: emailData.maxRetries || 3,
      });

      // Generate email template
      const templateData = await this.prepareTemplateData(emailData);
      const template = await this.emailTemplateService.generateTemplate(
        emailData.type,
        templateData,
      );

      // Update delivery log with actual subject
      await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
        status: 'pending',
      });

      // Update the subject in the delivery log
      const deliveryLog =
        await this.emailDeliveryService.getDeliveryLog(deliveryLogId);
      if (deliveryLog) {
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'pending',
        });
      }

      // Send email via Resend
      const sendResult = await this.resendEmailService.sendEmail({
        to: emailData.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'email_type', value: emailData.type },
          { name: 'user_id', value: emailData.userId },
        ],
      });

      if (sendResult.success) {
        // Update delivery log as sent
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'sent',
          resendId: sendResult.resendId,
          sentAt: new Date(),
        });

        this.logger.log(`Email sent successfully: ${job.id}`, {
          emailType: emailData.type,
          userId: emailData.userId,
          recipient: emailData.recipientEmail,
          resendId: sendResult.resendId,
        });
      } else {
        // Mark as failed and potentially retry
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'failed',
          errorMessage: sendResult.error,
          failedAt: new Date(),
        });

        this.logger.error(`Failed to send email: ${job.id}`, {
          emailType: emailData.type,
          userId: emailData.userId,
          recipient: emailData.recipientEmail,
          error: sendResult.error,
          errorCode: sendResult.errorCode,
        });

        // Throw error to trigger retry mechanism
        throw new Error(`Email send failed: ${sendResult.error}`);
      }
    } catch (error) {
      this.logger.error(`Email processing failed: ${job.id}`, {
        error: error.message,
        stack: error.stack,
        emailData,
      });

      // Update delivery log if it exists
      if (deliveryLogId) {
        await this.emailDeliveryService.updateDeliveryStatus(deliveryLogId, {
          status: 'failed',
          errorMessage: error.message,
          failedAt: new Date(),
        });
      }

      throw error;
    }
  }

  private async prepareTemplateData(emailData: EmailJobData): Promise<any> {
    const baseData = {
      userName: emailData.recipientName,
      appUrl: 'https://studyteddy.com', // This should come from config
      supportEmail: 'support@studyteddy.com',
      dashboardUrl: 'https://studyteddy.com/dashboard',
    };

    switch (emailData.type) {
      case 'welcome':
        return {
          ...baseData,
          verificationUrl: emailData.verificationUrl,
        };

      case 'verification':
        return {
          ...baseData,
          verificationUrl: emailData.verificationUrl,
          expiryHours: 24,
        };

      case 'password_reset':
        return {
          ...baseData,
          resetUrl: emailData.resetUrl,
          requestedAt: emailData.requestedAt.toLocaleString(),
          expiryHours: 2,
        };

      case 'task_reminder':
        return {
          ...baseData,
          taskTitle: emailData.taskTitle,
          taskDescription: emailData.taskDescription,
          dueDate: emailData.dueDate,
          dueDateFormatted: emailData.dueDate.toLocaleDateString(),
          priority: emailData.priority,
          priorityColor: this.getPriorityColor(emailData.priority),
          subjectName: emailData.subjectName,
          reminderType: emailData.reminderType,
          taskUrl: `${baseData.dashboardUrl}/tasks/${emailData.taskId}`,
        };

      case 'focus_session_alert':
        return {
          ...baseData,
          sessionType: emailData.sessionType,
          durationMinutes: emailData.durationMinutes,
          durationFormatted: this.formatDuration(emailData.durationMinutes),
          focusScore: emailData.focusScore,
          taskTitle: emailData.taskTitle,
          subjectName: emailData.subjectName,
          pomodoroCount: emailData.pomodoroCount,
          sessionSummary: this.generateSessionSummary(emailData),
          statsUrl: `${baseData.dashboardUrl}/analytics`,
        };

      case 'achievement':
        return {
          ...baseData,
          achievementTitle: emailData.achievementTitle,
          achievementDescription: emailData.achievementDescription,
          achievementIcon: emailData.achievementIcon || '🏆',
          achievementType: emailData.achievementType,
          relatedStats: this.formatAchievementStats(emailData.relatedData),
          celebrationMessage: this.generateCelebrationMessage(
            emailData.achievementType,
          ),
          achievementsUrl: `${baseData.dashboardUrl}/achievements`,
        };

      case 'weekly_digest':
        return this.prepareWeeklyDigestData(emailData, baseData);

      default:
        return baseData;
    }
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545',
    };
    return colors[priority] || colors.medium;
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  private generateSessionSummary(emailData: any): string {
    const duration = this.formatDuration(emailData.durationMinutes);

    switch (emailData.sessionType) {
      case 'completed':
        return `Great job! You completed a ${duration} focus session${emailData.focusScore ? ` with a focus score of ${emailData.focusScore}/100` : ''}.`;
      case 'interrupted':
        return `Your ${duration} focus session was interrupted, but every minute of focused work counts!`;
      case 'milestone':
        return `Congratulations! You've reached a focus milestone with your ${duration} session.`;
      default:
        return `Focus session update: ${duration} session.`;
    }
  }

  private formatAchievementStats(relatedData: any): string {
    if (!relatedData) return '';

    const stats = [];
    if (relatedData.streakCount) {
      stats.push(`${relatedData.streakCount} day streak`);
    }
    if (relatedData.totalMinutes) {
      stats.push(`${this.formatDuration(relatedData.totalMinutes)} total`);
    }
    if (relatedData.tasksCompleted) {
      stats.push(`${relatedData.tasksCompleted} tasks completed`);
    }

    return stats.join(' • ');
  }

  private generateCelebrationMessage(achievementType: string): string {
    const messages = {
      goal_completed:
        "🎉 Congratulations! You've successfully completed your goal.",
      streak_milestone:
        '🔥 Amazing! Your consistency is paying off with this streak milestone.',
      focus_milestone:
        '🎯 Fantastic! Your focus and dedication have earned you this milestone.',
      task_completion_streak:
        '✅ Outstanding! Your task completion streak shows real progress.',
    };

    return (
      messages[achievementType] || '🏆 Congratulations on your achievement!'
    );
  }

  private prepareWeeklyDigestData(emailData: any, baseData: any): any {
    // This would be called from the weekly digest processor
    // For now, return the base data with digest-specific fields
    return {
      ...baseData,
      ...emailData,
      tasksUrl: `${baseData.dashboardUrl}/tasks`,
      analyticsUrl: `${baseData.dashboardUrl}/analytics`,
      unsubscribeUrl: `${baseData.appUrl}/unsubscribe?userId=${emailData.userId}`,
    };
  }
}
