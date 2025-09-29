import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../modules/redis/redis.service';
import { SecurityLoggerService } from './security-logger.service';

export interface SecurityMetrics {
  timestamp: Date;
  authenticationAttempts: {
    total: number;
    successful: number;
    failed: number;
    blocked: number;
  };
  authorizationEvents: {
    total: number;
    granted: number;
    denied: number;
  };
  rateLimitEvents: {
    total: number;
    exceeded: number;
    ipsBlocked: number;
  };
  inputValidationEvents: {
    total: number;
    failures: number;
    maliciousDetected: number;
  };
  fileUploadEvents: {
    total: number;
    successful: number;
    threats: number;
  };
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    responseTime: number;
  };
  threats: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  title: string;
  description: string;
  metadata: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsRetentionDays: number;
  alertThresholds: {
    failedLoginRate: number; // per minute
    rateLimitExceededRate: number; // per minute
    highRiskRequestRate: number; // per minute
    systemCpuUsage: number; // percentage
    systemMemoryUsage: number; // percentage
    responseTimeMs: number; // milliseconds
  };
  alertCooldownMinutes: number;
  enableRealTimeMonitoring: boolean;
  enableAutomatedResponse: boolean;
}

@Injectable()
export class SecurityMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(SecurityMonitoringService.name);
  private readonly config: MonitoringConfig;
  private readonly activeAlerts: Map<string, SecurityAlert> = new Map();
  private readonly alertCooldowns: Map<string, Date> = new Map();
  private metricsBuffer: SecurityMetrics[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly securityLogger: SecurityLoggerService,
  ) {
    this.config = this.initializeConfig();
  }

  async onModuleInit(): Promise<void> {
    if (this.config.enabled) {
      await this.initializeMonitoring();
      this.logger.log('Security monitoring service initialized');
    }
  }

  /**
   * Record security event for monitoring
   */
  async recordSecurityEvent(
    category: string,
    event: string,
    metadata: any = {},
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const timestamp = new Date();
      const key = `security_events:${category}:${this.getTimeWindow(timestamp)}`;

      // Increment event counter
      await this.redisService.hincrby(key, event, 1);
      await this.redisService.expire(key, 24 * 60 * 60); // 24 hours TTL

      // Store detailed event data if needed
      const detailKey = `security_event_details:${timestamp.getTime()}`;
      await this.redisService.setex(
        detailKey,
        60 * 60, // 1 hour TTL
        JSON.stringify({ category, event, metadata, timestamp }),
      );

      // Check for alert conditions
      await this.checkAlertConditions(category, event, metadata);
    } catch (error) {
      this.logger.error('Failed to record security event', {
        category,
        event,
        error: error.message,
      });
    }
  }

  /**
   * Get current security metrics
   */
  async getCurrentMetrics(): Promise<SecurityMetrics> {
    try {
      const timestamp = new Date();
      const timeWindow = this.getTimeWindow(timestamp);

      // Gather metrics from various sources
      const authMetrics = await this.getAuthenticationMetrics(timeWindow);
      const authzMetrics = await this.getAuthorizationMetrics(timeWindow);
      const rateLimitMetrics = await this.getRateLimitMetrics(timeWindow);
      const inputValidationMetrics =
        await this.getInputValidationMetrics(timeWindow);
      const fileUploadMetrics = await this.getFileUploadMetrics(timeWindow);
      const systemMetrics = await this.getSystemHealthMetrics();
      const threatMetrics = await this.getThreatMetrics(timeWindow);

      const metrics: SecurityMetrics = {
        timestamp,
        authenticationAttempts: authMetrics,
        authorizationEvents: authzMetrics,
        rateLimitEvents: rateLimitMetrics,
        inputValidationEvents: inputValidationMetrics,
        fileUploadEvents: fileUploadMetrics,
        systemHealth: systemMetrics,
        threats: threatMetrics,
      };

      // Store metrics for historical analysis
      await this.storeMetrics(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get current metrics', {
        error: error.message,
      });

      // Return default metrics on error
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get security metrics for a time range
   */
  async getMetricsHistory(
    startDate: Date,
    endDate: Date,
    granularity: 'minute' | 'hour' | 'day' = 'hour',
  ): Promise<SecurityMetrics[]> {
    try {
      const metrics: SecurityMetrics[] = [];
      const key = 'security_metrics_history';

      // Get stored metrics within date range
      const storedMetrics = await this.redisService.zrangebyscore(
        key,
        startDate.getTime(),
        endDate.getTime(),
      );

      for (const metricData of storedMetrics) {
        try {
          const metric = JSON.parse(metricData);
          metrics.push({
            ...metric,
            timestamp: new Date(metric.timestamp),
          });
        } catch (parseError) {
          this.logger.warn('Failed to parse stored metric', { metricData });
        }
      }

      return this.aggregateMetrics(metrics, granularity);
    } catch (error) {
      this.logger.error('Failed to get metrics history', {
        startDate,
        endDate,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get active security alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter((alert) => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge security alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    await this.updateStoredAlert(alert);

    this.logger.log('Security alert acknowledged', {
      alertId,
      acknowledgedBy,
    });

    return true;
  }

  /**
   * Resolve security alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date();

    await this.updateStoredAlert(alert);

    this.logger.log('Security alert resolved', {
      alertId,
      resolvedBy,
    });

    return true;
  }

  /**
   * Periodic metrics collection
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const metrics = await this.getCurrentMetrics();
      this.metricsBuffer.push(metrics);

      // Keep only recent metrics in buffer
      const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      this.metricsBuffer = this.metricsBuffer.filter(
        (m) => m.timestamp > cutoff,
      );
    } catch (error) {
      this.logger.error('Failed to collect metrics', {
        error: error.message,
      });
    }
  }

  /**
   * Periodic alert cleanup
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupAlerts(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours

      // Clean up old alert cooldowns
      for (const [key, date] of this.alertCooldowns) {
        if (date < cutoff) {
          this.alertCooldowns.delete(key);
        }
      }

      // Clean up resolved alerts older than retention period
      const retentionCutoff = new Date(
        now.getTime() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000,
      );
      for (const [alertId, alert] of this.activeAlerts) {
        if (
          alert.resolved &&
          alert.resolvedAt &&
          alert.resolvedAt < retentionCutoff
        ) {
          this.activeAlerts.delete(alertId);
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup alerts', {
        error: error.message,
      });
    }
  }

  /**
   * Private helper methods
   */
  private initializeConfig(): MonitoringConfig {
    return {
      enabled: this.configService.get<boolean>(
        'SECURITY_MONITORING_ENABLED',
        true,
      ),
      metricsRetentionDays: this.configService.get<number>(
        'SECURITY_METRICS_RETENTION_DAYS',
        30,
      ),
      alertThresholds: {
        failedLoginRate: this.configService.get<number>(
          'ALERT_FAILED_LOGIN_RATE',
          10,
        ),
        rateLimitExceededRate: this.configService.get<number>(
          'ALERT_RATE_LIMIT_RATE',
          50,
        ),
        highRiskRequestRate: this.configService.get<number>(
          'ALERT_HIGH_RISK_RATE',
          5,
        ),
        systemCpuUsage: this.configService.get<number>('ALERT_CPU_USAGE', 80),
        systemMemoryUsage: this.configService.get<number>(
          'ALERT_MEMORY_USAGE',
          85,
        ),
        responseTimeMs: this.configService.get<number>(
          'ALERT_RESPONSE_TIME',
          5000,
        ),
      },
      alertCooldownMinutes: this.configService.get<number>(
        'ALERT_COOLDOWN_MINUTES',
        15,
      ),
      enableRealTimeMonitoring: this.configService.get<boolean>(
        'ENABLE_REALTIME_MONITORING',
        true,
      ),
      enableAutomatedResponse: this.configService.get<boolean>(
        'ENABLE_AUTOMATED_RESPONSE',
        false,
      ),
    };
  }

  private async initializeMonitoring(): Promise<void> {
    // Load existing alerts from storage
    try {
      const alertKeys = await this.redisService.keys('security_alert:*');
      for (const key of alertKeys) {
        const alertData = await this.redisService.get<string>(key);
        if (alertData) {
          const alert = JSON.parse(alertData);
          alert.timestamp = new Date(alert.timestamp);
          if (alert.acknowledgedAt)
            alert.acknowledgedAt = new Date(alert.acknowledgedAt);
          if (alert.resolvedAt) alert.resolvedAt = new Date(alert.resolvedAt);
          this.activeAlerts.set(alert.id, alert);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load existing alerts', {
        error: error.message,
      });
    }
  }

  private getTimeWindow(timestamp: Date): string {
    // Create 1-minute time windows
    const minutes = Math.floor(timestamp.getTime() / (60 * 1000));
    return minutes.toString();
  }

  private async getAuthenticationMetrics(
    timeWindow: string,
  ): Promise<SecurityMetrics['authenticationAttempts']> {
    const key = `security_events:authentication:${timeWindow}`;
    const data = await this.redisService.hgetall<string>(key);

    return {
      total:
        parseInt(data.login_attempt || '0') +
        parseInt(data.login_success || '0') +
        parseInt(data.login_failure || '0'),
      successful: parseInt(data.login_success || '0'),
      failed: parseInt(data.login_failure || '0'),
      blocked: parseInt(data.account_locked || '0'),
    };
  }

  private async getAuthorizationMetrics(
    timeWindow: string,
  ): Promise<SecurityMetrics['authorizationEvents']> {
    const key = `security_events:authorization:${timeWindow}`;
    const data = await this.redisService.hgetall<string>(key);

    return {
      total:
        parseInt(data.access_granted || '0') +
        parseInt(data.access_denied || '0'),
      granted: parseInt(data.access_granted || '0'),
      denied: parseInt(data.access_denied || '0'),
    };
  }

  private async getRateLimitMetrics(
    timeWindow: string,
  ): Promise<SecurityMetrics['rateLimitEvents']> {
    const key = `security_events:rate_limiting:${timeWindow}`;
    const data = await this.redisService.hgetall<string>(key);

    return {
      total:
        parseInt(data.rate_limit_exceeded || '0') +
        parseInt(data.rate_limit_warning || '0'),
      exceeded: parseInt(data.rate_limit_exceeded || '0'),
      ipsBlocked: parseInt(data.ip_blocked || '0'),
    };
  }

  private async getInputValidationMetrics(
    timeWindow: string,
  ): Promise<SecurityMetrics['inputValidationEvents']> {
    const key = `security_events:input_validation:${timeWindow}`;
    const data = await this.redisService.hgetall<string>(key);

    return {
      total:
        parseInt(data.validation_failure || '0') +
        parseInt(data.sanitization_applied || '0'),
      failures: parseInt(data.validation_failure || '0'),
      maliciousDetected: parseInt(data.malicious_input_detected || '0'),
    };
  }

  private async getFileUploadMetrics(
    timeWindow: string,
  ): Promise<SecurityMetrics['fileUploadEvents']> {
    const key = `security_events:file_upload:${timeWindow}`;
    const data = await this.redisService.hgetall<string>(key);

    return {
      total:
        parseInt(data.file_upload_success || '0') +
        parseInt(data.file_upload_failure || '0'),
      successful: parseInt(data.file_upload_success || '0'),
      threats: parseInt(data.malicious_file_detected || '0'),
    };
  }

  private async getSystemHealthMetrics(): Promise<
    SecurityMetrics['systemHealth']
  > {
    // Get system health metrics (CPU, memory, etc.)
    // This would typically integrate with monitoring tools
    return {
      cpuUsage: 0, // Placeholder
      memoryUsage: 0, // Placeholder
      diskUsage: 0, // Placeholder
      responseTime: 0, // Placeholder
    };
  }

  private async getThreatMetrics(
    timeWindow: string,
  ): Promise<SecurityMetrics['threats']> {
    // Count threats by level across all categories
    const categories = [
      'authentication',
      'authorization',
      'input_validation',
      'file_upload',
      'network_security',
    ];
    const threats = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const category of categories) {
      const key = `security_threats:${category}:${timeWindow}`;
      const data = await this.redisService.hgetall<string>(key);

      threats.low += parseInt(data.low || '0');
      threats.medium += parseInt(data.medium || '0');
      threats.high += parseInt(data.high || '0');
      threats.critical += parseInt(data.critical || '0');
    }

    return threats;
  }

  private async storeMetrics(metrics: SecurityMetrics): Promise<void> {
    try {
      const key = 'security_metrics_history';
      const score = metrics.timestamp.getTime();
      const value = JSON.stringify(metrics);

      await this.redisService.zadd(key, score, value);

      // Clean up old metrics
      const cutoff =
        Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
      await this.redisService.zremrangebyscore(key, 0, cutoff);
    } catch (error) {
      this.logger.error('Failed to store metrics', {
        error: error.message,
      });
    }
  }

  private async checkAlertConditions(
    category: string,
    event: string,
    metadata: any,
  ): Promise<void> {
    // Check various alert conditions based on category and event
    const alertKey = `${category}:${event}`;

    // Check cooldown
    const cooldownEnd = this.alertCooldowns.get(alertKey);
    if (cooldownEnd && new Date() < cooldownEnd) {
      return; // Still in cooldown
    }

    // Implement specific alert logic based on thresholds
    let shouldAlert = false;
    let alertLevel: SecurityAlert['level'] = 'info';
    let alertTitle = '';
    let alertDescription = '';

    // Example alert conditions
    if (category === 'authentication' && event === 'login_failure') {
      const recentFailures = await this.getRecentEventCount(
        'authentication',
        'login_failure',
        1,
      ); // 1 minute
      if (recentFailures >= this.config.alertThresholds.failedLoginRate) {
        shouldAlert = true;
        alertLevel = 'warning';
        alertTitle = 'High Failed Login Rate';
        alertDescription = `${recentFailures} failed login attempts in the last minute`;
      }
    }

    if (shouldAlert) {
      await this.createAlert(
        alertKey,
        alertLevel,
        category,
        alertTitle,
        alertDescription,
        metadata,
      );

      // Set cooldown
      const cooldownEnd = new Date(
        Date.now() + this.config.alertCooldownMinutes * 60 * 1000,
      );
      this.alertCooldowns.set(alertKey, cooldownEnd);
    }
  }

  private async getRecentEventCount(
    category: string,
    event: string,
    minutes: number,
  ): Promise<number> {
    let count = 0;
    const now = Date.now();

    for (let i = 0; i < minutes; i++) {
      const timeWindow = Math.floor(
        (now - i * 60 * 1000) / (60 * 1000),
      ).toString();
      const key = `security_events:${category}:${timeWindow}`;
      const eventCount = await this.redisService.hget(key, event);
      count += parseInt(eventCount || '0');
    }

    return count;
  }

  private async createAlert(
    alertKey: string,
    level: SecurityAlert['level'],
    category: string,
    title: string,
    description: string,
    metadata: any,
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      title,
      description,
      metadata,
      acknowledged: false,
      resolved: false,
    };

    this.activeAlerts.set(alert.id, alert);
    await this.updateStoredAlert(alert);

    // Log the alert
    await this.securityLogger.logSecurityEvent({
      level: level === 'critical' ? 'critical' : 'warn',
      category: 'system_integrity',
      event: 'security_alert_created',
      description: `Security alert created: ${title}`,
      metadata: {
        alertId: alert.id,
        alertLevel: level,
        alertCategory: category,
        originalMetadata: metadata,
      },
    });

    this.logger.warn('Security alert created', {
      alertId: alert.id,
      level,
      category,
      title,
    });
  }

  private async updateStoredAlert(alert: SecurityAlert): Promise<void> {
    try {
      const key = `security_alert:${alert.id}`;
      await this.redisService.setex(
        key,
        this.config.metricsRetentionDays * 24 * 60 * 60, // TTL in seconds
        JSON.stringify(alert),
      );
    } catch (error) {
      this.logger.error('Failed to update stored alert', {
        alertId: alert.id,
        error: error.message,
      });
    }
  }

  private aggregateMetrics(
    metrics: SecurityMetrics[],
    granularity: string,
  ): SecurityMetrics[] {
    // Implement metric aggregation based on granularity
    // For now, return as-is
    return metrics;
  }

  private getDefaultMetrics(): SecurityMetrics {
    return {
      timestamp: new Date(),
      authenticationAttempts: {
        total: 0,
        successful: 0,
        failed: 0,
        blocked: 0,
      },
      authorizationEvents: { total: 0, granted: 0, denied: 0 },
      rateLimitEvents: { total: 0, exceeded: 0, ipsBlocked: 0 },
      inputValidationEvents: { total: 0, failures: 0, maliciousDetected: 0 },
      fileUploadEvents: { total: 0, successful: 0, threats: 0 },
      systemHealth: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        responseTime: 0,
      },
      threats: { low: 0, medium: 0, high: 0, critical: 0 },
    };
  }

  /**
   * Get monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Get current buffer metrics
   */
  getBufferMetrics(): SecurityMetrics[] {
    return [...this.metricsBuffer];
  }
}
