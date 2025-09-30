import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import { ThrottlerException } from '@nestjs/throttler';
import { LogSanitizer } from '../utils/log-sanitizer.util';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

interface OpenAIError extends Error {
  status?: number;
  code?: string;
  type?: string;
}

// Drizzle database error interface
interface DrizzleDatabaseError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
  column?: string;
  query?: string;
  parameters?: unknown[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract or generate request ID for tracking
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const errorResponse = this.buildErrorResponse(exception, request, requestId);

    // Log error with context
    this.logError(exception, request, requestId, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
    requestId: string,
  ): ErrorResponse {
    const baseResponse: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Internal server error',
      error: 'Internal Server Error',
      requestId,
    };

    // Handle HTTP Exceptions (NestJS)
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, baseResponse);
    }

    // Handle Database Errors (Drizzle ORM)
    if (this.isDatabaseError(exception)) {
      return this.handleDatabaseError(exception as DrizzleDatabaseError, baseResponse);
    }

    // Handle Validation Errors
    if (this.isValidationError(exception)) {
      return this.handleValidationError(exception, baseResponse);
    }

    // Handle Rate Limiting Errors
    if (exception instanceof ThrottlerException) {
      return this.handleThrottlerError(exception, baseResponse);
    }

    // Handle OpenAI API Errors
    if (this.isOpenAIError(exception)) {
      return this.handleOpenAIError(exception as OpenAIError, baseResponse);
    }

    // Handle Generic Errors
    if (exception instanceof Error) {
      return this.handleGenericError(exception, baseResponse);
    }

    // Handle Unknown Errors - never expose raw exception in production
    return {
      ...baseResponse,
      message: 'An unexpected error occurred',
      // Never expose raw exception data, even in development
    };
  }

  private handleHttpException(
    exception: HttpException,
    baseResponse: ErrorResponse,
  ): ErrorResponse {
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    let message: string | string[] = exception.message;
    let error = exception.name;

    if (typeof errorResponse === 'object' && errorResponse !== null) {
      const responseObj = errorResponse as Record<string, unknown>;
      message =
        (responseObj.message as string | string[]) ||
        (responseObj.error as string) ||
        exception.message;
      error = (responseObj.error as string) || exception.name;
    } else if (typeof errorResponse === 'string') {
      message = errorResponse;
    }

    return {
      ...baseResponse,
      statusCode: status,
      message: this.getUserFriendlyMessage(status, message),
      error,
    };
  }

  private handleDatabaseError(
    exception: DrizzleDatabaseError,
    baseResponse: ErrorResponse,
  ): ErrorResponse {
    const message = this.getDatabaseErrorMessage(exception);

    return {
      ...baseResponse,
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Database Error',
      // Never expose database query details in any environment for security
    };
  }

  private handleValidationError(
    exception: ValidationError[] | { message: string[] },
    baseResponse: ErrorResponse,
  ): ErrorResponse {
    const validationErrors = this.extractValidationErrors(exception);

    return {
      ...baseResponse,
      statusCode: HttpStatus.BAD_REQUEST,
      message: validationErrors,
      error: 'Validation Error',
    };
  }

  private handleThrottlerError(
    exception: ThrottlerException,
    baseResponse: ErrorResponse,
  ): ErrorResponse {
    return {
      ...baseResponse,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many requests. Please try again later.',
      error: 'Rate Limit Exceeded',
    };
  }

  private handleOpenAIError(exception: OpenAIError, baseResponse: ErrorResponse): ErrorResponse {
    const status = exception.status || HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'AI service is temporarily unavailable';

    // Map OpenAI error codes to user-friendly messages
    switch (exception.code || exception.type) {
      case 'insufficient_quota':
        message = 'AI service quota exceeded. Please try again later.';
        break;
      case 'rate_limit_exceeded':
        message = 'AI service is busy. Please try again in a moment.';
        break;
      case 'invalid_request_error':
        message = 'Invalid request to AI service.';
        break;
      case 'authentication_error':
        message = 'AI service authentication failed.';
        break;
      case 'server_error':
        message = 'AI service is experiencing issues. Please try again later.';
        break;
      default:
        if (status >= 500) {
          message = 'AI service is temporarily unavailable.';
        } else if (status >= 400) {
          message = 'Invalid request to AI service.';
        }
    }

    return {
      ...baseResponse,
      statusCode: status >= 500 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_REQUEST,
      message,
      error: 'AI Service Error',
      // Never expose OpenAI API details for security
    };
  }

  private handleGenericError(exception: Error, baseResponse: ErrorResponse): ErrorResponse {
    // Never expose internal error messages or stack traces for security
    return {
      ...baseResponse,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
      // Stack traces and internal details are never exposed
    };
  }

  private getUserFriendlyMessage(status: number, message: string | string[]): string | string[] {
    // Return validation messages as-is since they're user-facing
    if (Array.isArray(message)) {
      return message;
    }

    // Map common HTTP status codes to user-friendly messages
    switch (status as HttpStatus) {
      case HttpStatus.BAD_REQUEST:
        // Don't override validation or specific error messages
        return message && message !== 'Bad Request'
          ? message
          : 'Invalid request. Please check your input.';
      case HttpStatus.UNAUTHORIZED:
        return 'Authentication required. Please sign in.';
      case HttpStatus.FORBIDDEN:
        return 'You do not have permission to access this resource.';
      case HttpStatus.NOT_FOUND:
        return 'The requested resource was not found.';
      case HttpStatus.CONFLICT:
        return 'This action conflicts with existing data.';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return message; // Usually validation messages
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too many requests. Please try again later.';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'An internal error occurred. Please try again later.';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service is temporarily unavailable. Please try again later.';
      default:
        return message;
    }
  }

  private getDatabaseErrorMessage(exception: DrizzleDatabaseError): string {
    const message = exception.message.toLowerCase();

    if (message.includes('duplicate') || message.includes('unique')) {
      return 'This data already exists. Please use different values.';
    }

    if (message.includes('foreign key') || message.includes('constraint')) {
      return 'This action violates data integrity rules.';
    }

    if (message.includes('not null')) {
      return 'Required information is missing.';
    }

    if (message.includes('invalid') || message.includes('syntax')) {
      return 'Invalid data format provided.';
    }

    return 'Database operation failed. Please try again.';
  }

  private isValidationError(
    exception: unknown,
  ): exception is ValidationError[] | { message: string[] } {
    return (
      (Array.isArray(exception) &&
        exception.length > 0 &&
        exception[0] instanceof ValidationError) ||
      (exception !== null &&
        typeof exception === 'object' &&
        'message' in exception &&
        Array.isArray((exception as Record<string, unknown>).message))
    );
  }

  private isOpenAIError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name.includes('OpenAI') ||
        exception.message.includes('openai') ||
        'status' in exception ||
        'code' in exception ||
        'type' in exception)
    );
  }

  private extractValidationErrors(exception: ValidationError[] | { message: string[] }): string[] {
    if (Array.isArray(exception)) {
      return exception.flatMap((error) =>
        Object.values(error.constraints || ({} as Record<string, string>)),
      );
    }

    if ('message' in exception && Array.isArray(exception.message)) {
      return exception.message;
    }

    return ['Validation failed'];
  }

  private isDatabaseError(exception: unknown): boolean {
    if (!(exception instanceof Error)) {
      return false;
    }

    // Check for common Drizzle/PostgreSQL error patterns
    const errorMessage = exception.message?.toLowerCase() || '';
    const errorCode =
      'code' in exception ? ((exception as Record<string, unknown>).code as string) : undefined;

    // PostgreSQL error codes
    const pgErrorCodes = [
      '23505', // unique_violation
      '23503', // foreign_key_violation
      '23502', // not_null_violation
      '23514', // check_violation
      '22P02', // invalid_text_representation
      '42703', // undefined_column
      '42P01', // undefined_table
      '42601', // syntax_error
    ];

    // Check by error code
    if (errorCode && pgErrorCodes.includes(errorCode)) {
      return true;
    }

    // Check by error message patterns
    const dbErrorPatterns = [
      'duplicate key',
      'violates foreign key',
      'violates not-null',
      'violates unique constraint',
      'invalid input syntax',
      'relation .* does not exist',
      'column .* does not exist',
      'syntax error',
      'database',
      'drizzle',
      'postgresql',
      'pg_',
    ];

    return dbErrorPatterns.some((pattern) => errorMessage.includes(pattern));
  }

  private logError(
    exception: unknown,
    request: Request,
    requestId: string,
    errorResponse: ErrorResponse,
  ): void {
    // Create sanitized request metadata for logging
    const safeMetadata = LogSanitizer.createSafeRequestMetadata(request);

    const logContext = {
      requestId,
      ...safeMetadata,
      statusCode: errorResponse.statusCode,
      userId:
        'user' in (request as unknown as Record<string, unknown>)
          ? (((request as unknown as Record<string, unknown>).user as Record<string, unknown>)
              ?.id as string)
          : undefined,
      errorType: exception instanceof Error ? exception.name : 'UnknownError',
      // Create a hash of the error for correlation without exposing details
      errorHash:
        exception instanceof Error
          ? LogSanitizer['createHash'](exception.message)
          : LogSanitizer['createHash']('unknown_error'),
    };

    const logMessage = `${request.method} ${LogSanitizer.sanitizeUrl(request.url)} - ${errorResponse.statusCode}`;

    if (errorResponse.statusCode >= 500) {
      this.logger.error(logMessage, {
        ...logContext,
        severity: 'high',
        // Never log full stack traces or exception details for security
      });
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(logMessage, {
        ...logContext,
        severity: 'medium',
      });
    } else {
      this.logger.log(logMessage, {
        ...logContext,
        severity: 'low',
      });
    }
  }
}
