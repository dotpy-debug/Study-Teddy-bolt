import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate or extract request ID
    const requestId = this.generateRequestId(request);

    // Add request ID to request object for use in other parts of the application
    (request as any).requestId = requestId;

    // Add request ID to response headers
    response.setHeader('X-Request-ID', requestId);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Log successful requests
        const duration = Date.now() - startTime;
        this.logRequest(request, response.statusCode, duration, requestId);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Enhance error with request context
        const enhancedError = this.enhanceError(
          error,
          request,
          requestId,
          duration,
        );

        // Log error with context
        this.logError(enhancedError, request, requestId, duration);

        return throwError(() => enhancedError);
      }),
    );
  }

  private generateRequestId(request: Request): string {
    // Check if request ID already exists in headers
    const existingId = request.headers['x-request-id'] as string;
    if (existingId) {
      return existingId;
    }

    // Generate new request ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `req_${timestamp}_${random}`;
  }

  private enhanceError(
    error: any,
    request: Request,
    requestId: string,
    duration: number,
  ): any {
    // Don't modify the error if it's already an HttpException
    if (error instanceof HttpException) {
      return error;
    }

    // Add context to the error
    if (error instanceof Error) {
      (error as any).context = {
        requestId,
        method: request.method,
        url: request.url,
        duration,
        userAgent: request.headers['user-agent'],
        ip: this.getClientIp(request),
        userId: (request as any).user?.id,
        timestamp: new Date().toISOString(),
      };
    }

    return error;
  }

  private logRequest(
    request: Request,
    statusCode: number,
    duration: number,
    requestId: string,
  ): void {
    const logData = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      duration: `${duration}ms`,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      userId: (request as any).user?.id,
    };

    const message = `${request.method} ${request.url} - ${statusCode} (${duration}ms)`;

    if (statusCode >= 400) {
      this.logger.warn(message, logData);
    } else {
      this.logger.log(message, logData);
    }
  }

  private logError(
    error: any,
    request: Request,
    requestId: string,
    duration: number,
  ): void {
    const logData = {
      requestId,
      method: request.method,
      url: request.url,
      duration: `${duration}ms`,
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
      userId: (request as any).user?.id,
      errorName: error.name,
      errorMessage: error.message,
    };

    const message = `ERROR: ${request.method} ${request.url} - ${error.name}`;

    if (error instanceof HttpException) {
      const status = error.getStatus();
      logData['statusCode'] = status;

      if (status >= 500) {
        this.logger.error(message, { ...logData, stack: error.stack });
      } else {
        this.logger.warn(message, logData);
      }
    } else {
      this.logger.error(message, { ...logData, stack: error.stack });
    }
  }

  private getClientIp(request: Request): string {
    return (request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown') as string;
  }
}
