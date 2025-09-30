import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);
  private readonly resend: Resend;
  private readonly defaultFrom: string;
  private readonly isEnabled: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.defaultFrom = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'Study Teddy <noreply@studyteddy.com>',
    );
    this.isEnabled = !!apiKey;

    if (this.isEnabled) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('Resend API key not provided - email sending disabled');
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isEnabled) {
      this.logger.warn('Email sending disabled - no Resend API key configured');
      return {
        success: false,
        error: 'Email service not configured',
        errorCode: 'SERVICE_DISABLED',
      };
    }

    try {
      this.logger.debug(`Sending email to ${options.to}`, {
        subject: options.subject,
        from: options.from || this.defaultFrom,
      });

      const result = await this.resend.emails.send({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        tags: options.tags,
        headers: options.headers,
      });

      if (result.error) {
        this.logger.error('Failed to send email via Resend', {
          error: result.error,
          to: options.to,
          subject: options.subject,
        });

        return {
          success: false,
          error: result.error.message || 'Unknown Resend error',
          errorCode: result.error.name,
        };
      }

      this.logger.log(`Email sent successfully`, {
        resendId: result.data?.id,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        resendId: result.data?.id,
      };
    } catch (error) {
      this.logger.error('Failed to send email', {
        error: error.message,
        stack: error.stack,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: false,
        error: error.message || 'Unknown error',
        errorCode: 'SEND_FAILED',
      };
    }
  }

  async sendBulkEmails(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
    if (!this.isEnabled) {
      return emails.map(() => ({
        success: false,
        error: 'Email service not configured',
        errorCode: 'SERVICE_DISABLED',
      }));
    }

    this.logger.debug(`Sending ${emails.length} bulk emails`);

    const results = await Promise.allSettled(emails.map((email) => this.sendEmail(email)));

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error(`Bulk email ${index} failed`, {
          error: result.reason,
          email: emails[index],
        });
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          errorCode: 'BULK_SEND_FAILED',
        };
      }
    });
  }

  async verifyDomain(domain: string): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // Note: Resend doesn't have a public API for domain verification status
      // This is a placeholder for potential future implementation
      this.logger.debug(`Verifying domain: ${domain}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to verify domain', {
        domain,
        error: error.message,
      });
      return false;
    }
  }

  async getEmailDeliveryStatus(resendId: string): Promise<{
    status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';
    deliveredAt?: Date;
    bouncedAt?: Date;
    complainedAt?: Date;
    errorMessage?: string;
  } | null> {
    if (!this.isEnabled || !resendId) {
      return null;
    }

    try {
      // Note: This is a placeholder as Resend doesn't currently provide
      // a public API for checking delivery status
      // We would implement webhook handling for delivery events instead
      this.logger.debug(`Checking delivery status for email: ${resendId}`);
      return {
        status: 'sent', // Default status
      };
    } catch (error) {
      this.logger.error('Failed to get email delivery status', {
        resendId,
        error: error.message,
      });
      return null;
    }
  }

  isEmailServiceEnabled(): boolean {
    return this.isEnabled;
  }

  getDefaultFromEmail(): string {
    return this.defaultFrom;
  }
}
