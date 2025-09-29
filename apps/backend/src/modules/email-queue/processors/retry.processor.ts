import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { RETRY_QUEUE } from '../email-queue.module';
import { RetryEmailJobData } from '../types/email-job.types';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { ResendEmailService } from '../services/resend-email.service';
import { EmailTemplateService } from '../services/email-template.service';

@Processor(RETRY_QUEUE)
export class RetryProcessor extends WorkerHost {
  private readonly logger = new Logger(RetryProcessor.name);

  constructor(
    private emailDeliveryService: EmailDeliveryService,
    private resendEmailService: ResendEmailService,
    private emailTemplateService: EmailTemplateService,
  ) {
    super();
  }

  async process(job: Job<RetryEmailJobData>): Promise<void> {
    const {
      originalJobId,
      emailDeliveryLogId,
      attemptNumber,
      originalJobData,
    } = job.data;

    this.logger.debug(`Processing email retry: ${job.id}`, {
      originalJobId,
      emailDeliveryLogId,
      attemptNumber,
      emailType: originalJobData.type,
    });

    try {
      // Get the delivery log to check current status
      const deliveryLog =
        await this.emailDeliveryService.getDeliveryLog(emailDeliveryLogId);

      if (!deliveryLog) {
        this.logger.warn(
          `Delivery log not found for retry: ${emailDeliveryLogId}`,
        );
        return;
      }

      // Check if this email has already been sent successfully
      if (deliveryLog.status === 'sent' || deliveryLog.status === 'delivered') {
        this.logger.debug(
          `Email already sent successfully, skipping retry: ${emailDeliveryLogId}`,
        );
        return;
      }

      // Check if we've exceeded max retries
      if (deliveryLog.retryCount >= deliveryLog.maxRetries) {
        this.logger.warn(
          `Max retries exceeded for email: ${emailDeliveryLogId}`,
          {
            retryCount: deliveryLog.retryCount,
            maxRetries: deliveryLog.maxRetries,
          },
        );

        await this.emailDeliveryService.updateDeliveryStatus(
          emailDeliveryLogId,
          {
            status: 'failed',
            errorMessage: `Max retries (${deliveryLog.maxRetries}) exceeded`,
            failedAt: new Date(),
          },
        );

        return;
      }

      // Regenerate email template (in case of template issues)
      const templateData = await this.prepareTemplateData(originalJobData);
      const template = await this.emailTemplateService.generateTemplate(
        originalJobData.type,
        templateData,
      );

      // Attempt to send the email again
      const sendResult = await this.resendEmailService.sendEmail({
        to: originalJobData.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: [
          { name: 'email_type', value: originalJobData.type },
          { name: 'user_id', value: originalJobData.userId },
          { name: 'retry_attempt', value: attemptNumber.toString() },
        ],
      });

      if (sendResult.success) {
        // Update delivery log as sent
        await this.emailDeliveryService.updateDeliveryStatus(
          emailDeliveryLogId,
          {
            status: 'sent',
            resendId: sendResult.resendId,
            sentAt: new Date(),
          },
        );

        this.logger.log(`Email retry successful: ${job.id}`, {
          originalJobId,
          emailDeliveryLogId,
          attemptNumber,
          emailType: originalJobData.type,
          resendId: sendResult.resendId,
        });
      } else {
        // Calculate next retry time with exponential backoff
        const nextRetryAt = this.calculateNextRetryTime(attemptNumber);

        // Mark for another retry if we haven't exceeded max attempts
        if (attemptNumber < deliveryLog.maxRetries) {
          await this.emailDeliveryService.markForRetry(
            emailDeliveryLogId,
            nextRetryAt,
          );

          this.logger.warn(
            `Email retry failed, scheduling next attempt: ${job.id}`,
            {
              originalJobId,
              emailDeliveryLogId,
              attemptNumber,
              nextAttempt: attemptNumber + 1,
              nextRetryAt,
              error: sendResult.error,
            },
          );
        } else {
          // Final failure
          await this.emailDeliveryService.updateDeliveryStatus(
            emailDeliveryLogId,
            {
              status: 'failed',
              errorMessage: `Final retry failed: ${sendResult.error}`,
              failedAt: new Date(),
            },
          );

          this.logger.error(`Email retry exhausted: ${job.id}`, {
            originalJobId,
            emailDeliveryLogId,
            attemptNumber,
            emailType: originalJobData.type,
            finalError: sendResult.error,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Email retry processing failed: ${job.id}`, {
        error: error.message,
        stack: error.stack,
        jobData: job.data,
      });

      // Update delivery log with retry failure
      if (emailDeliveryLogId) {
        await this.emailDeliveryService.updateDeliveryStatus(
          emailDeliveryLogId,
          {
            status: 'failed',
            errorMessage: `Retry processing failed: ${error.message}`,
            failedAt: new Date(),
          },
        );
      }

      throw error;
    }
  }

  private calculateNextRetryTime(attemptNumber: number): Date {
    // Exponential backoff: 2^attemptNumber * 2 minutes
    const delayMinutes = Math.pow(2, attemptNumber) * 2;
    const maxDelayMinutes = 60; // Cap at 1 hour

    const actualDelayMinutes = Math.min(delayMinutes, maxDelayMinutes);
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + actualDelayMinutes);

    return nextRetryAt;
  }

  private async prepareTemplateData(emailData: any): Promise<any> {
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
          requestedAt:
            emailData.requestedAt?.toLocaleString() ||
            new Date().toLocaleString(),
          expiryHours: 2,
        };

      case 'task_reminder':
        return {
          ...baseData,
          taskTitle: emailData.taskTitle,
          taskDescription: emailData.taskDescription,
          dueDate: emailData.dueDate,
          dueDateFormatted: emailData.dueDate?.toLocaleDateString() || '',
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
        return {
          ...baseData,
          ...emailData,
          tasksUrl: `${baseData.dashboardUrl}/tasks`,
          analyticsUrl: `${baseData.dashboardUrl}/analytics`,
          unsubscribeUrl: `${baseData.appUrl}/unsubscribe?userId=${emailData.userId}`,
        };

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
    if (!minutes || minutes < 60) {
      return `${minutes || 0} minutes`;
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
}
