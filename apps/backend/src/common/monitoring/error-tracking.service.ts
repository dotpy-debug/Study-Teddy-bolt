import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface AlertRule {
  name: string;
  condition: (errors: ErrorEvent[]) => boolean;
  message: string;
  severity: 'warning' | 'critical';
  cooldown: number; // minutes
}

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private errors: ErrorEvent[] = [];
  private alertHistory: Map<string, Date> = new Map();
  private maxStoredErrors = 1000;

  constructor(private readonly configService: ConfigService) {
    this.setupDefaultAlertRules();
  }

  // Track an error
  trackError(
    error: Error,
    context?: Record<string, any>,
    userId?: string,
    severity: ErrorEvent['severity'] = 'medium',
  ): string {
    const errorEvent: ErrorEvent = {
      id: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      context,
      userId,
      timestamp: new Date(),
      severity,
      resolved: false,
    };

    this.errors.push(errorEvent);

    // Keep only recent errors to prevent memory issues
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(-this.maxStoredErrors);
    }

    // Log the error
    this.logger.error(`Error tracked: ${error.message}`, {
      errorId: errorEvent.id,
      context,
      userId,
      severity,
      stack: error.stack,
    });

    // Check alert rules
    this.checkAlertRules();

    return errorEvent.id;
  }

  // Get error statistics
  getErrorStats(timeWindow: number = 3600000): {
    // 1 hour default
    total: number;
    byseverity: Record<string, number>;
    recentErrors: ErrorEvent[];
    errorRate: number;
  } {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentErrors = this.errors.filter((error) => error.timestamp > cutoff);

    const byseverity = recentErrors.reduce(
      (acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: recentErrors.length,
      byseverity,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      errorRate: recentErrors.length / (timeWindow / 60000), // errors per minute
    };
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorEvent['severity']): ErrorEvent[] {
    return this.errors.filter((error) => error.severity === severity && !error.resolved);
  }

  // Mark error as resolved
  resolveError(errorId: string): boolean {
    const error = this.errors.find((e) => e.id === errorId);
    if (error) {
      error.resolved = true;
      this.logger.log(`Error resolved: ${errorId}`);
      return true;
    }
    return false;
  }

  // Get unresolved critical errors
  getCriticalErrors(): ErrorEvent[] {
    return this.errors.filter((error) => error.severity === 'critical' && !error.resolved);
  }

  // Check if system is in error state
  isInErrorState(): boolean {
    const stats = this.getErrorStats(300000); // 5 minutes

    // Define error state thresholds
    const criticalErrorThreshold = 1;
    const highErrorRateThreshold = 10; // errors per minute
    const totalErrorThreshold = 50;

    return (
      stats.byseverity.critical >= criticalErrorThreshold ||
      stats.errorRate > highErrorRateThreshold ||
      stats.total > totalErrorThreshold
    );
  }

  // Setup default alert rules
  private setupDefaultAlertRules() {
    const alertRules: AlertRule[] = [
      {
        name: 'Critical Error Alert',
        condition: (errors) => errors.some((e) => e.severity === 'critical' && !e.resolved),
        message: 'Critical error detected in Study Teddy backend',
        severity: 'critical',
        cooldown: 5, // 5 minutes
      },
      {
        name: 'High Error Rate Alert',
        condition: (errors) => {
          const recentErrors = errors.filter(
            (e) => e.timestamp > new Date(Date.now() - 300000), // 5 minutes
          );
          return recentErrors.length > 20;
        },
        message: 'High error rate detected (>20 errors in 5 minutes)',
        severity: 'warning',
        cooldown: 15, // 15 minutes
      },
      {
        name: 'Database Error Alert',
        condition: (errors) => {
          const dbErrors = errors.filter(
            (e) => e.context?.type === 'database' && e.timestamp > new Date(Date.now() - 600000), // 10 minutes
          );
          return dbErrors.length > 5;
        },
        message: 'Multiple database errors detected',
        severity: 'critical',
        cooldown: 10, // 10 minutes
      },
    ];

    // Store alert rules (in a real implementation, these might be configurable)
    this.alertRules = alertRules;
  }

  private alertRules: AlertRule[] = [];

  // Check alert rules and trigger alerts
  private checkAlertRules() {
    for (const rule of this.alertRules) {
      const lastAlert = this.alertHistory.get(rule.name);
      const cooldownExpired =
        !lastAlert || Date.now() - lastAlert.getTime() > rule.cooldown * 60000;

      if (cooldownExpired && rule.condition(this.errors)) {
        this.triggerAlert(rule);
        this.alertHistory.set(rule.name, new Date());
      }
    }
  }

  // Trigger an alert (in production, this would send notifications)
  private triggerAlert(rule: AlertRule) {
    this.logger.warn(`ALERT: ${rule.message}`, {
      rule: rule.name,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
    });

    // In production, you would integrate with:
    // - Email service
    // - Slack/Discord webhooks
    // - PagerDuty
    // - SMS service
    // - etc.

    this.sendAlertNotification(rule);
  }

  // Send alert notification (mock implementation)
  private async sendAlertNotification(rule: AlertRule) {
    const webhookUrl = this.configService.get('ALERT_WEBHOOK_URL');

    if (webhookUrl) {
      try {
        // Example webhook payload
        const payload = {
          text: `🚨 ${rule.message}`,
          severity: rule.severity,
          timestamp: new Date().toISOString(),
          service: 'Study Teddy Backend',
          environment: this.configService.get('NODE_ENV'),
        };

        // In a real implementation, you would make an HTTP request
        this.logger.log('Alert notification sent', payload);
      } catch (error) {
        this.logger.error('Failed to send alert notification', error);
      }
    }
  }

  // Generate unique error ID
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export error data for external monitoring systems
  getErrorsForExport(limit: number = 100): ErrorEvent[] {
    return this.errors.slice(-limit).map((error) => ({
      ...error,
      stack: undefined, // Remove stack traces for security
    }));
  }

  // Clear old errors (cleanup task)
  clearOldErrors(maxAge: number = 86400000) {
    // 24 hours default
    const cutoff = new Date(Date.now() - maxAge);
    const initialCount = this.errors.length;

    this.errors = this.errors.filter((error) => error.timestamp > cutoff);

    const removedCount = initialCount - this.errors.length;
    if (removedCount > 0) {
      this.logger.log(`Cleaned up ${removedCount} old errors`);
    }
  }
}
