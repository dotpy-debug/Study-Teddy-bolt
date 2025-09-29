import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

export interface EmailJob {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface DocumentJob {
  documentId: string;
  userId: string;
  filePath: string;
  mimeType: string;
}

export interface AnalyticsJob {
  userId: string;
  eventType: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface NotificationJob {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  channels: ('email' | 'push' | 'inApp')[];
}

export interface StudyReminderJob {
  userId: string;
  taskId: string;
  reminderType: 'upcoming' | 'overdue' | 'daily';
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('document') private documentQueue: Queue,
    @InjectQueue('analytics') private analyticsQueue: Queue,
    @InjectQueue('notification') private notificationQueue: Queue,
    @InjectQueue('study-reminder') private studyReminderQueue: Queue,
  ) {}

  // Email Jobs
  async sendEmail(job: EmailJob, delay?: number) {
    try {
      await this.emailQueue.add('send-email', job, {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
      this.logger.debug(`Email job queued for ${job.to}`);
    } catch (error) {
      this.logger.error('Failed to queue email job:', error);
      throw error;
    }
  }

  async sendBulkEmails(jobs: EmailJob[]) {
    try {
      const bulkJobs = jobs.map((job) => ({
        name: 'send-email',
        data: job,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }));
      await this.emailQueue.addBulk(bulkJobs);
      this.logger.debug(`Bulk email jobs queued: ${jobs.length} emails`);
    } catch (error) {
      this.logger.error('Failed to queue bulk email jobs:', error);
      throw error;
    }
  }

  // Document Processing Jobs
  async processDocument(job: DocumentJob, priority?: number) {
    try {
      await this.documentQueue.add('process-document', job, {
        priority: priority || 0,
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
      });
      this.logger.debug(
        `Document processing job queued for document ${job.documentId}`,
      );
    } catch (error) {
      this.logger.error('Failed to queue document job:', error);
      throw error;
    }
  }

  async extractText(documentId: string, filePath: string) {
    try {
      await this.documentQueue.add(
        'extract-text',
        { documentId, filePath },
        {
          priority: 1,
        },
      );
      this.logger.debug(
        `Text extraction job queued for document ${documentId}`,
      );
    } catch (error) {
      this.logger.error('Failed to queue text extraction job:', error);
      throw error;
    }
  }

  async generateEmbeddings(documentId: string, chunks: string[]) {
    try {
      await this.documentQueue.add(
        'generate-embeddings',
        { documentId, chunks },
        {
          priority: 2,
        },
      );
      this.logger.debug(
        `Embedding generation job queued for document ${documentId}`,
      );
    } catch (error) {
      this.logger.error('Failed to queue embedding job:', error);
      throw error;
    }
  }

  // Analytics Jobs
  async trackEvent(job: AnalyticsJob) {
    try {
      await this.analyticsQueue.add('track-event', job, {
        attempts: 1,
        removeOnComplete: true,
      });
      this.logger.debug(`Analytics event queued: ${job.eventType}`);
    } catch (error) {
      this.logger.error('Failed to queue analytics job:', error);
      // Don't throw - analytics shouldn't break the app
    }
  }

  async generateReport(
    userId: string,
    reportType: string,
    dateRange: { start: Date; end: Date },
  ) {
    try {
      await this.analyticsQueue.add(
        'generate-report',
        { userId, reportType, dateRange },
        {
          priority: 0,
          attempts: 2,
        },
      );
      this.logger.debug(`Report generation queued for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to queue report job:', error);
      throw error;
    }
  }

  // Notification Jobs
  async sendNotification(job: NotificationJob) {
    try {
      await this.notificationQueue.add('send-notification', job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
      this.logger.debug(`Notification queued for user ${job.userId}`);
    } catch (error) {
      this.logger.error('Failed to queue notification job:', error);
      throw error;
    }
  }

  async scheduleDailyReminders() {
    try {
      await this.studyReminderQueue.add(
        'daily-reminders',
        {},
        {
          repeat: {
            pattern: '0 9 * * *', // Every day at 9 AM
          },
        },
      );
      this.logger.debug('Daily reminders scheduled');
    } catch (error) {
      this.logger.error('Failed to schedule daily reminders:', error);
    }
  }

  async sendStudyReminder(job: StudyReminderJob, delay?: number) {
    try {
      await this.studyReminderQueue.add('study-reminder', job, {
        delay,
        attempts: 2,
      });
      this.logger.debug(`Study reminder queued for user ${job.userId}`);
    } catch (error) {
      this.logger.error('Failed to queue study reminder:', error);
      throw error;
    }
  }

  // Queue Management
  async getQueueStats(queueName: string) {
    let queue: Queue;
    switch (queueName) {
      case 'email':
        queue = this.emailQueue;
        break;
      case 'document':
        queue = this.documentQueue;
        break;
      case 'analytics':
        queue = this.analyticsQueue;
        break;
      case 'notification':
        queue = this.notificationQueue;
        break;
      case 'study-reminder':
        queue = this.studyReminderQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  async getAllQueuesStats() {
    const queues = [
      'email',
      'document',
      'analytics',
      'notification',
      'study-reminder',
    ];
    return Promise.all(queues.map((q) => this.getQueueStats(q)));
  }

  async pauseQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  async resumeQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  async cleanQueue(queueName: string, grace = 0, limit = 0) {
    const queue = this.getQueue(queueName);
    const jobs = await queue.clean(grace, limit);
    this.logger.log(`Cleaned ${jobs.length} jobs from queue ${queueName}`);
    return jobs.length;
  }

  async drainQueue(queueName: string, delayed = false) {
    const queue = this.getQueue(queueName);
    await queue.drain(delayed);
    this.logger.log(`Queue ${queueName} drained`);
  }

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'email':
        return this.emailQueue;
      case 'document':
        return this.documentQueue;
      case 'analytics':
        return this.analyticsQueue;
      case 'notification':
        return this.notificationQueue;
      case 'study-reminder':
        return this.studyReminderQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}
