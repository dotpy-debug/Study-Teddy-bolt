import { Processor, OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Inject } from '@nestjs/common';
import { EmailJob } from '../queue.service';
import { EmailService } from '../../email/email.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EmailService)
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<any> {
    this.logger.debug(`Processing email job ${job.id}`);
    const { to, subject, template, data } = job.data;

    try {
      // Process different email templates
      switch (template) {
        case 'welcome':
          await this.emailService.sendWelcomeEmail(to, data.name);
          break;
        case 'password-reset':
          await this.emailService.sendPasswordResetEmail(
            to,
            data.name || 'User',
            data.resetToken,
          );
          break;
        case 'task-reminder':
          await this.emailService.sendTaskReminderEmail(
            to,
            data.task || {
              title: 'Task Reminder',
              description: '',
              dueDate: new Date(),
            },
          );
          break;
        case 'weekly-summary':
          await this.emailService.sendWeeklySummaryEmail(
            to,
            data.summary || { tasksCompleted: 0, studyHours: 0, streakDays: 0 },
          );
          break;
        case 'study-achievement':
          await this.emailService.sendAchievementEmail(
            to,
            data.achievement || {
              title: 'Achievement',
              description: 'You unlocked an achievement!',
            },
          );
          break;
        default:
          // Generic email sending
          await this.emailService.sendEmail({
            to,
            subject,
            html: this.renderTemplate(template, data || {}),
          });
      }

      this.logger.log(`Email sent successfully to ${to}`);
      return { success: true, recipient: to };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    // Simple template rendering - in production, use a proper template engine
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Study Teddy</h1>
            </div>
            <div class="content">
              {{content}}
            </div>
            <div class="footer">
              <p>&copy; 2024 Study Teddy. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Replace placeholders with actual data
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key]);
    });

    return html;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<EmailJob>) {
    this.logger.debug(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJob>, error: Error) {
    this.logger.error(`Email job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<EmailJob>) {
    this.logger.debug(`Email job ${job.id} started`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job<EmailJob>) {
    this.logger.warn(`Email job ${job.id} stalled`);
  }
}
