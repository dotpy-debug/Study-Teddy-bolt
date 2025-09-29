/**
 * Custom Error Classes and Error Handling Utilities
 *
 * This module provides comprehensive error handling for the Study Teddy frontend,
 * including custom error types, formatting utilities, and error reporting functions.
 */

// Base application error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 401, true, context);
  }
}

// Authorization errors
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: Record<string, unknown>) {
    super(message, 403, true, context);
  }
}

// Validation errors
export class ValidationError extends AppError {
  public readonly fields: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    fields: Record<string, string[]> = {},
    context?: Record<string, unknown>
  ) {
    super(message, 422, true, context);
    this.fields = fields;
  }
}

// Network errors
export class NetworkError extends AppError {
  public readonly isOffline: boolean;
  public readonly retryable: boolean;

  constructor(
    message: string = 'Network error occurred',
    isOffline: boolean = false,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message, 0, true, context);
    this.isOffline = isOffline;
    this.retryable = retryable;
  }
}

// API errors
export class ApiError extends AppError {
  public readonly response?: Response;
  public readonly data?: unknown;

  constructor(
    message: string,
    statusCode: number,
    response?: Response,
    data?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, statusCode, true, context);
    this.response = response;
    this.data = data;
  }
}

// AI service errors
export class AIError extends AppError {
  public readonly service: string;
  public readonly code?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    service: string = 'openai',
    code?: string,
    retryable: boolean = true,
    statusCode: number = 503,
    context?: Record<string, unknown>
  ) {
    super(message, statusCode, true, context);
    this.service = service;
    this.code = code;
    this.retryable = retryable;
  }
}

// Database/Storage errors
export class StorageError extends AppError {
  public readonly operation: string;
  public readonly resource?: string;

  constructor(
    message: string,
    operation: string,
    resource?: string,
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message, statusCode, true, context);
    this.operation = operation;
    this.resource = resource;
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;
  public readonly limit: number;
  public readonly remaining: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    limit: number = 0,
    remaining: number = 0,
    context?: Record<string, unknown>
  ) {
    super(message, 429, true, context);
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
  }
}

// Error formatting utilities
export class ErrorFormatter {
  /**
   * Format error for user display
   */
  static formatForUser(error: unknown): string {
    if (error instanceof ValidationError) {
      const fieldErrors = Object.values(error.fields).flat();
      return fieldErrors.length > 0 ? fieldErrors.join('. ') : error.message;
    }

    if (error instanceof AuthenticationError) {
      return 'Please sign in to continue';
    }

    if (error instanceof AuthorizationError) {
      return 'You do not have permission to perform this action';
    }

    if (error instanceof NetworkError) {
      if (error.isOffline) {
        return 'You appear to be offline. Please check your internet connection';
      }
      return 'Connection error. Please try again';
    }

    if (error instanceof RateLimitError) {
      const retryMsg = error.retryAfter
        ? ` Please try again in ${Math.ceil(error.retryAfter / 1000)} seconds`
        : ' Please try again later';
      return `Too many requests.${retryMsg}`;
    }

    if (error instanceof AIError) {
      switch (error.code) {
        case 'insufficient_quota':
          return 'AI service quota exceeded. Please try again later';
        case 'rate_limit_exceeded':
          return 'AI service is busy. Please try again in a moment';
        case 'invalid_request_error':
          return 'Invalid request to AI service';
        default:
          return 'AI service is temporarily unavailable';
      }
    }

    if (error instanceof ApiError) {
      // Return specific API error messages for client errors
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return error.message;
      }
      return 'Service temporarily unavailable. Please try again later';
    }

    if (error instanceof AppError) {
      return error.message;
    }

    if (error instanceof Error) {
      return process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred';
    }

    return 'An unexpected error occurred';
  }

  /**
   * Format error for logging
   */
  static formatForLogging(error: unknown): Record<string, unknown> {
    const baseInfo = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    if (error instanceof AppError) {
      return {
        ...baseInfo,
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        context: error.context,
        requestId: error.requestId,
        stack: error.stack,
      };
    }

    if (error instanceof Error) {
      return {
        ...baseInfo,
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      ...baseInfo,
      error: String(error),
    };
  }

  /**
   * Get error severity level
   */
  static getSeverity(error: unknown): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) return 'critical';
      if (error.statusCode >= 400) return 'medium';
      return 'low';
    }

    if (error instanceof NetworkError) {
      return error.isOffline ? 'high' : 'medium';
    }

    if (error instanceof Error) {
      return 'high';
    }

    return 'medium';
  }
}

