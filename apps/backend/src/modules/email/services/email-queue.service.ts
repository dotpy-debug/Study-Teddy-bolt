import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import {
  EmailOptions,
  EmailScheduleOptions,
  EmailQueueJob,
  QueueOptions,
  EmailJobData,
} from '../types/email.types';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Add an email to the queue for immediate processing
   */
  async queueEmail(emailOptions: EmailOptions, queueOptions?: QueueOptions): Promise<string> {
    try {
      const jobData: EmailJobData = {
        emailOptions,
        metadata: {
          queuedAt: new Date().toISOString(),
          priority: queueOptions?.priority || 0,
        },
        retryConfig: {
          maxRetries: queueOptions?.attempts || 3,
          retryDelay: 5000,
          exponentialBackoff: true,
        },
      };

      const job = await this.emailQueue.add('send-email', jobData, {
        priority: queueOptions?.priority || 0,
        delay: queueOptions?.delay || 0,
        attempts: queueOptions?.attempts || 3,
        backoff: queueOptions?.backoff || {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: queueOptions?.removeOnComplete || 10,
        removeOnFail: queueOptions?.removeOnFail || 5,
      });

      this.logger.log(`Email queued successfully. Job ID: ${job.id}`);
      return job.id as string;
    } catch (error) {
      this.logger.error('Failed to queue email', error);
      throw new Error(`Email queueing failed: ${error.message}`);
    }
  }

  /**
   * Schedule an email for future delivery
   */
  async scheduleEmail(emailOptions: EmailScheduleOptions): Promise<string> {
    try {
      const delay = emailOptions.scheduledFor.getTime() - Date.now();

      if (delay <= 0) {
        // If scheduled time is in the past, send immediately
        return this.queueEmail(emailOptions);
      }

      const jobData: EmailJobData = {
        emailOptions,
        metadata: {
          queuedAt: new Date().toISOString(),
          scheduledFor: emailOptions.scheduledFor.toISOString(),
          timezone: emailOptions.timezone,
        },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 5000,
          exponentialBackoff: true,
        },
      };

      const job = await this.emailQueue.add('send-scheduled-email', jobData, {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      });

      this.logger.log(
        `Email scheduled successfully for ${emailOptions.scheduledFor.toISOString()}. Job ID: ${job.id}`,
      );
      return job.id as string;
    } catch (error) {
      this.logger.error('Failed to schedule email', error);
      throw new Error(`Email scheduling failed: ${error.message}`);
    }
  }

  /**
   * Queue multiple emails as a batch
   */
  async queueBatchEmails(emails: EmailOptions[], queueOptions?: QueueOptions): Promise<string[]> {
    try {
      const batchSize = this.configService.get<number>('EMAIL_BATCH_SIZE', 10);
      const jobIds: string[] = [];

      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);

        const batchJobData: EmailJobData = {
          emailOptions: batch as any, // Batch emails
          metadata: {
            queuedAt: new Date().toISOString(),
            batchSize: batch.length,
            batchIndex: Math.floor(i / batchSize),
            totalBatches: Math.ceil(emails.length / batchSize),
          },
          retryConfig: {
            maxRetries: queueOptions?.attempts || 2,
            retryDelay: 10000,
            exponentialBackoff: true,
          },
        };

        const job = await this.emailQueue.add('send-batch-emails', batchJobData, {
          priority: (queueOptions?.priority || 0) - 1, // Lower priority for batch emails
          delay: i > 0 ? 5000 : 0, // Add delay between batches
          attempts: queueOptions?.attempts || 2,
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
          removeOnComplete: 5,
          removeOnFail: 3,
        });

        jobIds.push(job.id as string);
      }

      this.logger.log(`Batch of ${emails.length} emails queued in ${jobIds.length} batches`);
      return jobIds;
    } catch (error) {
      this.logger.error('Failed to queue batch emails', error);
      throw new Error(`Batch email queueing failed: ${error.message}`);
    }
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string): Promise<EmailQueueJob | null> {
    try {
      const job = await this.emailQueue.getJob(jobId);

      if (!job) {
        return null;
      }

      const state = await job.getState();

      return {
        id: job.id as string,
        type:
          job.name === 'send-batch-emails'
            ? 'batch'
            : job.name === 'send-scheduled-email'
              ? 'scheduled'
              : 'single',
        emailOptions: job.data.emailOptions,
        priority: job.opts.priority || 0,
        scheduledFor: job.data.metadata?.scheduledFor
          ? new Date(job.data.metadata.scheduledFor)
          : undefined,
        retryCount: job.attemptsMade,
        maxRetries: job.opts.attempts || 3,
        createdAt: new Date(job.timestamp),
        status: this.mapJobState(state),
        error: job.failedReason,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}`, error);
      return null;
    }
  }

  /**
   * Cancel a queued or scheduled email
   */
  async cancelEmail(jobId: string): Promise<boolean> {
    try {
      const job = await this.emailQueue.getJob(jobId);

      if (!job) {
        this.logger.warn(`Job ${jobId} not found`);
        return false;
      }

      const state = await job.getState();

      if (state === 'completed' || state === 'failed') {
        this.logger.warn(`Cannot cancel job ${jobId} - already ${state}`);
        return false;
      }

      await job.remove();
      this.logger.log(`Email job ${jobId} cancelled successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel email job ${jobId}`, error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.emailQueue.getActive(),
        this.emailQueue.getCompleted(),
        this.emailQueue.getFailed(),
        this.emailQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      this.logger.error('Failed to get queue statistics', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }

  /**
   * Retry failed email jobs
   */
  async retryFailedEmails(limit?: number): Promise<number> {
    try {
      const failedJobs = await this.emailQueue.getFailed(0, limit || 10);
      let retriedCount = 0;

      for (const job of failedJobs) {
        try {
          await job.retry();
          retriedCount++;
          this.logger.log(`Retried failed email job ${job.id}`);
        } catch (error) {
          this.logger.error(`Failed to retry job ${job.id}`, error);
        }
      }

      this.logger.log(`Retried ${retriedCount} failed email jobs`);
      return retriedCount;
    } catch (error) {
      this.logger.error('Failed to retry failed emails', error);
      return 0;
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  async cleanupOldJobs(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cutoffTime = Date.now() - olderThan;

      await Promise.all([
        this.emailQueue.clean(cutoffTime, 'completed'),
        this.emailQueue.clean(cutoffTime, 'failed'),
      ]);

      this.logger.log(`Cleaned up old email jobs older than ${olderThan}ms`);
    } catch (error) {
      this.logger.error('Failed to clean up old jobs', error);
    }
  }

  /**
   * Pause the email queue
   */
  async pauseQueue(): Promise<void> {
    try {
      await this.emailQueue.pause();
      this.logger.log('Email queue paused');
    } catch (error) {
      this.logger.error('Failed to pause email queue', error);
      throw error;
    }
  }

  /**
   * Resume the email queue
   */
  async resumeQueue(): Promise<void> {
    try {
      await this.emailQueue.resume();
      this.logger.log('Email queue resumed');
    } catch (error) {
      this.logger.error('Failed to resume email queue', error);
      throw error;
    }
  }

  /**
   * Get pending jobs count
   */
  async getPendingJobsCount(): Promise<number> {
    try {
      const [waiting, delayed] = await Promise.all([
        this.emailQueue.getWaiting(),
        this.emailQueue.getDelayed(),
      ]);

      return waiting.length + delayed.length;
    } catch (error) {
      this.logger.error('Failed to get pending jobs count', error);
      return 0;
    }
  }

  /**
   * Map Bull queue job state to our enum
   */
  private mapJobState(state: string): EmailQueueJob['status'] {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'pending';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Add job event listeners for monitoring
   */
  onModuleInit(): void {
    this.emailQueue.on('completed', (job: Job) => {
      this.logger.log(`Email job ${job.id} completed successfully`);
    });

    this.emailQueue.on('failed', (job: Job, err: Error) => {
      this.logger.error(`Email job ${job.id} failed`, err);
    });

    this.emailQueue.on('stalled', (job: Job) => {
      this.logger.warn(`Email job ${job.id} stalled`);
    });

    this.emailQueue.on('progress', (job: Job, progress: number) => {
      this.logger.debug(`Email job ${job.id} progress: ${progress}%`);
    });

    this.logger.log('Email queue event listeners initialized');
  }
}
