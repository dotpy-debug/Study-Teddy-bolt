import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
// Integrations removed - deprecated

export interface CustomMetric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface DatabaseMetrics {
  query: string;
  duration: number;
  table?: string;
  operation?: string;
  rowsAffected?: number;
}

export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private isInitialized = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeSentry();
  }

  private initializeSentry() {
    if (this.isInitialized) {
      return;
    }

    const dsn = this.configService.get('SENTRY_DSN');
    const environment = this.configService.get('NODE_ENV', 'development');
    const release = this.configService.get('SENTRY_RELEASE');

    if (!dsn) {
      this.logger.warn('Sentry DSN not configured, skipping initialization');
      return;
    }

    try {
      Sentry.init({
        dsn,
        environment,
        release,

        // Performance monitoring
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // Enhanced integrations
        integrations: [
          // HTTP request tracking
          new Sentry.Integrations.Http({ tracing: true }),

          // Database query tracking
          new Sentry.Integrations.Postgres(),

          // Node.js profiling
          nodeProfilingIntegration(),

          // Enhanced error context
          // ExtraErrorData removed - deprecated

          // Console logs capture
          // CaptureConsole removed - deprecated

          // Memory usage tracking
          // LocalVariables removed - deprecated
        ],

        // Error filtering
        beforeSend: (event, hint) => {
          // Filter out development noise
          if (environment === 'development') {
            this.logger.debug('Sentry event:', event);
          }

          // Filter out health check errors
          if (event.request?.url?.includes('/health')) {
            return null;
          }

          // Filter out bot traffic
          if (event.request?.headers?.['user-agent']?.includes('bot')) {
            return null;
          }

          // Filter out common non-critical errors
          const errorMessage = event.exception?.values?.[0]?.value || '';
          if (this.isNonCriticalError(errorMessage)) {
            return null;
          }

          return event;
        },

        // Transaction filtering
        beforeSendTransaction: (event) => {
          // Filter out health check transactions
          if (event.transaction?.includes('/health')) {
            return null;
          }

          return event;
        },

        // Default tags
        initialScope: {
          tags: {
            component: 'backend',
            app: 'studyteddy',
            runtime: 'nodejs',
          },
        },
      });

      this.isInitialized = true;
      this.logger.log('Sentry initialized successfully');

      // Set up periodic memory monitoring
      this.startMemoryMonitoring();
    } catch (error) {
      this.logger.error('Failed to initialize Sentry:', error);
    }
  }

  private isNonCriticalError(message: string): boolean {
    const nonCriticalPatterns = [
      'ECONNRESET',
      'EPIPE',
      'Client disconnected',
      'Request aborted',
      'Connection terminated',
    ];

    return nonCriticalPatterns.some((pattern) =>
      message.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  private startMemoryMonitoring() {
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        this.trackMemoryUsage();
      }, 60000); // Every minute
    }
  }

  // Public API methods

  /**
   * Track custom metrics
   */
  trackMetric(metric: CustomMetric) {
    Sentry.withScope((scope) => {
      if (metric.tags) {
        Object.entries(metric.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      scope.setContext('metric', {
        name: metric.name,
        value: metric.value,
        timestamp: metric.timestamp || new Date(),
      });

      Sentry.addBreadcrumb({
        message: `Metric: ${metric.name}`,
        level: 'info',
        category: 'metric',
        data: {
          name: metric.name,
          value: metric.value,
          tags: metric.tags,
        },
      });
    });
  }

  /**
   * Track database operations
   */
  trackDatabaseOperation(metrics: DatabaseMetrics) {
    Sentry.withScope((scope) => {
      scope.setTag('db.table', metrics.table || 'unknown');
      scope.setTag('db.operation', metrics.operation || 'unknown');

      scope.setContext('database', {
        query: metrics.query.substring(0, 500), // Truncate for privacy
        duration: metrics.duration,
        table: metrics.table,
        operation: metrics.operation,
        rowsAffected: metrics.rowsAffected,
      });

      const level = metrics.duration > 1000 ? 'warning' : 'info';

      Sentry.addBreadcrumb({
        message: `DB Query: ${metrics.table || 'unknown'}`,
        level,
        category: 'query',
        data: {
          duration: metrics.duration,
          table: metrics.table,
          operation: metrics.operation,
          rowsAffected: metrics.rowsAffected,
        },
      });

      // Alert on very slow queries
      if (metrics.duration > 5000) {
        Sentry.captureMessage(
          `Very slow database query: ${metrics.table}`,
          'warning',
        );
      }
    });
  }

  /**
   * Track API request metrics
   */
  trackAPIRequest(metrics: APIMetrics) {
    Sentry.withScope((scope) => {
      scope.setTag('api.endpoint', metrics.endpoint);
      scope.setTag('api.method', metrics.method);
      scope.setTag('api.status', metrics.statusCode.toString());

      scope.setContext('api', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: metrics.statusCode,
        duration: metrics.duration,
        userAgent: metrics.userAgent,
        ip: metrics.ip,
      });

      const level =
        metrics.statusCode >= 500
          ? 'error'
          : metrics.statusCode >= 400
            ? 'warning'
            : metrics.duration > 1000
              ? 'warning'
              : 'info';

      Sentry.addBreadcrumb({
        message: `API: ${metrics.method.toUpperCase()} ${metrics.endpoint}`,
        level,
        category: 'http',
        data: {
          method: metrics.method,
          endpoint: metrics.endpoint,
          statusCode: metrics.statusCode,
          duration: metrics.duration,
        },
      });

      // Alert on API issues
      if (metrics.statusCode >= 500) {
        Sentry.captureMessage(
          `API error: ${metrics.method} ${metrics.endpoint}`,
          'error',
        );
      } else if (metrics.duration > 5000) {
        Sentry.captureMessage(
          `Slow API request: ${metrics.method} ${metrics.endpoint}`,
          'warning',
        );
      }
    });
  }

  /**
   * Track AI operations
   */
  trackAIOperation(
    operation: string,
    provider: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>,
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('ai.provider', provider);
      scope.setTag('ai.operation', operation);
      scope.setTag('ai.success', success.toString());

      scope.setContext('ai_operation', {
        operation,
        provider,
        duration,
        success,
        metadata,
      });

      const level = success ? 'info' : 'error';

      Sentry.addBreadcrumb({
        message: `AI Operation: ${operation}`,
        level,
        category: 'ai',
        data: {
          operation,
          provider,
          duration,
          success,
          metadata,
        },
      });

      // Alert on AI operation issues
      if (!success) {
        Sentry.captureMessage(`AI operation failed: ${operation}`, 'error');
      } else if (duration > 30000) {
        Sentry.captureMessage(
          `Very slow AI operation: ${operation}`,
          'warning',
        );
      }
    });
  }

  /**
   * Track authentication events
   */
  trackAuthEvent(
    event: string,
    userId?: string,
    email?: string,
    metadata?: Record<string, any>,
  ) {
    Sentry.withScope((scope) => {
      if (userId) {
        scope.setUser({ id: userId, email });
      }

      scope.setTag('auth.event', event);
      scope.setContext('auth', {
        event,
        userId,
        email,
        metadata,
      });

      const level =
        event.includes('failed') || event.includes('error') ? 'error' : 'info';

      Sentry.addBreadcrumb({
        message: `Auth Event: ${event}`,
        level,
        category: 'auth',
        data: {
          event,
          userId,
          email,
          metadata,
        },
      });

      // Alert on critical auth events
      if (event.includes('failed') || event.includes('breach')) {
        Sentry.captureMessage(`Authentication issue: ${event}`, 'warning');
      }
    });
  }

  /**
   * Track study session events
   */
  trackStudySession(
    event:
      | 'created'
      | 'started'
      | 'paused'
      | 'resumed'
      | 'completed'
      | 'cancelled',
    sessionId: string,
    userId: string,
    metadata?: Record<string, any>,
  ) {
    Sentry.withScope((scope) => {
      scope.setUser({ id: userId });
      scope.setTag('study.event', event);
      scope.setTag('study.session_id', sessionId);

      scope.setContext('study_session', {
        event,
        sessionId,
        userId,
        metadata,
      });

      Sentry.addBreadcrumb({
        message: `Study Session: ${event}`,
        level: 'info',
        category: 'study',
        data: {
          event,
          sessionId,
          userId,
          metadata,
        },
      });
    });
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage() {
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      };

      this.trackMetric({
        name: 'memory.heap_used',
        value: usageInMB.heapUsed,
        tags: { unit: 'MB' },
      });

      this.trackMetric({
        name: 'memory.rss',
        value: usageInMB.rss,
        tags: { unit: 'MB' },
      });

      // Alert on high memory usage
      if (usageInMB.heapUsed > 2048) {
        Sentry.captureMessage('Very high memory usage detected', 'warning');
      } else if (usageInMB.heapUsed > 1024) {
        Sentry.captureMessage('High memory usage detected', 'info');
      }
    }
  }

  /**
   * Set user context
   */
  setUserContext(user: { id: string; email?: string; [key: string]: any }) {
    Sentry.setUser(user);
  }

  /**
   * Add custom tag
   */
  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }

  /**
   * Add custom context
   */
  setContext(key: string, context: Record<string, any>) {
    Sentry.setContext(key, context);
  }

  /**
   * Capture custom exception
   */
  captureException(exception: any, context?: Record<string, any>) {
    if (context) {
      Sentry.withScope((scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
        Sentry.captureException(exception);
      });
    } else {
      Sentry.captureException(exception);
    }
  }

  /**
   * Capture custom message
   */
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' = 'info',
  ) {
    Sentry.captureMessage(message, level);
  }

  /**
   * Start a performance transaction
   */
  startTransaction(name: string, operation: string) {
    return Sentry.startTransaction({
      name,
      op: operation,
    });
  }

  /**
   * Get current hub
   */
  getCurrentHub() {
    return Sentry.getCurrentHub();
  }

  /**
   * Check if Sentry is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
