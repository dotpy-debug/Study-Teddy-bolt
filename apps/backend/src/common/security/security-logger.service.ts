import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SanitizationService } from './sanitization.service';
import { EncryptionService } from './encryption.service';

export interface SecurityLogLevel {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  color: string;
  priority: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  level: SecurityLogLevel['level'];
  category:
    | 'authentication'
    | 'authorization'
    | 'input_validation'
    | 'rate_limiting'
    | 'file_upload'
    | 'session_management'
    | 'data_protection'
    | 'network_security'
    | 'system_integrity'
    | 'compliance'
    | 'incident_response';
  event: string;
  description: string;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, any>;
    body?: any;
    query?: any;
    params?: any;
  };
  response?: {
    statusCode?: number;
    headers?: Record<string, any>;
    processingTime?: number;
  };
  security?: {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    indicators: string[];
    mitigation?: string[];
  };
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface LoggingConfig {
  enableSecurityLogging: boolean;
  enableSensitiveDataMasking: boolean;
  enableEncryptedLogging: boolean;
  logLevel: SecurityLogLevel['level'];
  maxLogEntrySize: number;
  retentionDays: number;
  enableRemoteLogging: boolean;
  remoteLogEndpoint?: string;
  enableRealTimeAlerts: boolean;
  alertThresholds: {
    [category: string]: {
      count: number;
      timeWindow: number; // minutes
    };
  };
}

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger(SecurityLoggerService.name);
  private readonly config: LoggingConfig;
  private readonly logLevels: Map<string, SecurityLogLevel> = new Map();
  private readonly eventCounters: Map<string, { count: number; windowStart: Date }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly sanitizationService: SanitizationService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.config = this.initializeConfig();
    this.initializeLogLevels();
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: Partial<SecurityEvent>): Promise<void> {
    if (!this.config.enableSecurityLogging) {
      return;
    }

    try {
      const securityEvent: SecurityEvent = {
        id: this.generateEventId(),
        timestamp: new Date(),
        level: event.level || 'info',
        category: event.category || 'system_integrity',
        event: event.event || 'Unknown Event',
        description: event.description || '',
        user: event.user,
        request: event.request,
        response: event.response,
        security: event.security || {
          threatLevel: 'low',
          riskScore: 0,
          indicators: [],
        },
        metadata: event.metadata,
        stackTrace: event.stackTrace,
      };

      // Check if event meets minimum log level
      if (!this.shouldLog(securityEvent.level)) {
        return;
      }

      // Sanitize sensitive data
      const sanitizedEvent = await this.sanitizeSecurityEvent(securityEvent);

      // Check for alert conditions
      this.checkAlertConditions(sanitizedEvent);

      // Log the event
      await this.writeSecurityLog(sanitizedEvent);

      // Send to remote logging if configured
      if (this.config.enableRemoteLogging) {
        await this.sendToRemoteLogging(sanitizedEvent);
      }
    } catch (error) {
      this.logger.error('Failed to log security event', {
        error: error.message,
        originalEvent: this.maskSensitiveFields(event),
      });
    }
  }

  /**
   * Log authentication events
   */
  async logAuthenticationEvent(
    event:
      | 'login_attempt'
      | 'login_success'
      | 'login_failure'
      | 'logout'
      | 'password_change'
      | 'mfa_setup'
      | 'mfa_verification',
    details: {
      userId?: string;
      email?: string;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      failureReason?: string;
      mfaMethod?: string;
      deviceFingerprint?: string;
    },
  ): Promise<void> {
    await this.logSecurityEvent({
      level: details.success === false ? 'warn' : 'info',
      category: 'authentication',
      event,
      description: `Authentication event: ${event}`,
      user: {
        id: details.userId,
        email: details.email,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
      },
      security: {
        threatLevel: details.success === false ? 'medium' : 'low',
        riskScore: details.success === false ? 30 : 5,
        indicators: details.success === false ? ['login_failure'] : [],
      },
      metadata: {
        success: details.success,
        failureReason: details.failureReason,
        mfaMethod: details.mfaMethod,
        deviceFingerprint: details.deviceFingerprint,
      },
    });
  }

  /**
   * Log authorization events
   */
  async logAuthorizationEvent(
    event: 'access_granted' | 'access_denied' | 'permission_escalation' | 'role_change',
    details: {
      userId?: string;
      resource?: string;
      action?: string;
      granted?: boolean;
      reason?: string;
      requiredPermission?: string;
      userPermissions?: string[];
    },
  ): Promise<void> {
    await this.logSecurityEvent({
      level: details.granted === false ? 'warn' : 'info',
      category: 'authorization',
      event,
      description: `Authorization event: ${event}`,
      user: {
        id: details.userId,
      },
      security: {
        threatLevel: details.granted === false ? 'medium' : 'low',
        riskScore: details.granted === false ? 25 : 5,
        indicators: details.granted === false ? ['access_denied'] : [],
      },
      metadata: {
        resource: details.resource,
        action: details.action,
        granted: details.granted,
        reason: details.reason,
        requiredPermission: details.requiredPermission,
        userPermissions: details.userPermissions,
      },
    });
  }

  /**
   * Log input validation events
   */
  async logInputValidationEvent(
    event: 'validation_failure' | 'sanitization_applied' | 'malicious_input_detected',
    details: {
      userId?: string;
      endpoint?: string;
      inputField?: string;
      inputValue?: any;
      validationErrors?: string[];
      sanitizedValue?: any;
      threatLevel?: 'low' | 'medium' | 'high' | 'critical';
    },
  ): Promise<void> {
    await this.logSecurityEvent({
      level:
        details.threatLevel === 'critical' || details.threatLevel === 'high' ? 'error' : 'warn',
      category: 'input_validation',
      event,
      description: `Input validation event: ${event}`,
      user: {
        id: details.userId,
      },
      security: {
        threatLevel: details.threatLevel || 'medium',
        riskScore: this.calculateRiskScore(details.threatLevel || 'medium'),
        indicators: [event],
      },
      metadata: {
        endpoint: details.endpoint,
        inputField: details.inputField,
        inputValue: this.sanitizeLogValue(details.inputValue),
        validationErrors: details.validationErrors,
        sanitizedValue: this.sanitizeLogValue(details.sanitizedValue),
      },
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitEvent(
    event:
      | 'rate_limit_exceeded'
      | 'rate_limit_warning'
      | 'ip_blocked'
      | 'burst_protection_triggered',
    details: {
      userId?: string;
      ipAddress?: string;
      endpoint?: string;
      limit?: number;
      current?: number;
      resetTime?: Date;
      blockDuration?: number;
    },
  ): Promise<void> {
    await this.logSecurityEvent({
      level: 'warn',
      category: 'rate_limiting',
      event,
      description: `Rate limiting event: ${event}`,
      user: {
        id: details.userId,
        ipAddress: details.ipAddress,
      },
      security: {
        threatLevel: 'medium',
        riskScore: 20,
        indicators: [event],
      },
      metadata: {
        endpoint: details.endpoint,
        limit: details.limit,
        current: details.current,
        resetTime: details.resetTime,
        blockDuration: details.blockDuration,
      },
    });
  }

  /**
   * Log file upload events
   */
  async logFileUploadEvent(
    event:
      | 'file_upload_success'
      | 'file_upload_failure'
      | 'malicious_file_detected'
      | 'file_scan_completed',
    details: {
      userId?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      uploadPath?: string;
      scanResults?: any;
      threatDetected?: boolean;
      rejectionReason?: string;
    },
  ): Promise<void> {
    await this.logSecurityEvent({
      level: details.threatDetected ? 'error' : 'info',
      category: 'file_upload',
      event,
      description: `File upload event: ${event}`,
      user: {
        id: details.userId,
      },
      security: {
        threatLevel: details.threatDetected ? 'high' : 'low',
        riskScore: details.threatDetected ? 70 : 10,
        indicators: details.threatDetected ? ['malicious_file'] : [],
      },
      metadata: {
        fileName: details.fileName,
        fileSize: details.fileSize,
        mimeType: details.mimeType,
        uploadPath: details.uploadPath,
        scanResults: details.scanResults,
        threatDetected: details.threatDetected,
        rejectionReason: details.rejectionReason,
      },
    });
  }

  /**
   * Log data protection events
   */
  async logDataProtectionEvent(
    event:
      | 'data_encrypted'
      | 'data_decrypted'
      | 'encryption_failure'
      | 'data_breach_detected'
      | 'pii_access',
    details: {
      userId?: string;
      dataType?: string;
      operation?: string;
      success?: boolean;
      errorMessage?: string;
      dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
    },
  ): Promise<void> {
    await this.logSecurityEvent({
      level: details.success === false || event === 'data_breach_detected' ? 'error' : 'info',
      category: 'data_protection',
      event,
      description: `Data protection event: ${event}`,
      user: {
        id: details.userId,
      },
      security: {
        threatLevel: event === 'data_breach_detected' ? 'critical' : 'low',
        riskScore: event === 'data_breach_detected' ? 100 : 15,
        indicators: event === 'data_breach_detected' ? ['data_breach'] : [],
      },
      metadata: {
        dataType: details.dataType,
        operation: details.operation,
        success: details.success,
        errorMessage: details.errorMessage,
        dataClassification: details.dataClassification,
      },
    });
  }

  /**
   * Private helper methods
   */
  private initializeConfig(): LoggingConfig {
    return {
      enableSecurityLogging: this.configService.get<boolean>('SECURITY_LOGGING_ENABLED', true),
      enableSensitiveDataMasking: this.configService.get<boolean>(
        'SECURITY_LOG_MASK_SENSITIVE',
        true,
      ),
      enableEncryptedLogging: this.configService.get<boolean>('SECURITY_LOG_ENCRYPTION', false),
      logLevel: this.configService.get<SecurityLogLevel['level']>('SECURITY_LOG_LEVEL', 'info'),
      maxLogEntrySize: this.configService.get<number>('SECURITY_LOG_MAX_SIZE', 10000),
      retentionDays: this.configService.get<number>('SECURITY_LOG_RETENTION_DAYS', 90),
      enableRemoteLogging: this.configService.get<boolean>('SECURITY_LOG_REMOTE_ENABLED', false),
      remoteLogEndpoint: this.configService.get<string>('SECURITY_LOG_REMOTE_ENDPOINT'),
      enableRealTimeAlerts: this.configService.get<boolean>('SECURITY_ALERTS_ENABLED', true),
      alertThresholds: {
        authentication: { count: 5, timeWindow: 5 },
        authorization: { count: 10, timeWindow: 5 },
        input_validation: { count: 20, timeWindow: 5 },
        rate_limiting: { count: 3, timeWindow: 5 },
        file_upload: { count: 5, timeWindow: 10 },
        data_protection: { count: 1, timeWindow: 1 },
      },
    };
  }

  private initializeLogLevels(): void {
    this.logLevels.set('debug', { level: 'debug', color: 'gray', priority: 1 });
    this.logLevels.set('info', { level: 'info', color: 'blue', priority: 2 });
    this.logLevels.set('warn', { level: 'warn', color: 'yellow', priority: 3 });
    this.logLevels.set('error', { level: 'error', color: 'red', priority: 4 });
    this.logLevels.set('critical', {
      level: 'critical',
      color: 'magenta',
      priority: 5,
    });
  }

  private shouldLog(level: SecurityLogLevel['level']): boolean {
    const eventLevel = this.logLevels.get(level);
    const configLevel = this.logLevels.get(this.config.logLevel);

    if (!eventLevel || !configLevel) {
      return true; // Default to logging if level is unknown
    }

    return eventLevel.priority >= configLevel.priority;
  }

  private async sanitizeSecurityEvent(event: SecurityEvent): Promise<SecurityEvent> {
    const sanitized = { ...event };

    if (this.config.enableSensitiveDataMasking) {
      // Sanitize user data
      if (sanitized.user?.email) {
        sanitized.user.email = this.sanitizationService.sanitizeEmail(sanitized.user.email);
      }

      // Sanitize request data
      if (sanitized.request?.body) {
        sanitized.request.body = this.encryptionService.maskSensitiveData(sanitized.request.body);
      }

      if (sanitized.request?.query) {
        sanitized.request.query = this.encryptionService.maskSensitiveData(sanitized.request.query);
      }

      // Sanitize metadata
      if (sanitized.metadata) {
        sanitized.metadata = this.encryptionService.maskSensitiveData(sanitized.metadata);
      }
    }

    return sanitized;
  }

  private checkAlertConditions(event: SecurityEvent): void {
    if (!this.config.enableRealTimeAlerts) {
      return;
    }

    const threshold = this.config.alertThresholds[event.category];
    if (!threshold) {
      return;
    }

    const key = `${event.category}:${event.user?.id || 'anonymous'}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - threshold.timeWindow * 60 * 1000);

    let counter = this.eventCounters.get(key);
    if (!counter || counter.windowStart < windowStart) {
      counter = { count: 0, windowStart: now };
    }

    counter.count++;
    this.eventCounters.set(key, counter);

    if (counter.count >= threshold.count) {
      this.triggerSecurityAlert(event, counter.count, threshold);
    }
  }

  private triggerSecurityAlert(event: SecurityEvent, count: number, threshold: any): void {
    this.logger.error('Security alert triggered', {
      category: event.category,
      eventCount: count,
      threshold: threshold.count,
      timeWindow: threshold.timeWindow,
      user: event.user?.id,
      lastEvent: event.event,
    });

    // Implement your alerting mechanism here
    // This could send notifications to security team, trigger incident response, etc.
  }

  private async writeSecurityLog(event: SecurityEvent): Promise<void> {
    const logMessage = this.formatLogMessage(event);

    // Limit log entry size
    const truncatedMessage =
      logMessage.length > this.config.maxLogEntrySize
        ? logMessage.substring(0, this.config.maxLogEntrySize) + '...[TRUNCATED]'
        : logMessage;

    // Log based on severity level
    switch (event.level) {
      case 'debug':
        this.logger.debug(truncatedMessage);
        break;
      case 'info':
        this.logger.log(truncatedMessage);
        break;
      case 'warn':
        this.logger.warn(truncatedMessage);
        break;
      case 'error':
      case 'critical':
        this.logger.error(truncatedMessage);
        break;
    }
  }

  private formatLogMessage(event: SecurityEvent): string {
    return JSON.stringify(
      {
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        level: event.level,
        category: event.category,
        event: event.event,
        description: event.description,
        user: event.user,
        request: event.request
          ? {
              method: event.request.method,
              url: event.request.url,
              userAgent: event.request.headers?.['user-agent'],
            }
          : undefined,
        response: event.response,
        security: event.security,
        metadata: event.metadata,
      },
      null,
      2,
    );
  }

  private async sendToRemoteLogging(event: SecurityEvent): Promise<void> {
    if (!this.config.remoteLogEndpoint) {
      return;
    }

    try {
      // Implement remote logging logic here
      // This could send to ELK stack, Splunk, cloud logging services, etc.
      this.logger.debug('Sending to remote logging', { eventId: event.id });
    } catch (error) {
      this.logger.error('Failed to send to remote logging', {
        error: error.message,
        eventId: event.id,
      });
    }
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateRiskScore(threatLevel: string): number {
    const scores = {
      low: 10,
      medium: 30,
      high: 70,
      critical: 100,
    };
    return scores[threatLevel as keyof typeof scores] || 0;
  }

  private sanitizeLogValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizationService.sanitizeText(value, { maxLength: 100 });
    }
    return value;
  }

  private maskSensitiveFields(obj: any): any {
    return this.encryptionService.maskSensitiveData(obj);
  }

  /**
   * Get logging configuration
   */
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Get event statistics
   */
  getEventStatistics(): { [category: string]: number } {
    const stats: { [category: string]: number } = {};

    for (const [key, counter] of this.eventCounters) {
      const category = key.split(':')[0];
      stats[category] = (stats[category] || 0) + counter.count;
    }

    return stats;
  }
}
