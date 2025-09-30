import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogSanitizer } from '../utils/log-sanitizer.util';

export interface SecurityEvent {
  type:
    | 'authentication'
    | 'authorization'
    | 'input_validation'
    | 'rate_limit'
    | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class SecurityLogger {
  private readonly logger = new Logger(SecurityLogger.name);
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Sanitize the event details before logging
    const sanitizedEvent = this.sanitizeSecurityEvent(fullEvent);

    // Always log security events
    const logMessage = `Security Event: ${event.type} - ${event.severity}`;
    const logContext = {
      ...sanitizedEvent,
      environment: this.configService.get<string>('NODE_ENV'),
    };

    switch (event.severity) {
      case 'critical':
        this.logger.error(logMessage, logContext);
        // In production, you might want to send alerts to monitoring systems
        if (this.isProduction) {
          void this.sendAlert(fullEvent);
        }
        break;
      case 'high':
        this.logger.error(logMessage, logContext);
        break;
      case 'medium':
        this.logger.warn(logMessage, logContext);
        break;
      case 'low':
        this.logger.log(logMessage, logContext);
        break;
    }

    // Store in database for audit trail (implement as needed)
    void this.storeSecurityEvent(sanitizedEvent);
  }

  logAuthenticationFailure(userId: string | null, ip: string, reason: string): void {
    this.logSecurityEvent({
      type: 'authentication',
      severity: 'medium',
      userId: userId || undefined,
      ip: LogSanitizer['maskIpAddress'](ip),
      details: {
        reason: this.sanitizeString(reason),
        action: 'login_failed',
      },
    });
  }

  logAuthorizationFailure(userId: string, ip: string, endpoint: string, reason: string): void {
    this.logSecurityEvent({
      type: 'authorization',
      severity: 'high',
      userId,
      ip: LogSanitizer['maskIpAddress'](ip),
      endpoint: LogSanitizer.sanitizeUrl(endpoint),
      details: {
        reason: this.sanitizeString(reason),
        action: 'access_denied',
      },
    });
  }

  logInputValidationFailure(
    userId: string | undefined,
    ip: string,
    endpoint: string,
    errors: any[],
  ): void {
    this.logSecurityEvent({
      type: 'input_validation',
      severity: 'medium',
      userId,
      ip: LogSanitizer['maskIpAddress'](ip),
      endpoint: LogSanitizer.sanitizeUrl(endpoint),
      details: {
        errors: this.sanitizeValidationErrors(errors),
        action: 'validation_failed',
      },
    });
  }

  logRateLimitExceeded(userId: string | undefined, ip: string, endpoint: string): void {
    this.logSecurityEvent({
      type: 'rate_limit',
      severity: 'medium',
      userId,
      ip: LogSanitizer['maskIpAddress'](ip),
      endpoint: LogSanitizer.sanitizeUrl(endpoint),
      details: {
        action: 'rate_limit_exceeded',
      },
    });
  }

  logSuspiciousActivity(
    ip: string,
    userAgent: string,
    endpoint: string,
    details: Record<string, unknown>,
  ): void {
    this.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'high',
      ip: LogSanitizer['maskIpAddress'](ip),
      userAgent: this.sanitizeUserAgent(userAgent),
      endpoint: LogSanitizer.sanitizeUrl(endpoint),
      details: {
        ...this.sanitizeObject(details),
        action: 'suspicious_request',
      },
    });
  }

  private sendAlert(event: SecurityEvent): void {
    // Implement alerting mechanism (email, Slack, monitoring service, etc.)
    // This is a placeholder for production alerting
    if (this.isProduction) {
      console.error('SECURITY ALERT:', event);
      // Example: await this.emailService.sendSecurityAlert(event);
      // Example: await this.slackService.sendAlert(event);
    }
  }

  private storeSecurityEvent(event: SecurityEvent): void {
    // Implement database storage for security events
    // This could be a separate security_events table
    try {
      // Example: await this.securityEventsRepository.create(event);
      // For now, we'll just log to console in development
      if (!this.isProduction) {
        console.log('Security Event Stored:', event);
      }
    } catch (error) {
      this.logger.error('Failed to store security event:', error);
    }
  }

  /**
   * Sanitizes a security event to remove sensitive information
   */
  private sanitizeSecurityEvent(event: SecurityEvent): SecurityEvent {
    return {
      ...event,
      ip: event.ip ? LogSanitizer['maskIpAddress'](event.ip) : undefined,
      userAgent: event.userAgent ? this.sanitizeUserAgent(event.userAgent) : undefined,
      endpoint: event.endpoint ? LogSanitizer.sanitizeUrl(event.endpoint) : undefined,
      details: this.sanitizeObject(event.details),
    };
  }

  /**
   * Sanitizes a string to prevent logging of sensitive data
   */
  private sanitizeString(input: string): string {
    if (!input) return input;

    // Remove potential tokens, passwords, and other sensitive patterns
    return input
      .replace(/(?:token|password|secret|key)\s*[:=]\s*\S+/gi, '[REDACTED]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_NUMBER]')
      .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  }

  /**
   * Sanitizes User-Agent strings
   */
  private sanitizeUserAgent(userAgent: string): string {
    if (!userAgent) return userAgent;

    // Keep the browser/client info but remove potentially sensitive details
    const sanitized = userAgent
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Truncate very long user agents that might contain sensitive data
    return sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized;
  }

  /**
   * Sanitizes an object to remove sensitive data
   */
  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Sanitizes validation errors to remove sensitive field values
   */
  private sanitizeValidationErrors(errors: unknown[]): unknown[] {
    if (!Array.isArray(errors)) return [];

    return errors.map((error) => {
      if (typeof error === 'string') {
        return this.sanitizeString(error);
      }

      if (typeof error === 'object' && error !== null) {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(error as Record<string, unknown>)) {
          if (typeof value === 'string') {
            sanitized[key] = this.sanitizeString(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      }

      return error;
    });
  }
}
