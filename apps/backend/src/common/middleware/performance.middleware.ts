import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsProvider } from '../providers/metrics.provider';
import { SentryService } from '../../sentry/sentry.service';

interface PerformanceRequest extends Request {
  startTime?: number;
  requestId?: string;
}

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  constructor(
    private readonly metricsProvider: MetricsProvider,
    private readonly sentryService: SentryService,
  ) {}

  use(req: PerformanceRequest, res: Response, next: NextFunction): void {
    // Add request ID for tracking
    req.requestId = this.generateRequestId();
    req.startTime = Date.now();

    // Set request context in Sentry
    this.sentryService.setContext('request', {
      id: req.requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    // Track request start
    this.sentryService.setTag('request_id', req.requestId);

    // Override res.end to capture metrics when response is sent
    const originalEnd = res.end;
    const middleware = this;
    res.end = function (this: Response, ...args: any[]) {
      try {
        const duration = Date.now() - (req.startTime || Date.now());
        const statusCode = res.statusCode;

        // Track API request metrics
        if (req.startTime) {
          middleware.trackRequestMetrics(req, res, duration);
        }

        // Log request completion
        middleware.logRequestCompletion(req, res, duration);

        // Track performance issues
        middleware.checkPerformanceThresholds(req, res, duration);
      } catch (error) {
        middleware.logger.error('Error in performance middleware:', error);
      }

      // Call original end method
      return originalEnd.apply(this, args);
    };

    next();
  }

  private trackRequestMetrics(req: PerformanceRequest, res: Response, duration: number): void {
    const userId = (req as any).user?.id;

    // Track with metrics provider
    this.metricsProvider.trackAPIRequest(
      req.route?.path || req.url,
      req.method,
      res.statusCode,
      duration,
      userId,
    );

    // Track additional performance metrics
    this.sentryService.trackMetric({
      name: 'api.request.duration',
      value: duration,
      tags: {
        method: req.method,
        status: res.statusCode.toString(),
        endpoint: this.sanitizeEndpoint(req.url),
        authenticated: userId ? 'true' : 'false',
      },
    });

    // Track response size if available
    const contentLength = res.get('Content-Length');
    if (contentLength) {
      this.sentryService.trackMetric({
        name: 'api.response.size',
        value: parseInt(contentLength, 10),
        tags: {
          method: req.method,
          endpoint: this.sanitizeEndpoint(req.url),
          unit: 'bytes',
        },
      });
    }

    // Track user activity
    if (userId) {
      this.sentryService.trackMetric({
        name: 'user.activity.request',
        value: 1,
        tags: {
          userId,
          method: req.method,
          endpoint: this.sanitizeEndpoint(req.url),
        },
      });
    }
  }

  private logRequestCompletion(req: PerformanceRequest, res: Response, duration: number): void {
    const logLevel = this.getLogLevel(res.statusCode, duration);
    const logMessage = `${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`;

    switch (logLevel) {
      case 'error':
        this.logger.error(logMessage);
        break;
      case 'warn':
        this.logger.warn(logMessage);
        break;
      case 'debug':
        this.logger.debug(logMessage);
        break;
      default:
        this.logger.log(logMessage);
    }
  }

  private checkPerformanceThresholds(
    req: PerformanceRequest,
    res: Response,
    duration: number,
  ): void {
    const thresholds = {
      slow: 1000, // 1 second
      verySlow: 5000, // 5 seconds
      critical: 10000, // 10 seconds
    };

    if (duration > thresholds.critical) {
      this.sentryService.captureMessage(
        `Critical slow API request: ${req.method} ${req.url} took ${duration}ms`,
        'error',
      );
    } else if (duration > thresholds.verySlow) {
      this.sentryService.captureMessage(
        `Very slow API request: ${req.method} ${req.url} took ${duration}ms`,
        'warning',
      );
    } else if (duration > thresholds.slow) {
      this.sentryService.captureMessage(
        `Slow API request: ${req.method} ${req.url} took ${duration}ms`,
        'info',
      );
    }

    // Track performance threshold breaches
    if (duration > thresholds.slow) {
      this.sentryService.trackMetric({
        name: 'api.performance.slow_request',
        value: 1,
        tags: {
          threshold:
            duration > thresholds.critical
              ? 'critical'
              : duration > thresholds.verySlow
                ? 'very_slow'
                : 'slow',
          method: req.method,
          endpoint: this.sanitizeEndpoint(req.url),
        },
      });
    }

    // Track error responses
    if (res.statusCode >= 400) {
      this.sentryService.trackMetric({
        name: 'api.errors.response',
        value: 1,
        tags: {
          status: res.statusCode.toString(),
          method: req.method,
          endpoint: this.sanitizeEndpoint(req.url),
          category: res.statusCode >= 500 ? 'server_error' : 'client_error',
        },
      });
    }
  }

  private getLogLevel(statusCode: number, duration: number): string {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (duration > 5000) return 'warn';
    if (duration > 1000) return 'debug';
    return 'log';
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeEndpoint(url: string): string {
    // Remove query parameters and sanitize dynamic segments
    const cleanUrl = url.split('?')[0];
    return cleanUrl
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId')
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
  }
}

/**
 * Performance monitoring decorator for methods
 */
export function TrackMethodPerformance(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = propertyKey;
    const operation = operationName || `${className}.${methodName}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const logger = new Logger(`${className}.${methodName}`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Log method completion
        logger.debug(`${operation} completed in ${duration}ms`);

        // Track performance if method is slow
        if (duration > 100) {
          logger.warn(`Slow method execution: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`${operation} failed after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Database performance tracking decorator
 */
export function TrackDatabasePerformance(tableName?: string, operation?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = propertyKey;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const logger = new Logger(`${className}.${methodName}`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Track database operation
        if (this.metricsProvider) {
          this.metricsProvider.trackDatabaseQuery(
            methodName,
            tableName || 'unknown',
            operation || 'query',
            duration,
            Array.isArray(result) ? result.length : undefined,
          );
        }

        // Log slow database operations
        if (duration > 500) {
          logger.warn(`Slow database operation: ${tableName}.${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Database operation failed: ${tableName}.${operation} after ${duration}ms:`,
          error,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * AI operation performance tracking decorator
 */
export function TrackAIPerformance(operation: string, provider: string = 'openai') {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = propertyKey;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const logger = new Logger(`${className}.${methodName}`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Track AI operation
        if (this.metricsProvider) {
          this.metricsProvider.trackAIOperation(
            operation,
            provider,
            duration,
            true,
            result?.usage || undefined,
          );
        }

        // Log AI operation completion
        logger.log(`AI operation completed: ${operation} in ${duration}ms`);

        // Alert on very slow AI operations
        if (duration > 30000) {
          logger.warn(`Very slow AI operation: ${operation} took ${duration}ms`);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Track failed AI operation
        if (this.metricsProvider) {
          this.metricsProvider.trackAIOperation(operation, provider, duration, false);
        }

        logger.error(`AI operation failed: ${operation} after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
