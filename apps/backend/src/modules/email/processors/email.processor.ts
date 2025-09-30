import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ResendService } from '../resend.service';
import { EmailJobData, EmailOptions } from '../types/email.types';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly resendService: ResendService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<any> {
    this.logger.log(`Processing email job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'send-email':
          return await this.processSingleEmail(job);
        case 'send-batch-emails':
          return await this.processBatchEmails(job);
        case 'send-scheduled-email':
          return await this.processScheduledEmail(job);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}`, error);
      throw error;
    }
  }

  private async processSingleEmail(job: Job<EmailJobData>) {
    const { emailOptions } = job.data;

    job.updateProgress(0);

    const result = await this.resendService.sendEmail(emailOptions);

    job.updateProgress(100);

    if (!result.success) {
      throw new Error(result.error || 'Email sending failed');
    }

    this.logger.log(`Single email sent successfully. Job ${job.id}, Email ID: ${result.emailId}`);
    return result;
  }

  private async processBatchEmails(job: Job<EmailJobData>) {
    const emails = job.data.emailOptions as EmailOptions[];
    const batchSize = job.data.metadata?.batchSize || emails.length;

    job.updateProgress(0);

    const results = await this.resendService.sendBatchEmails(emails);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    job.updateProgress(100);

    this.logger.log(
      `Batch email completed. Job ${job.id}: ${successful} successful, ${failed} failed`,
    );

    if (failed > 0) {
      const firstError = results.find((r) => !r.success)?.error;
      throw new Error(`Batch email partially failed: ${firstError}`);
    }

    return {
      successful,
      failed,
      results,
    };
  }

  private async processScheduledEmail(job: Job<EmailJobData>) {
    const { emailOptions, metadata } = job.data;

    this.logger.log(
      `Processing scheduled email. Originally scheduled for: ${metadata?.scheduledFor}`,
    );

    job.updateProgress(0);

    const result = await this.resendService.sendEmail(emailOptions);

    job.updateProgress(100);

    if (!result.success) {
      throw new Error(result.error || 'Scheduled email sending failed');
    }

    this.logger.log(
      `Scheduled email sent successfully. Job ${job.id}, Email ID: ${result.emailId}`,
    );
    return result;
  }
}
