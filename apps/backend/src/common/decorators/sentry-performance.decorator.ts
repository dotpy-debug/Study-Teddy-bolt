import { SetMetadata } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { startSpan } from '@sentry/nestjs';

// Metadata key for Sentry tracking
export const SENTRY_TRACK_KEY = 'sentry_track';

export interface SentryTrackOptions {
  operation: string;
  description?: string;
  tags?: Record<string, string>;
  trackArgs?: boolean;
  trackResult?: boolean;
  alertThreshold?: number; // milliseconds
}

/**
 * Decorator to track method performance with Sentry
 */
export function SentryTrack(options: SentryTrackOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = propertyKey;
    const spanName = options.description || `${className}.${methodName}`;

    // Set metadata for the interceptor
    SetMetadata(SENTRY_TRACK_KEY, options)(target, propertyKey, descriptor);

    descriptor.value = async function (...args: any[]) {
      return startSpan(
        {
          name: spanName,
          op: options.operation,
          attributes: {
            class: className,
            method: methodName,
            ...options.tags,
          },
        },
        async (span) => {
          const startTime = Date.now();

          try {
            // Add arguments to span if enabled
            if (options.trackArgs && args.length > 0) {
              span?.setAttributes({
                arguments: JSON.stringify(sanitizeArgs(args)),
              });
            }

            // Execute the original method
            const result = await originalMethod.apply(this, args);
            const duration = Date.now() - startTime;

            // Add result to span if enabled and not too large
            if (options.trackResult && result !== undefined) {
              const sanitizedResult = sanitizeResult(result);
              if (JSON.stringify(sanitizedResult).length < 1000) {
                span?.setAttributes({
                  result: JSON.stringify(sanitizedResult),
                });
              }
            }

            // Set success status
            span?.setStatus({ code: 1 }); // OK status
            span?.setAttributes({ duration });

            // Add breadcrumb for the operation
            Sentry.addBreadcrumb({
              message: `${options.operation}: ${spanName}`,
              level: 'info',
              category: options.operation,
              data: {
                duration,
                success: true,
                class: className,
                method: methodName,
              },
            });

            // Alert on slow operations
            if (options.alertThreshold && duration > options.alertThreshold) {
              Sentry.addBreadcrumb({
                message: `Slow operation detected: ${spanName}`,
                level: 'warning',
                category: 'performance',
                data: {
                  duration,
                  threshold: options.alertThreshold,
                  class: className,
                  method: methodName,
                },
              });
            }

            return result;
          } catch (error) {
            const duration = Date.now() - startTime;

            // Set error status
            span?.setStatus({ code: 2 }); // ERROR status
            span?.setAttributes({ error: error.message });
            span?.setAttributes({ duration });

            // Add error breadcrumb
            Sentry.addBreadcrumb({
              message: `${options.operation} failed: ${spanName}`,
              level: 'error',
              category: options.operation,
              data: {
                duration,
                error: error.message,
                class: className,
                method: methodName,
              },
            });

            // Capture the exception with context
            Sentry.withScope((scope) => {
              scope.setTag('operation', options.operation);
              scope.setTag('class', className);
              scope.setTag('method', methodName);
              scope.setContext('method_execution', {
                class: className,
                method: methodName,
                operation: options.operation,
                duration,
                args: options.trackArgs ? sanitizeArgs(args) : undefined,
              });
              Sentry.captureException(error);
            });

            throw error;
          }
        },
      );
    };

    return descriptor;
  };
}

/**
 * Decorator specifically for database operations
 */
export function SentryTrackDatabase(tableName?: string, operation?: string) {
  return SentryTrack({
    operation: 'db.query',
    description: `DB: ${tableName || 'unknown'}.${operation || 'query'}`,
    tags: {
      'db.table': tableName || 'unknown',
      'db.operation': operation || 'query',
    },
    alertThreshold: 1000, // 1 second for database operations
  });
}

/**
 * Decorator specifically for API operations
 */
export function SentryTrackAPI(endpoint?: string, method?: string) {
  return SentryTrack({
    operation: 'http.server',
    description: `API: ${method?.toUpperCase() || 'REQUEST'} ${endpoint || 'endpoint'}`,
    tags: {
      'api.endpoint': endpoint || 'unknown',
      'api.method': method || 'unknown',
    },
    alertThreshold: 5000, // 5 seconds for API operations
  });
}

/**
 * Decorator specifically for AI operations
 */
export function SentryTrackAI(operationType: string, provider?: string) {
  return SentryTrack({
    operation: 'ai.operation',
    description: `AI: ${operationType}`,
    tags: {
      'ai.operation': operationType,
      'ai.provider': provider || 'unknown',
    },
    alertThreshold: 30000, // 30 seconds for AI operations
  });
}

/**
 * Decorator specifically for authentication operations
 */
export function SentryTrackAuth(operation: string) {
  return SentryTrack({
    operation: 'auth.operation',
    description: `Auth: ${operation}`,
    tags: {
      'auth.operation': operation,
    },
    alertThreshold: 2000, // 2 seconds for auth operations
    trackArgs: false, // Don't track args for security
    trackResult: false, // Don't track result for security
  });
}

/**
 * Decorator specifically for background jobs
 */
export function SentryTrackJob(jobName: string, queue?: string) {
  return SentryTrack({
    operation: 'job.execute',
    description: `Job: ${jobName}`,
    tags: {
      'job.name': jobName,
      'job.queue': queue || 'default',
    },
    alertThreshold: 60000, // 1 minute for background jobs
  });
}

/**
 * Decorator for external service calls
 */
export function SentryTrackExternalAPI(serviceName: string, operation?: string) {
  return SentryTrack({
    operation: 'http.client',
    description: `External API: ${serviceName}${operation ? ` (${operation})` : ''}`,
    tags: {
      'external.service': serviceName,
      'external.operation': operation || 'unknown',
    },
    alertThreshold: 10000, // 10 seconds for external API calls
  });
}

// Helper functions
function sanitizeArgs(args: any[]): any[] {
  return args.map((arg) => sanitizeValue(arg));
}

function sanitizeResult(result: any): any {
  return sanitizeValue(result);
}

function sanitizeValue(value: any, maxDepth = 3, currentDepth = 0): any {
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Truncate long strings
    return value.length > 200 ? `${value.substring(0, 200)}...` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    // Limit array size
    const limit = 10;
    const sanitized = value
      .slice(0, limit)
      .map((item) => sanitizeValue(item, maxDepth, currentDepth + 1));
    if (value.length > limit) {
      sanitized.push(`[... ${value.length - limit} more items]`);
    }
    return sanitized;
  }

  if (typeof value === 'object') {
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'csrf',
      'api_key',
      'access_token',
      'refresh_token',
    ];

    const sanitized: any = {};
    let keyCount = 0;
    const maxKeys = 20;

    for (const [key, val] of Object.entries(value)) {
      if (keyCount >= maxKeys) {
        sanitized['[truncated]'] = `... ${Object.keys(value).length - maxKeys} more properties`;
        break;
      }

      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val, maxDepth, currentDepth + 1);
      }
      keyCount++;
    }

    return sanitized;
  }

  // For functions, classes, etc.
  return `[${typeof value}]`;
}

// SENTRY_TRACK_KEY is already exported at the top of the file
