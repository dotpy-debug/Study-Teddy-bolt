import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_QUEUE } from '../email-queue.module';
import { EmailDeliveryService } from '../services/email-delivery.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';

interface WebhookEventJobData {
  event: {
    type:
      | 'email.sent'
      | 'email.delivered'
      | 'email.opened'
      | 'email.clicked'
      | 'email.bounced'
      | 'email.complained'
      | 'email.unsubscribed'
      | 'email.failed'
      | 'batch.completed'
      | 'batch.failed';
    timestamp: string;
    emailId: string;
    recipient: string;
    subject?: string;
    messageId?: string;
    template?: string;
    tags?: string[];
    clickData?: {
      url: string;
      linkText?: string;
      userAgent?: string;
      ipAddress?: string;
      location?: Record<string, any>;
    };
    bounceData?: {
      bounceType: 'hard' | 'soft' | 'undetermined';
      bounceSubType?: string;
      reason: string;
      diagnosticCode?: number;
      canRetry?: boolean;
    };
    complaintData?: {
      complaintType: 'abuse' | 'fraud' | 'virus' | 'other';
      feedbackType?: string;
      details?: string;
    };
    openData?: {
      userAgent?: string;
      ipAddress?: string;
      location?: Record<string, any>;
      deviceType?: string;
    };
    metadata?: Record<string, any>;
  };
  webhookId?: string;
  deliveryAttempt?: number;
}