// Error parsing utilities
export class ErrorParser {
  /**
   * Parse API response error
   */
  static async parseApiError(response: Response): Promise<ApiError> {
    let errorData: unknown = {};
    let message = `Request failed with status ${response.status}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
        message = errorData.message || errorData.error || message;
      } else {
        const text = await response.text();
        message = text || message;
      }
    } catch {
      // Use default message if parsing fails
    }

    return new ApiError(
      message,
      response.status,
      response,
      errorData,
      {
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
      }
    );
  }

  /**
   * Parse network error
   */
  static parseNetworkError(error: Error & { code?: string }): NetworkError {
    const isOffline = !navigator.onLine;

    let message = 'Network error occurred';
    let retryable = true;

    if (error.name === 'AbortError') {
      message = 'Request was cancelled';
      retryable = false;
    } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
      message = isOffline ? 'You appear to be offline' : 'Unable to connect to server';
    } else if (error.code === 'TIMEOUT_ERROR') {
      message = 'Request timed out';
    }

    return new NetworkError(message, isOffline, retryable, {
      originalError: error.message,
      code: error.code,
    });
  }

  /**
   * Parse validation error
   */
  static parseValidationError(error: { errors?: unknown[]; fields?: Record<string, string[]>; message?: string[] | string }): ValidationError {
    let fields: Record<string, string[]> = {};
    let message = 'Validation failed';

    if (error.errors && Array.isArray(error.errors)) {
      // Handle class-validator style errors
      fields = (error.errors as Array<{ property?: string; constraints?: Record<string, string> }>).reduce((acc: Record<string, string[]>, err) => {
        if (err.property && err.constraints) {
          acc[err.property] = Object.values(err.constraints) as string[];
        }
        return acc;
      }, {});
    } else if (error.fields && typeof error.fields === 'object') {
      // Handle custom validation error format
      fields = error.fields;
    } else if (error.message && Array.isArray(error.message)) {
      // Handle array of error messages
      fields.general = error.message;
    }

    if (Object.keys(fields).length > 0) {
      const allMessages = Object.values(fields).flat();
      message = allMessages.join('. ');
    }

    return new ValidationError(message, fields);
  }
}

// Error reporting utilities
export class ErrorReporter {
  private static errorQueue: Array<Record<string, unknown>> = [];
  private static isReporting = false;

  /**
   * Report error to monitoring service
   */
  static async reportError(error: unknown, context?: Record<string, unknown>): Promise<void> {
    const errorInfo = {
      ...ErrorFormatter.formatForLogging(error),
      ...context,
      severity: ErrorFormatter.getSeverity(error),
      errorId: this.generateErrorId(),
    };

    // Add to queue
    this.errorQueue.push(errorInfo);

    // Process queue if not already processing
    if (!this.isReporting) {
      await this.processErrorQueue();
    }
  }

  /**
   * Process error reporting queue
   */
  private static async processErrorQueue(): Promise<void> {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    try {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      // Only report in production
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ errors }),
        });
      } else {
        // Log to console in development
        console.group('Error Report');
        errors.forEach(error => console.error(error));
        console.groupEnd();
      }
    } catch (reportingError) {
      console.error('Failed to report errors:', reportingError);
      // Put errors back in queue for retry
      this.errorQueue.unshift(...this.errorQueue);
    } finally {
      this.isReporting = false;

      // Process remaining errors if any
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processErrorQueue(), 5000); // Retry after 5 seconds
      }
    }
  }

  /**
   * Generate unique error ID
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Hook for handling errors in React components
export function useErrorHandler() {
  return React.useCallback((error: unknown, context?: Record<string, unknown>) => {
    // Report error
    ErrorReporter.reportError(error, context);

    // In development, throw the error to trigger error boundaries
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }

    // In production, log the error
    console.error('Handled error:', ErrorFormatter.formatForLogging(error));
  }, []);
}

// Utility to check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return error.retryable && !error.isOffline;
  }

  if (error instanceof AIError) {
    return error.retryable;
  }

  if (error instanceof ApiError) {
    // Retry on server errors but not client errors
    return error.statusCode >= 500;
  }

  if (error instanceof RateLimitError) {
    return true; // Can retry after waiting
  }

  return false;
}

// Utility to get retry delay for retryable errors
export function getRetryDelay(error: unknown, attempt: number = 1): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds

  if (error instanceof RateLimitError && error.retryAfter) {
    return Math.min(error.retryAfter * 1000, maxDelay);
  }

  // Exponential backoff with jitter
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = Math.random() * 0.1 * delay;

  return delay + jitter;
}

// Import React for the hook
import React from 'react';