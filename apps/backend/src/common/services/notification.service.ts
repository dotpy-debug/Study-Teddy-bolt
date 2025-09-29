import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SentryService } from '../../sentry/sentry.service';

export interface NotificationChannel {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  isEnabled: boolean;
}

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface EscalationRule {
  severity: string;
  channels: string[];
  delays: number[]; // Minutes to wait before escalating
  maxEscalations: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private channels: Map<string, NotificationChannel> = new Map();
  private escalationRules: Map<string, EscalationRule> = new Map();
  private pendingEscalations: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly sentryService: SentryService,
  ) {
    this.initializeChannels();
    this.initializeEscalationRules();
  }

  /**
   * Send alert notification
   */
  async sendAlert(alert: AlertNotification): Promise<void> {
    this.logger.log(`Sending alert: ${alert.title} (${alert.severity})`);

    try {
      // Track alert in Sentry
      this.sentryService.trackMetric({
        name: 'alert.sent',
        value: 1,
        tags: {
          severity: alert.severity,
          source: alert.source,
          type: 'alert_notification',
        },
      });

      // Get escalation rule for this severity
      const escalationRule = this.escalationRules.get(alert.severity);
      if (!escalationRule) {
        this.logger.warn(
          `No escalation rule found for severity: ${alert.severity}`,
        );
        return;
      }

      // Send to primary channels immediately
      await this.sendToChannels(alert, escalationRule.channels);

      // Set up escalation if needed
      if (escalationRule.delays.length > 0 && alert.severity === 'critical') {
        this.scheduleEscalation(alert, escalationRule);
      }
    } catch (error) {
      this.logger.error(`Failed to send alert: ${alert.title}`, error);
      this.sentryService.captureException(error, {
        alert_context: {
          alertId: alert.id,
          title: alert.title,
          severity: alert.severity,
        },
      });
    }
  }

  /**
   * Send notification to specific channels
   */
  private async sendToChannels(
    alert: AlertNotification,
    channelNames: string[],
  ): Promise<void> {
    const promises = channelNames.map(async (channelName) => {
      const channel = this.channels.get(channelName);
      if (!channel || !channel.isEnabled) {
        this.logger.warn(`Channel not found or disabled: ${channelName}`);
        return;
      }

      try {
        await this.sendToChannel(alert, channel);
        this.logger.debug(`Alert sent to channel: ${channelName}`);
      } catch (error) {
        this.logger.error(`Failed to send to channel ${channelName}:`, error);
        this.sentryService.trackMetric({
          name: 'alert.channel_failure',
          value: 1,
          tags: {
            channel: channelName,
            channel_type: channel.type,
          },
        });
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    alert: AlertNotification,
    channel: NotificationChannel,
  ): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmail(alert, channel);
        break;
      case 'slack':
        await this.sendSlack(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhook(alert, channel);
        break;
      case 'sms':
        await this.sendSMS(alert, channel);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    alert: AlertNotification,
    channel: NotificationChannel,
  ): Promise<void> {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });

    const severity = alert.severity.toUpperCase();
    const subject = `[${severity}] ${alert.title}`;
    const htmlContent = this.generateEmailHTML(alert);

    await transporter.sendMail({
      from: this.configService.get('ALERT_FROM_EMAIL', 'alerts@studyteddy.com'),
      to: channel.config.recipients.join(','),
      subject,
      html: htmlContent,
      priority: alert.severity === 'critical' ? 'high' : 'normal',
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(
    alert: AlertNotification,
    channel: NotificationChannel,
  ): Promise<void> {
    const webhookUrl = channel.config.webhookUrl;

    const slackMessage = {
      channel: channel.config.channel,
      username: 'StudyTeddy Alerts',
      icon_emoji: this.getSeverityEmoji(alert.severity),
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Source',
              value: alert.source,
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true,
            },
          ],
          footer: 'StudyTeddy Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error(
        `Slack webhook failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    alert: AlertNotification,
    channel: NotificationChannel,
  ): Promise<void> {
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'studyteddy-monitoring',
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StudyTeddy-Alerts/1.0',
        ...(channel.config.headers || {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * Send SMS notification (placeholder - would integrate with SMS service)
   */
  private async sendSMS(
    alert: AlertNotification,
    channel: NotificationChannel,
  ): Promise<void> {
    // This would integrate with an SMS service like Twilio
    this.logger.log(
      `SMS would be sent to: ${channel.config.phoneNumbers.join(', ')}`,
    );
    this.logger.log(
      `SMS content: [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`,
    );
  }

  /**
   * Schedule escalation for critical alerts
   */
  private scheduleEscalation(
    alert: AlertNotification,
    rule: EscalationRule,
  ): void {
    const escalationKey = `${alert.id}_escalation`;

    rule.delays.forEach((delayMinutes, index) => {
      if (index >= rule.maxEscalations) return;

      const timeout = setTimeout(
        async () => {
          this.logger.warn(
            `Escalating alert: ${alert.title} (level ${index + 1})`,
          );

          // Send to escalation channels
          await this.sendToChannels(alert, this.getEscalationChannels(index));

          this.sentryService.trackMetric({
            name: 'alert.escalated',
            value: 1,
            tags: {
              alertId: alert.id,
              escalationLevel: (index + 1).toString(),
            },
          });
        },
        delayMinutes * 60 * 1000,
      );

      this.pendingEscalations.set(`${escalationKey}_${index}`, timeout);
    });
  }

  /**
   * Cancel escalation for an alert
   */
  cancelEscalation(alertId: string): void {
    const escalationKey = `${alertId}_escalation`;

    for (const [key, timeout] of this.pendingEscalations.entries()) {
      if (key.startsWith(escalationKey)) {
        clearTimeout(timeout);
        this.pendingEscalations.delete(key);
      }
    }

    this.logger.log(`Cancelled escalation for alert: ${alertId}`);
  }

  /**
   * Get escalation channels based on level
   */
  private getEscalationChannels(level: number): string[] {
    const escalationChannels = [
      ['email-oncall', 'slack-critical'], // Level 0
      ['email-team-lead', 'slack-leadership'], // Level 1
      ['email-engineering-manager', 'pagerduty-emergency'], // Level 2
    ];

    return escalationChannels[level] || ['email-emergency'];
  }

  /**
   * Initialize notification channels
   */
  private initializeChannels(): void {
    // Email channels
    this.channels.set('email-dev-team', {
      name: 'Development Team Email',
      type: 'email',
      config: {
        recipients: this.configService
          .get('DEV_TEAM_EMAILS', '')
          .split(',')
          .filter(Boolean),
      },
      isEnabled: true,
    });

    this.channels.set('email-oncall', {
      name: 'On-Call Engineer Email',
      type: 'email',
      config: {
        recipients: [
          this.configService.get('ONCALL_EMAIL', 'oncall@studyteddy.com'),
        ],
      },
      isEnabled: true,
    });

    // Slack channels
    this.channels.set('slack-alerts', {
      name: 'Slack Alerts Channel',
      type: 'slack',
      config: {
        webhookUrl: this.configService.get('SLACK_ALERTS_WEBHOOK'),
        channel: '#alerts',
      },
      isEnabled: !!this.configService.get('SLACK_ALERTS_WEBHOOK'),
    });

    this.channels.set('slack-critical', {
      name: 'Slack Critical Channel',
      type: 'slack',
      config: {
        webhookUrl: this.configService.get('SLACK_CRITICAL_WEBHOOK'),
        channel: '#critical-alerts',
      },
      isEnabled: !!this.configService.get('SLACK_CRITICAL_WEBHOOK'),
    });

    // PagerDuty webhook
    this.channels.set('pagerduty-critical', {
      name: 'PagerDuty Critical',
      type: 'webhook',
      config: {
        url: this.configService.get('PAGERDUTY_WEBHOOK_URL'),
        headers: {
          Authorization: `Token token=${this.configService.get('PAGERDUTY_TOKEN')}`,
        },
      },
      isEnabled: !!this.configService.get('PAGERDUTY_WEBHOOK_URL'),
    });

    this.logger.log(`Initialized ${this.channels.size} notification channels`);
  }

  /**
   * Initialize escalation rules
   */
  private initializeEscalationRules(): void {
    this.escalationRules.set('critical', {
      severity: 'critical',
      channels: ['email-oncall', 'slack-critical', 'pagerduty-critical'],
      delays: [2, 5, 10], // Escalate after 2, 5, and 10 minutes
      maxEscalations: 3,
    });

    this.escalationRules.set('error', {
      severity: 'error',
      channels: ['email-dev-team', 'slack-alerts'],
      delays: [15], // Escalate after 15 minutes
      maxEscalations: 1,
    });

    this.escalationRules.set('warning', {
      severity: 'warning',
      channels: ['slack-alerts'],
      delays: [],
      maxEscalations: 0,
    });

    this.escalationRules.set('info', {
      severity: 'info',
      channels: ['slack-alerts'],
      delays: [],
      maxEscalations: 0,
    });
  }

  /**
   * Generate HTML content for email
   */
  private generateEmailHTML(alert: AlertNotification): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; text-align: center;">
            <h1>${alert.severity.toUpperCase()} ALERT</h1>
          </div>
          <div style="padding: 20px;">
            <h2>${alert.title}</h2>
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Source:</strong> ${alert.source}</p>
            <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>

            ${
              alert.metadata
                ? `
              <h3>Additional Details:</h3>
              <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
            `
                : ''
            }

            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This alert was generated by StudyTeddy monitoring system.<br>
              Alert ID: ${alert.id}
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    const emojis = {
      critical: ':rotating_light:',
      error: ':x:',
      warning: ':warning:',
      info: ':information_source:',
    };
    return emojis[severity] || ':question:';
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    const colors = {
      critical: '#FF0000',
      error: '#FF6B35',
      warning: '#FFB000',
      info: '#36A2EB',
    };
    return colors[severity] || '#808080';
  }

  /**
   * Get notification channel statistics
   */
  getChannelStats(): Record<string, any> {
    const stats = {};

    for (const [name, channel] of this.channels) {
      stats[name] = {
        type: channel.type,
        isEnabled: channel.isEnabled,
        hasConfig: Object.keys(channel.config).length > 0,
      };
    }

    return {
      channels: stats,
      totalChannels: this.channels.size,
      enabledChannels: Array.from(this.channels.values()).filter(
        (c) => c.isEnabled,
      ).length,
      pendingEscalations: this.pendingEscalations.size,
    };
  }

  /**
   * Test notification channel
   */
  async testChannel(channelName: string): Promise<boolean> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel not found: ${channelName}`);
    }

    const testAlert: AlertNotification = {
      id: `test_${Date.now()}`,
      title: 'Test Alert',
      message: 'This is a test notification to verify channel configuration.',
      severity: 'info',
      source: 'notification-service-test',
      timestamp: new Date(),
      tags: ['test'],
    };

    try {
      await this.sendToChannel(testAlert, channel);
      this.logger.log(
        `Test notification sent successfully to channel: ${channelName}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Test notification failed for channel ${channelName}:`,
        error,
      );
      return false;
    }
  }
}
