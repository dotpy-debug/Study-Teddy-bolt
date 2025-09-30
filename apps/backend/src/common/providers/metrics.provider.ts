import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SentryService } from '../../sentry/sentry.service';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  process: {
    uptime: number;
    pid: number;
    version: string;
  };
  database: {
    activeConnections?: number;
    queryCount?: number;
    slowQueries?: number;
  };
  api: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
}

export interface BusinessMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
  };
  studySessions: {
    total: number;
    completedToday: number;
    averageDuration: number;
  };
  tasks: {
    total: number;
    completedToday: number;
    overdue: number;
  };
  aiInteractions: {
    total: number;
    todayCount: number;
    averageResponseTime: number;
    successRate: number;
  };
}

@Injectable()
export class MetricsProvider implements OnModuleInit {
  private readonly logger = new Logger(MetricsProvider.name);
  private systemMetrics: Partial<SystemMetrics> = {};
  private businessMetrics: Partial<BusinessMetrics> = {};
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly sentryService: SentryService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    this.startMetricsCollection();
  }

  /**
   * Start collecting metrics at regular intervals
   */
  private startMetricsCollection() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const interval = isProduction ? 60000 : 30000; // 1 minute in prod, 30 seconds in dev

    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        if (isProduction) {
          await this.collectBusinessMetrics();
        }
      } catch (error) {
        this.logger.error('Failed to collect metrics:', error);
      }
    }, interval);

    this.logger.log(`Metrics collection started (interval: ${interval}ms)`);
  }

  /**
   * Collect system-level metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const metrics: Partial<SystemMetrics> = {
      timestamp: new Date(),
    };

    // Memory metrics
    const memUsage = process.memoryUsage();
    metrics.memory = {
      total: this.getTotalMemory(),
      used: memUsage.rss,
      free: this.getTotalMemory() - memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    };

    // Process metrics
    metrics.process = {
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
    };

    // CPU metrics (simplified - would need more sophisticated monitoring for real CPU usage)
    metrics.cpu = {
      usage: this.getCPUUsage(),
      loadAverage: this.getLoadAverage(),
    };

    this.systemMetrics = metrics;

    // Track memory metrics with Sentry
    this.sentryService.trackMetric({
      name: 'system.memory.heap_used',
      value: Math.round(memUsage.heapUsed / 1024 / 1024),
      tags: { unit: 'MB', type: 'system' },
    });

    this.sentryService.trackMetric({
      name: 'system.memory.rss',
      value: Math.round(memUsage.rss / 1024 / 1024),
      tags: { unit: 'MB', type: 'system' },
    });

    this.sentryService.trackMetric({
      name: 'system.process.uptime',
      value: process.uptime(),
      tags: { unit: 'seconds', type: 'system' },
    });

    // Alert on high memory usage
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 1024) {
      // > 1GB
      this.sentryService.captureMessage('High memory usage detected', 'warning');
    }

    this.logger.debug(
      `System metrics collected: Heap ${Math.round(heapUsedMB)}MB, Uptime ${Math.round(process.uptime())}s`,
    );
  }

  /**
   * Collect business-level metrics
   */
  private async collectBusinessMetrics(): Promise<void> {
    // This would typically query your database for business metrics
    // For now, we'll create placeholder structure

    const metrics: Partial<BusinessMetrics> = {
      users: {
        total: 0, // TODO: Query from database
        active: 0,
        newToday: 0,
      },
      studySessions: {
        total: 0,
        completedToday: 0,
        averageDuration: 0,
      },
      tasks: {
        total: 0,
        completedToday: 0,
        overdue: 0,
      },
      aiInteractions: {
        total: 0,
        todayCount: 0,
        averageResponseTime: 0,
        successRate: 0,
      },
    };

    this.businessMetrics = metrics;

    // Track business metrics with Sentry
    if (metrics.users) {
      this.sentryService.trackMetric({
        name: 'business.users.total',
        value: metrics.users.total,
        tags: { type: 'business' },
      });

      this.sentryService.trackMetric({
        name: 'business.users.active',
        value: metrics.users.active,
        tags: { type: 'business' },
      });
    }

    this.logger.debug('Business metrics collected');
  }

  /**
   * Track API request metrics
   */
  trackAPIRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ): void {
    this.sentryService.trackAPIRequest({
      endpoint,
      method,
      statusCode,
      duration,
    });

    // Track additional metrics
    this.sentryService.trackMetric({
      name: `api.request.${method.toLowerCase()}`,
      value: duration,
      tags: {
        endpoint: this.sanitizeEndpoint(endpoint),
        status: statusCode.toString(),
        type: 'api',
      },
    });

    // Track error rates
    if (statusCode >= 400) {
      this.sentryService.trackMetric({
        name: 'api.errors.count',
        value: 1,
        tags: {
          endpoint: this.sanitizeEndpoint(endpoint),
          status: statusCode.toString(),
          type: 'error',
        },
      });
    }
  }

  /**
   * Track database query metrics
   */
  trackDatabaseQuery(
    query: string,
    table: string,
    operation: string,
    duration: number,
    rowsAffected?: number,
  ): void {
    this.sentryService.trackDatabaseOperation({
      query,
      table,
      operation,
      duration,
      rowsAffected,
    });

    // Track additional database metrics
    this.sentryService.trackMetric({
      name: `db.query.${operation}`,
      value: duration,
      tags: {
        table,
        operation,
        type: 'database',
      },
    });

    if (rowsAffected !== undefined) {
      this.sentryService.trackMetric({
        name: `db.rows_affected.${operation}`,
        value: rowsAffected,
        tags: {
          table,
          operation,
          type: 'database',
        },
      });
    }
  }

  /**
   * Track AI operation metrics
   */
  trackAIOperation(
    operation: string,
    provider: string,
    duration: number,
    success: boolean,
    tokenUsage?: { prompt: number; completion: number; total: number },
  ): void {
    this.sentryService.trackAIOperation(operation, provider, duration, success, {
      tokenUsage,
    });

    // Track token usage if available
    if (tokenUsage) {
      this.sentryService.trackMetric({
        name: `ai.tokens.${operation}`,
        value: tokenUsage.total,
        tags: {
          provider,
          operation,
          type: 'ai_tokens',
        },
      });
    }

    // Track AI success rate
    this.sentryService.trackMetric({
      name: `ai.success_rate.${operation}`,
      value: success ? 1 : 0,
      tags: {
        provider,
        operation,
        type: 'ai_success',
      },
    });
  }

  /**
   * Track authentication metrics
   */
  trackAuthEvent(
    event: string,
    userId?: string,
    success: boolean = true,
    metadata?: Record<string, any>,
  ): void {
    this.sentryService.trackAuthEvent(event, userId, undefined, {
      success,
      ...metadata,
    });

    // Track auth success/failure rates
    this.sentryService.trackMetric({
      name: `auth.${event}.count`,
      value: 1,
      tags: {
        success: success.toString(),
        type: 'auth',
      },
    });
  }

  /**
   * Track study session metrics
   */
  trackStudySession(
    event: 'created' | 'started' | 'paused' | 'resumed' | 'completed' | 'cancelled',
    sessionId: string,
    userId: string,
    duration?: number,
    metadata?: Record<string, any>,
  ): void {
    this.sentryService.trackStudySession(event, sessionId, userId, metadata);

    if (duration !== undefined) {
      this.sentryService.trackMetric({
        name: `study.session.${event}.duration`,
        value: duration,
        tags: {
          event,
          type: 'study_session',
        },
      });
    }

    // Track study session events
    this.sentryService.trackMetric({
      name: `study.session.${event}.count`,
      value: 1,
      tags: {
        event,
        type: 'study_session',
      },
    });
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): Partial<SystemMetrics> {
    return { ...this.systemMetrics };
  }

  /**
   * Get current business metrics
   */
  getBusinessMetrics(): Partial<BusinessMetrics> {
    return { ...this.businessMetrics };
  }

  /**
   * Get comprehensive health check data
   */
  getHealthCheckData(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      system: this.systemMetrics,
      business: this.businessMetrics,
    };
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.logger.log('Metrics collection stopped');
    }
  }

  // Helper methods
  private getTotalMemory(): number {
    try {
      const os = require('os');
      return os.totalmem();
    } catch {
      return 0;
    }
  }

  private getCPUUsage(): number {
    // Simplified CPU usage - in production, you'd want more sophisticated monitoring
    try {
      const os = require('os');
      const cpus = os.cpus();
      return cpus.length; // Placeholder
    } catch {
      return 0;
    }
  }

  private getLoadAverage(): number[] {
    try {
      const os = require('os');
      return os.loadavg();
    } catch {
      return [0, 0, 0];
    }
  }

  private sanitizeEndpoint(endpoint: string): string {
    // Remove IDs and dynamic parts from endpoint for better grouping
    return endpoint
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId');
  }
}