@Processor(EMAIL_QUEUE, { name: 'webhook-events' })
export class WebhookEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookEventsProcessor.name);

  constructor(
    private emailDeliveryService: EmailDeliveryService,
    private notificationPreferencesService: NotificationPreferencesService,
  ) {
    super();
  }

  async process(job: Job<WebhookEventJobData>): Promise<void> {
    const { event, webhookId, deliveryAttempt } = job.data;

    this.logger.debug(`Processing webhook event: ${job.id}`, {
      eventType: event.type,
      emailId: event.emailId,
      recipient: event.recipient,
      webhookId,
      deliveryAttempt,
    });

    try {
      switch (event.type) {
        case 'email.sent':
          await this.handleEmailSent(event);
          break;

        case 'email.delivered':
          await this.handleEmailDelivered(event);
          break;

        case 'email.opened':
          await this.handleEmailOpened(event);
          break;

        case 'email.clicked':
          await this.handleEmailClicked(event);
          break;

        case 'email.bounced':
          await this.handleEmailBounced(event);
          break;

        case 'email.complained':
          await this.handleEmailComplained(event);
          break;

        case 'email.unsubscribed':
          await this.handleEmailUnsubscribed(event);
          break;

        case 'email.failed':
          await this.handleEmailFailed(event);
          break;

        case 'batch.completed':
          await this.handleBatchCompleted(event);
          break;

        case 'batch.failed':
          await this.handleBatchFailed(event);
          break;

        default:
          this.logger.warn(`Unknown webhook event type: ${event.type}`);
      }

      this.logger.log(`Webhook event processed successfully: ${job.id}`, {
        eventType: event.type,
        emailId: event.emailId,
      });
    } catch (error) {
      this.logger.error(`Failed to process webhook event: ${job.id}`, {
        eventType: event.type,
        emailId: event.emailId,
        error: error.message,
      });
      throw error;
    }
  }

  private async handleEmailSent(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    await this.emailDeliveryService.updateEmailStatus(event.emailId, {
      status: 'sent',
      sentAt: new Date(event.timestamp),
      messageId: event.messageId,
    });

    // Track sending metrics
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'sent',
      timestamp: new Date(event.timestamp),
      metadata: event.metadata,
    });
  }

  private async handleEmailDelivered(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    await this.emailDeliveryService.updateEmailStatus(event.emailId, {
      status: 'delivered',
      deliveredAt: new Date(event.timestamp),
      messageId: event.messageId,
    });

    // Track delivery metrics
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'delivered',
      timestamp: new Date(event.timestamp),
      metadata: event.metadata,
    });
  }

  private async handleEmailOpened(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    const openCount = await this.emailDeliveryService.incrementOpenCount(
      event.emailId,
    );

    if (openCount === 1) {
      // First open
      await this.emailDeliveryService.updateEmailStatus(event.emailId, {
        status: 'opened',
        openedAt: new Date(event.timestamp),
      });
    }

    // Track open event with details
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'opened',
      timestamp: new Date(event.timestamp),
      metadata: {
        ...event.metadata,
        openCount,
        ...event.openData,
      },
    });

    // Update engagement metrics
    await this.updateEngagementMetrics(event.recipient, 'open');
  }

  private async handleEmailClicked(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    const clickCount = await this.emailDeliveryService.incrementClickCount(
      event.emailId,
    );

    if (clickCount === 1) {
      // First click
      await this.emailDeliveryService.updateEmailStatus(event.emailId, {
        status: 'clicked',
        clickedAt: new Date(event.timestamp),
      });
    }

    // Track click event with details
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'clicked',
      timestamp: new Date(event.timestamp),
      metadata: {
        ...event.metadata,
        clickCount,
        ...event.clickData,
      },
    });

    // Update engagement metrics
    await this.updateEngagementMetrics(event.recipient, 'click');
  }

  private async handleEmailBounced(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    await this.emailDeliveryService.updateEmailStatus(event.emailId, {
      status: 'bounced',
      bouncedAt: new Date(event.timestamp),
      errorMessage: event.bounceData?.reason,
    });

    // Track bounce event
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'bounced',
      timestamp: new Date(event.timestamp),
      metadata: {
        ...event.metadata,
        ...event.bounceData,
      },
    });

    // Handle hard bounces by updating email preferences
    if (event.bounceData?.bounceType === 'hard') {
      await this.handleHardBounce(event.recipient, event.bounceData);
    }

    // Update reputation metrics
    await this.updateReputationMetrics(
      event.recipient,
      'bounce',
      event.bounceData?.bounceType,
    );
  }

  private async handleEmailComplained(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    await this.emailDeliveryService.updateEmailStatus(event.emailId, {
      status: 'complained',
      complainedAt: new Date(event.timestamp),
      errorMessage: event.complaintData?.details,
    });

    // Track complaint event
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'complained',
      timestamp: new Date(event.timestamp),
      metadata: {
        ...event.metadata,
        ...event.complaintData,
      },
    });

    // Automatically unsubscribe user from marketing emails
    await this.handleSpamComplaint(event.recipient, event.complaintData);

    // Update reputation metrics
    await this.updateReputationMetrics(event.recipient, 'complaint');
  }

  private async handleEmailUnsubscribed(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    // Track unsubscribe event
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'unsubscribed',
      timestamp: new Date(event.timestamp),
      metadata: event.metadata,
    });

    // Update user preferences to reflect unsubscribe
    await this.notificationPreferencesService.handleUnsubscribe({
      token: event.emailId, // Use email ID as token for webhook-based unsubscribes
      email: event.recipient,
      type: 'all', // Default to unsubscribing from all
      reason: 'unsubscribed_via_link',
    });

    this.logger.log(`User unsubscribed via email link: ${event.recipient}`);
  }

  private async handleEmailFailed(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    await this.emailDeliveryService.updateEmailStatus(event.emailId, {
      status: 'failed',
      failedAt: new Date(event.timestamp),
      errorMessage: event.metadata?.error || 'Email delivery failed',
    });

    // Track failure event
    await this.emailDeliveryService.trackEvent(event.emailId, {
      type: 'failed',
      timestamp: new Date(event.timestamp),
      metadata: event.metadata,
    });

    // Check if email should be retried
    const shouldRetry = await this.shouldRetryFailedEmail(
      event.emailId,
      event.metadata,
    );
    if (shouldRetry) {
      await this.scheduleEmailRetry(event.emailId);
    }
  }

  private async handleBatchCompleted(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    // Update batch status
    await this.emailDeliveryService.updateBatchStatus(event.emailId, {
      status: 'completed',
      completedAt: new Date(event.timestamp),
      metadata: event.metadata,
    });

    this.logger.log(`Batch completed: ${event.emailId}`, event.metadata);
  }

  private async handleBatchFailed(
    event: WebhookEventJobData['event'],
  ): Promise<void> {
    // Update batch status
    await this.emailDeliveryService.updateBatchStatus(event.emailId, {
      status: 'failed',
      failedAt: new Date(event.timestamp),
      errorMessage: event.metadata?.error || 'Batch processing failed',
      metadata: event.metadata,
    });

    this.logger.error(`Batch failed: ${event.emailId}`, event.metadata);
  }

  private async handleHardBounce(
    recipient: string,
    bounceData: NonNullable<WebhookEventJobData['event']['bounceData']>,
  ): Promise<void> {
    try {
      // Mark email as invalid/bounced in preferences
      await this.notificationPreferencesService.markEmailInvalid(recipient, {
        reason: bounceData.reason,
        bounceType: bounceData.bounceType,
        timestamp: new Date(),
      });

      this.logger.log(
        `Marked email as invalid due to hard bounce: ${recipient}`,
      );
    } catch (error) {
      this.logger.error(`Failed to handle hard bounce for ${recipient}`, error);
    }
  }

  private async handleSpamComplaint(
    recipient: string,
    complaintData?: WebhookEventJobData['event']['complaintData'],
  ): Promise<void> {
    try {
      // Automatically unsubscribe from marketing emails
      await this.notificationPreferencesService.handleUnsubscribe({
        token: 'auto_complaint',
        email: recipient,
        type: 'category',
        categories: ['marketing', 'newsletters', 'promotions'],
        reason: 'complained',
        feedback: complaintData?.details,
        keepSecurity: true, // Keep security notifications
      });

      this.logger.log(
        `Auto-unsubscribed from marketing due to spam complaint: ${recipient}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle spam complaint for ${recipient}`,
        error,
      );
    }
  }

  private async updateEngagementMetrics(
    recipient: string,
    action: 'open' | 'click',
  ): Promise<void> {
    try {
      await this.emailDeliveryService.updateRecipientEngagement(
        recipient,
        action,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update engagement metrics for ${recipient}`,
        error,
      );
    }
  }

  private async updateReputationMetrics(
    recipient: string,
    event: 'bounce' | 'complaint',
    bounceType?: string,
  ): Promise<void> {
    try {
      await this.emailDeliveryService.updateSenderReputation(
        recipient,
        event,
        bounceType,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update reputation metrics for ${recipient}`,
        error,
      );
    }
  }

  private async shouldRetryFailedEmail(
    emailId: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const deliveryInfo =
        await this.emailDeliveryService.getDeliveryLog(emailId);
      if (!deliveryInfo) return false;

      // Check retry count and error type
      const retryCount = deliveryInfo.retryCount || 0;
      const maxRetries = deliveryInfo.maxRetries || 3;

      if (retryCount >= maxRetries) return false;

      // Check if error is retryable
      const errorType = metadata?.errorType || 'unknown';
      const retryableErrors = [
        'rate_limit',
        'temporary_failure',
        'timeout',
        'connection_error',
      ];

      return retryableErrors.includes(errorType);
    } catch (error) {
      this.logger.error(
        `Failed to check retry status for email ${emailId}`,
        error,
      );
      return false;
    }
  }

  private async scheduleEmailRetry(emailId: string): Promise<void> {
    try {
      // Schedule retry with exponential backoff
      await this.emailDeliveryService.scheduleEmailRetry(emailId);
      this.logger.log(`Scheduled retry for failed email: ${emailId}`);
    } catch (error) {
      this.logger.error(`Failed to schedule retry for email ${emailId}`, error);
    }
  }
}
