import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { SentryService } from '../../sentry/sentry.service';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  constructor(private readonly sentryService: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine the status code
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let validationErrors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || 'An error occurred';
        validationErrors = responseObj.details || responseObj.validationErrors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Prepare error context
    const errorContext = {
      url: request.url,
      method: request.method,
      params: request.params,
      query: request.query,
      body: this.sanitizeBody(request.body),
      headers: this.sanitizeHeaders(request.headers),
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      user: (request as any).user,
      timestamp: new Date().toISOString(),
      statusCode: status,
      validationErrors,
    };

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // Only capture certain types of errors with Sentry
    if (this.shouldCaptureError(status, exception)) {
      this.captureErrorWithSentry(exception, errorContext, request);
    }

    // Prepare the response
    const errorResponse = {
      statusCode: status,
      message,
      error: HttpStatus[status] || 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(validationErrors && { validationErrors }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Track API metrics
    if (this.sentryService.isReady()) {
      this.sentryService.trackAPIRequest({
        endpoint: request.url,
        method: request.method,
        statusCode: status,
        duration: Date.now() - (request as any).startTime || 0,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      });
    }

    response.status(status).json(errorResponse);
  }

  private shouldCaptureError(status: number, exception: unknown): boolean {
    // Don't capture client errors (4xx) except for authentication issues
    if (status >= 400 && status < 500) {
      return status === 401 || status === 403; // Only auth errors
    }

    // Always capture server errors (5xx)
    if (status >= 500) {
      return true;
    }

    // Capture uncaught exceptions
    if (!(exception instanceof HttpException)) {
      return true;
    }

    return false;
  }

  private captureErrorWithSentry(exception: unknown, context: any, request: Request): void {
    Sentry.withScope((scope) => {
      // Set user context
      if (context.user) {
        scope.setUser({
          id: context.user.id,
          email: context.user.email,
          username: context.user.username,
        });
      }

      // Set request context
      scope.setContext('request', {
        url: context.url,
        method: context.method,
        query: context.query,
        params: context.params,
        headers: context.headers,
        userAgent: context.userAgent,
        ip: context.ip,
      });

      // Set HTTP context
      scope.setContext('http', {
        url: context.url,
        method: context.method,
        status_code: context.statusCode,
        user_agent: context.userAgent,
      });

      // Set additional context
      scope.setContext('error_details', {
        timestamp: context.timestamp,
        validationErrors: context.validationErrors,
      });

      // Set tags
      scope.setTag('error.type', exception instanceof HttpException ? 'http' : 'unhandled');
      scope.setTag('error.status', context.statusCode.toString());
      scope.setTag('api.endpoint', context.url);
      scope.setTag('api.method', context.method);

      // Set level based on status code
      if (context.statusCode >= 500) {
        scope.setLevel('error');
      } else if (context.statusCode >= 400) {
        scope.setLevel('warning');
      } else {
        scope.setLevel('info');
      }

      // Add breadcrumb
      Sentry.addBreadcrumb({
        message: `HTTP ${context.method} ${context.url}`,
        level: 'error',
        category: 'http',
        data: {
          method: context.method,
          url: context.url,
          status_code: context.statusCode,
        },
      });

      // Capture the exception
      Sentry.captureException(exception);
    });
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = [
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

    const sanitized = { ...body };

    const sanitizeObject = (obj: any, maxDepth = 3, currentDepth = 0): any => {
      if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
        return obj;
      }

      const result: any = {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
      'x-csrf-token',
    ];

    const sanitized = { ...headers };

    for (const [key, value] of Object.entries(sanitized)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
