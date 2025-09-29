import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import * as Sentry from '@sentry/nestjs';
import { startSpan } from '@sentry/nestjs';
import { Request, Response } from 'express';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    // Set user context if available
    const user = (request as any).user;
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful requests
        this.logger.log(
          `${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userAgent}`,
        );

        // Add breadcrumb for successful request
        Sentry.addBreadcrumb({
          message: `API Request: ${method} ${url}`,
          level: 'info',
          data: {
            method,
            url,
            statusCode,
            duration,
            ip,
            userAgent,
          },
        });

        // Alert on slow requests (>500ms for API endpoints)
        if (duration > 500) {
          Sentry.addBreadcrumb({
            message: `Slow API request detected: ${method} ${url}`,
            level: 'warning',
            data: {
              method,
              url,
              duration,
              statusCode,
            },
          });
        }

        // Alert on 4xx/5xx status codes
        if (statusCode >= 400) {
          Sentry.addBreadcrumb({
            message: `API error response: ${method} ${url}`,
            level: statusCode >= 500 ? 'error' : 'warning',
            data: {
              method,
              url,
              statusCode,
              duration,
            },
          });
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;

        // Log error requests
        this.logger.error(
          `${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${userAgent} - ${error.message}`,
          error.stack,
        );

        // Capture exception with context
        Sentry.withScope((scope) => {
          scope.setContext('http', {
            method,
            url,
            user_agent: userAgent,
            ip,
            statusCode,
            duration,
          });

          scope.setTag('api_error', true);
          scope.setLevel('error');

          if (user) {
            scope.setUser({
              id: user.id,
              email: user.email,
            });
          }

          Sentry.captureException(error);
        });

        return throwError(() => error);
      }),
      finalize(() => {
        // Clear user context for next request
        Sentry.setUser(null);
      }),
    );
  }
}

// Custom decorator for tracking specific operations
export function TrackPerformance(operationName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return startSpan(
        {
          name: `${target.constructor.name}.${propertyKey}`,
          op: operationName,
        },
        async (span) => {
          try {
            const result = await originalMethod.apply(this, args);
            span?.setStatus({ code: 1 }); // OK status
            return result;
          } catch (error) {
            span?.setStatus({ code: 2 }); // ERROR status
            Sentry.captureException(error);
            throw error;
          }
        },
      );
    };

    return descriptor;
  };
}

// Database operation tracking decorator
export function TrackDatabaseOperation(tableName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return startSpan(
        {
          name: `DB: ${tableName || 'unknown'}.${propertyKey}`,
          op: 'db.query',
        },
        async (span) => {
          const startTime = Date.now();

          try {
            const result = await originalMethod.apply(this, args);
            const duration = Date.now() - startTime;

            span?.setStatus({ code: 1 }); // OK status
            span?.setAttribute('duration', duration);

            // Alert on slow database queries (>100ms)
            if (duration > 100) {
              Sentry.addBreadcrumb({
                message: `Slow database query: ${tableName}.${propertyKey}`,
                level: 'warning',
                data: {
                  table: tableName,
                  operation: propertyKey,
                  duration,
                },
              });
            }

            return result;
          } catch (error) {
            span?.setStatus({ code: 2 }); // ERROR status
            Sentry.captureException(error);
            throw error;
          }
        },
      );
    };

    return descriptor;
  };
}

// AI operation tracking decorator
export function TrackAIOperation(operationType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return startSpan(
        {
          name: `AI: ${operationType}`,
          op: 'ai.operation',
        },
        async (span) => {
          const startTime = Date.now();

          try {
            const result = await originalMethod.apply(this, args);
            const duration = Date.now() - startTime;

            span?.setStatus({ code: 1 }); // OK status
            span?.setAttribute('duration', duration);
            span?.setAttribute('operation_type', operationType);

            // Track AI operation metrics
            Sentry.addBreadcrumb({
              message: `AI operation completed: ${operationType}`,
              level: 'info',
              data: {
                operationType,
                duration,
                success: true,
              },
            });

            // Alert on slow AI operations (>5000ms)
            if (duration > 5000) {
              Sentry.addBreadcrumb({
                message: `Slow AI operation: ${operationType}`,
                level: 'warning',
                data: {
                  operationType,
                  duration,
                },
              });
            }

            return result;
          } catch (error) {
            const duration = Date.now() - startTime;

            span?.setStatus({ code: 2 }); // ERROR status
            span?.setAttribute('error.message', error.message);

            // Track AI operation failures
            Sentry.withScope((scope) => {
              scope.setTag('ai_operation', operationType);
              scope.setLevel('error');
              scope.setContext('ai_operation', {
                type: operationType,
                duration,
                success: false,
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
