import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, and, desc, gte, lte, count, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../db/db.module';
import { DatabaseService } from '../../../db/database.service';
import {
  emailDeliveryLog,
  NewEmailDeliveryLog,
  EmailDeliveryLog,
} from '../../../db/schema';
import { EmailJobData } from '../types/email-job.types';

export interface CreateDeliveryLogOptions {
  userId: string;
  emailType:
    | 'welcome'
    | 'verification'
    | 'password_reset'
    | 'task_reminder'
    | 'weekly_digest'
    | 'focus_session_alert'
    | 'achievement';
  recipientEmail: string;
  subject: string;
  templateUsed: string;
  templateData: Record<string, any>;
  taskId?: string;
  notificationId?: string;
  priority?: number;
  maxRetries?: number;
}

export interface UpdateDeliveryStatusOptions {
  status: 'sent' | 'delivered' | 'failed' | 'bounced' | 'complained';
  resendId?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
}

export interface EmailDeliveryStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  complained: number;
  pending: number;
  successRate: number;
  deliveryRate: number;
}

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(@Inject(DRIZZLE_DB) private db: DatabaseService) {}

  async createDeliveryLog(options: CreateDeliveryLogOptions): Promise<string> {
    try {
      const newLog: NewEmailDeliveryLog = {
        userId: options.userId,
        emailType: options.emailType,
        recipientEmail: options.recipientEmail,
        subject: options.subject,
        templateUsed: options.templateUsed,
        templateData: options.templateData,
        taskId: options.taskId,
        notificationId: options.notificationId,
        priority: options.priority || 50,
        maxRetries: options.maxRetries || 3,
        status: 'pending',
        retryCount: 0,
      };

      const [result] = await this.db
        .insert(emailDeliveryLog)
        .values(newLog)
        .returning({ id: emailDeliveryLog.id });

      this.logger.debug(`Created email delivery log: ${result.id}`, {
        userId: options.userId,
        emailType: options.emailType,
        recipient: options.recipientEmail,
      });

      return result.id;
    } catch (error) {
      this.logger.error('Failed to create email delivery log', {
        error: error.message,
        options,
      });
      throw error;
    }
  }

  async updateDeliveryStatus(
    logId: string,
    updateOptions: UpdateDeliveryStatusOptions,
  ): Promise<void> {
    try {
      const updateData: Partial<EmailDeliveryLog> = {
        status: updateOptions.status,
        updatedAt: new Date(),
      };

      if (updateOptions.resendId) {
        updateData.resendId = updateOptions.resendId;
      }

      if (updateOptions.errorMessage) {
        updateData.errorMessage = updateOptions.errorMessage;
      }

      if (updateOptions.sentAt) {
        updateData.sentAt = updateOptions.sentAt;
      }

      if (updateOptions.deliveredAt) {
        updateData.deliveredAt = updateOptions.deliveredAt;
      }

      if (updateOptions.failedAt) {
        updateData.failedAt = updateOptions.failedAt;
      }

      await this.db
        .update(emailDeliveryLog)
        .set(updateData)
        .where(eq(emailDeliveryLog.id, logId));

      this.logger.debug(`Updated email delivery status: ${logId}`, {
        status: updateOptions.status,
        resendId: updateOptions.resendId,
      });
    } catch (error) {
      this.logger.error('Failed to update email delivery status', {
        error: error.message,
        logId,
        updateOptions,
      });
      throw error;
    }
  }

  async markForRetry(logId: string, nextRetryAt: Date): Promise<void> {
    try {
      await this.db
        .update(emailDeliveryLog)
        .set({
          retryCount: sql`${emailDeliveryLog.retryCount} + 1`,
          nextRetryAt,
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(emailDeliveryLog.id, logId));

      this.logger.debug(`Marked email for retry: ${logId}`, {
        nextRetryAt,
      });
    } catch (error) {
      this.logger.error('Failed to mark email for retry', {
        error: error.message,
        logId,
      });
      throw error;
    }
  }

  async getDeliveryLog(logId: string): Promise<EmailDeliveryLog | null> {
    try {
      const [result] = await this.db
        .select()
        .from(emailDeliveryLog)
        .where(eq(emailDeliveryLog.id, logId))
        .limit(1);

      return result || null;
    } catch (error) {
      this.logger.error('Failed to get email delivery log', {
        error: error.message,
        logId,
      });
      return null;
    }
  }

  async getFailedEmails(limit = 50): Promise<EmailDeliveryLog[]> {
    try {
      return await this.db
        .select()
        .from(emailDeliveryLog)
        .where(
          and(
            eq(emailDeliveryLog.status, 'failed'),
            sql`${emailDeliveryLog.retryCount} < ${emailDeliveryLog.maxRetries}`,
            lte(emailDeliveryLog.nextRetryAt, new Date()),
          ),
        )
        .orderBy(desc(emailDeliveryLog.priority), emailDeliveryLog.nextRetryAt)
        .limit(limit);
    } catch (error) {
      this.logger.error('Failed to get failed emails for retry', {
        error: error.message,
      });
      return [];
    }
  }

  async getUserEmailStats(
    userId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<EmailDeliveryStats> {
    try {
      const whereConditions = [eq(emailDeliveryLog.userId, userId)];

      if (fromDate) {
        whereConditions.push(gte(emailDeliveryLog.createdAt, fromDate));
      }

      if (toDate) {
        whereConditions.push(lte(emailDeliveryLog.createdAt, toDate));
      }

      const stats = await this.db
        .select({
          status: emailDeliveryLog.status,
          count: count(),
        })
        .from(emailDeliveryLog)
        .where(and(...whereConditions))
        .groupBy(emailDeliveryLog.status);

      const totals = {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        complained: 0,
        pending: 0,
      };

      stats.forEach((stat) => {
        totals.total += stat.count;
        totals[stat.status] += stat.count;
      });

      const successRate =
        totals.total > 0
          ? ((totals.sent + totals.delivered) / totals.total) * 100
          : 0;

      const deliveryRate =
        totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0;

      return {
        ...totals,
        successRate: Math.round(successRate * 100) / 100,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Failed to get user email stats', {
        error: error.message,
        userId,
      });
      return {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        bounced: 0,
        complained: 0,
        pending: 0,
        successRate: 0,
        deliveryRate: 0,
      };
    }
  }

  async getRecentDeliveries(
    userId: string,
    limit = 20,
  ): Promise<EmailDeliveryLog[]> {
    try {
      return await this.db
        .select()
        .from(emailDeliveryLog)
        .where(eq(emailDeliveryLog.userId, userId))
        .orderBy(desc(emailDeliveryLog.createdAt))
        .limit(limit);
    } catch (error) {
      this.logger.error('Failed to get recent email deliveries', {
        error: error.message,
        userId,
      });
      return [];
    }
  }

  async cleanupOldLogs(olderThanDays = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.db
        .delete(emailDeliveryLog)
        .where(lte(emailDeliveryLog.createdAt, cutoffDate));

      this.logger.log(`Cleaned up ${result.rowCount} old email delivery logs`, {
        olderThanDays,
        cutoffDate,
      });

      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup old email delivery logs', {
        error: error.message,
        olderThanDays,
      });
      return 0;
    }
  }

  async getDeliveryLogByResendId(
    resendId: string,
  ): Promise<EmailDeliveryLog | null> {
    try {
      const [result] = await this.db
        .select()
        .from(emailDeliveryLog)
        .where(eq(emailDeliveryLog.resendId, resendId))
        .limit(1);

      return result || null;
    } catch (error) {
      this.logger.error('Failed to get email delivery log by Resend ID', {
        error: error.message,
        resendId,
      });
      return null;
    }
  }

  async updateEngagementMetrics(
    logId: string,
    metrics: {
      openedAt?: Date;
      clickedAt?: Date;
      unsubscribedAt?: Date;
    },
  ): Promise<void> {
    try {
      await this.db
        .update(emailDeliveryLog)
        .set({
          ...metrics,
          updatedAt: new Date(),
        })
        .where(eq(emailDeliveryLog.id, logId));

      this.logger.debug(`Updated email engagement metrics: ${logId}`, metrics);
    } catch (error) {
      this.logger.error('Failed to update email engagement metrics', {
        error: error.message,
        logId,
        metrics,
      });
      throw error;
    }
  }
}
