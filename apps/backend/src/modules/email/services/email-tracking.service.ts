import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailTrackingData,
  EmailStatus,
  EmailStats,
  ResendWebhookEvent,
} from '../types/email.types';

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);
  private readonly trackingData = new Map<string, EmailTrackingData>();
  private readonly unsubscribedEmails = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Track an email that was sent
   */
  async trackEmailSent(data: {
    emailId: string;
    to: string;
    subject: string;
    template?: string;
    sentAt: Date;
  }): Promise<void> {
    try {
      const trackingData: EmailTrackingData = {
        emailId: data.emailId,
        to: data.to,
        subject: data.subject,
        template: data.template,
        sentAt: data.sentAt,
        openCount: 0,
        clickCount: 0,
        status: EmailStatus.SENT,
        metadata: {
          userAgent: null,
          ipAddress: null,
          location: null,
        },
      };

      this.trackingData.set(data.emailId, trackingData);
      this.logger.debug(`Email tracking initialized for ${data.emailId}`);
    } catch (error) {
      this.logger.error(`Failed to track email ${data.emailId}`, error);
    }
  }

  /**
   * Track email delivery
   */
  async trackEmailDelivered(emailId: string, deliveredAt?: Date): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        tracking.deliveredAt = deliveredAt || new Date();
        tracking.status = EmailStatus.DELIVERED;
        this.trackingData.set(emailId, tracking);
        this.logger.debug(`Email delivery tracked for ${emailId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to track delivery for ${emailId}`, error);
    }
  }

  /**
   * Track email open
   */
  async trackEmailOpened(
    emailId: string,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      location?: string;
    },
  ): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        if (!tracking.openedAt) {
          tracking.openedAt = new Date();
          tracking.status = EmailStatus.OPENED;
        }
        tracking.openCount++;

        if (metadata) {
          tracking.metadata = {
            ...tracking.metadata,
            ...metadata,
          };
        }

        this.trackingData.set(emailId, tracking);
        this.logger.debug(`Email open tracked for ${emailId} (count: ${tracking.openCount})`);
      }
    } catch (error) {
      this.logger.error(`Failed to track open for ${emailId}`, error);
    }
  }

  /**
   * Track email click
   */
  async trackEmailClicked(
    emailId: string,
    clickedUrl?: string,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      location?: string;
    },
  ): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        if (!tracking.clickedAt) {
          tracking.clickedAt = new Date();
          tracking.status = EmailStatus.CLICKED;
        }
        tracking.clickCount++;

        if (metadata) {
          tracking.metadata = {
            ...tracking.metadata,
            ...metadata,
            lastClickedUrl: clickedUrl,
          };
        }

        this.trackingData.set(emailId, tracking);
        this.logger.debug(`Email click tracked for ${emailId} (count: ${tracking.clickCount})`);
      }
    } catch (error) {
      this.logger.error(`Failed to track click for ${emailId}`, error);
    }
  }

  /**
   * Track email bounce
   */
  async trackEmailBounced(
    emailId: string,
    bounceReason?: string,
    bounceType?: 'soft' | 'hard',
  ): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        tracking.bouncedAt = new Date();
        tracking.status = EmailStatus.BOUNCED;
        tracking.metadata = {
          ...tracking.metadata,
          bounceReason,
          bounceType,
        };

        this.trackingData.set(emailId, tracking);
        this.logger.debug(`Email bounce tracked for ${emailId}: ${bounceReason}`);
      }
    } catch (error) {
      this.logger.error(`Failed to track bounce for ${emailId}`, error);
    }
  }

  /**
   * Track email complaint (spam report)
   */
  async trackEmailComplained(emailId: string, complaintReason?: string): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        tracking.complainedAt = new Date();
        tracking.status = EmailStatus.COMPLAINED;
        tracking.metadata = {
          ...tracking.metadata,
          complaintReason,
        };

        this.trackingData.set(emailId, tracking);
        this.logger.debug(`Email complaint tracked for ${emailId}: ${complaintReason}`);

        // Automatically mark email as unsubscribed
        await this.markAsUnsubscribed(tracking.to, 'complaint');
      }
    } catch (error) {
      this.logger.error(`Failed to track complaint for ${emailId}`, error);
    }
  }

  /**
   * Mark email as unsubscribed
   */
  async markAsUnsubscribed(email: string, reason?: string, emailId?: string): Promise<void> {
    try {
      this.unsubscribedEmails.add(email.toLowerCase());

      if (emailId) {
        const tracking = this.trackingData.get(emailId);
        if (tracking) {
          tracking.unsubscribedAt = new Date();
          tracking.status = EmailStatus.UNSUBSCRIBED;
          tracking.metadata = {
            ...tracking.metadata,
            unsubscribeReason: reason,
          };
          this.trackingData.set(emailId, tracking);
        }
      }

      this.logger.log(
        `Email ${email} marked as unsubscribed. Reason: ${reason || 'Not specified'}`,
      );
    } catch (error) {
      this.logger.error(`Failed to mark ${email} as unsubscribed`, error);
    }
  }

  /**
   * Check if email is unsubscribed
   */
  isUnsubscribed(email: string): boolean {
    return this.unsubscribedEmails.has(email.toLowerCase());
  }

  /**
   * Get tracking data for an email
   */
  async getTrackingData(emailId: string): Promise<EmailTrackingData | null> {
    return this.trackingData.get(emailId) || null;
  }

  /**
   * Add tracking pixel to HTML content
   */
  async addTrackingPixel(html: string, email: string): Promise<string> {
    try {
      const trackingId = this.generateTrackingId(email);
      const trackingPixelUrl = this.getTrackingPixelUrl(trackingId);

      const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

      // Insert before closing body tag, or at the end if no body tag
      if (html.includes('</body>')) {
        return html.replace('</body>', `${trackingPixel}</body>`);
      } else {
        return html + trackingPixel;
      }
    } catch (error) {
      this.logger.error('Failed to add tracking pixel', error);
      return html;
    }
  }

  /**
   * Add click tracking to links in HTML content
   */
  async addClickTracking(html: string, emailId: string): Promise<string> {
    try {
      const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

      // Replace all href attributes with tracking URLs
      return html.replace(/href="([^"]+)"/g, (match, url) => {
        // Skip mailto, tel, and anchor links
        if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
          return match;
        }

        const trackingUrl = `${baseUrl}/api/email/track/click?id=${emailId}&url=${encodeURIComponent(url)}`;
        return `href="${trackingUrl}"`;
      });
    } catch (error) {
      this.logger.error('Failed to add click tracking', error);
      return html;
    }
  }

  /**
   * Handle webhook events from Resend
   */
  async handleWebhookEvent(event: ResendWebhookEvent): Promise<void> {
    try {
      const emailId = event.data.email_id;

      switch (event.type) {
        case 'email.sent':
          await this.trackEmailSent({
            emailId,
            to: event.data.to[0],
            subject: event.data.subject,
            sentAt: new Date(event.created_at),
          });
          break;

        case 'email.delivered':
          await this.trackEmailDelivered(emailId, new Date(event.created_at));
          break;

        case 'email.opened':
          await this.trackEmailOpened(emailId);
          break;

        case 'email.clicked':
          await this.trackEmailClicked(emailId);
          break;

        case 'email.bounced':
          await this.trackEmailBounced(emailId);
          break;

        case 'email.complained':
          await this.trackEmailComplained(emailId);
          break;

        default:
          this.logger.warn(`Unknown webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle webhook event', error);
    }
  }

  /**
   * Get email statistics for a date range
   */
  async getEmailStats(startDate?: Date, endDate?: Date): Promise<EmailStats> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      const emailsInRange = Array.from(this.trackingData.values()).filter(
        (email) => email.sentAt >= start && email.sentAt <= end,
      );

      const totalSent = emailsInRange.length;
      const totalDelivered = emailsInRange.filter(
        (e) => e.status === EmailStatus.DELIVERED || e.deliveredAt,
      ).length;
      const totalOpened = emailsInRange.filter((e) => e.openCount > 0).length;
      const totalClicked = emailsInRange.filter((e) => e.clickCount > 0).length;
      const totalBounced = emailsInRange.filter((e) => e.status === EmailStatus.BOUNCED).length;
      const totalComplaints = emailsInRange.filter(
        (e) => e.status === EmailStatus.COMPLAINED,
      ).length;
      const totalUnsubscribed = emailsInRange.filter(
        (e) => e.status === EmailStatus.UNSUBSCRIBED,
      ).length;

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalComplaints,
        totalUnsubscribed,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        complaintRate: totalSent > 0 ? (totalComplaints / totalSent) * 100 : 0,
        unsubscribeRate: totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0,
        periodStart: start,
        periodEnd: end,
      };
    } catch (error) {
      this.logger.error('Failed to calculate email statistics', error);
      throw error;
    }
  }

  /**
   * Get unsubscribed emails list
   */
  getUnsubscribedEmails(): string[] {
    return Array.from(this.unsubscribedEmails);
  }

  /**
   * Remove email from unsubscribed list (re-subscribe)
   */
  async resubscribeEmail(email: string): Promise<boolean> {
    try {
      const wasUnsubscribed = this.unsubscribedEmails.has(email.toLowerCase());
      this.unsubscribedEmails.delete(email.toLowerCase());

      if (wasUnsubscribed) {
        this.logger.log(`Email ${email} re-subscribed`);
      }

      return wasUnsubscribed;
    } catch (error) {
      this.logger.error(`Failed to re-subscribe ${email}`, error);
      return false;
    }
  }

  /**
   * Clear old tracking data to prevent memory leaks
   */
  async cleanupOldTrackingData(olderThanDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [emailId, tracking] of this.trackingData.entries()) {
        if (tracking.sentAt < cutoffDate) {
          this.trackingData.delete(emailId);
          cleanedCount++;
        }
      }

      this.logger.log(`Cleaned up ${cleanedCount} old tracking records`);
    } catch (error) {
      this.logger.error('Failed to cleanup old tracking data', error);
    }
  }

  /**
   * Get tracking statistics
   */
  getTrackingStats(): {
    totalTrackedEmails: number;
    totalUnsubscribed: number;
    memoryUsage: string;
  } {
    return {
      totalTrackedEmails: this.trackingData.size,
      totalUnsubscribed: this.unsubscribedEmails.size,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    };
  }

  /**
   * Private helper methods
   */
  private generateTrackingId(email: string): string {
    return Buffer.from(`${email}:${Date.now()}`).toString('base64url');
  }

  private getTrackingPixelUrl(trackingId: string): string {
    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return `${baseUrl}/api/email/track/open?id=${trackingId}`;
  }
}
