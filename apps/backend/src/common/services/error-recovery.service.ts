import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SentryService } from '../../sentry/sentry.service';

export interface BackendErrorRecoveryStrategy {
  name: string;
  canHandle: (error: any) => boolean;
  recover: (error: any, context?: any) => Promise<boolean>;
  maxRetries?: number;
  backoffDelay?: number;
}

export interface BackendErrorContext {
  service?: string;
  method?: string;
  userId?: string;
  requestId?: string;
  operationType?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ErrorRecoveryService {
  private readonly logger = new Logger(ErrorRecoveryService.name);
  private strategies: BackendErrorRecoveryStrategy[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private defaultMaxRetries = 3;

  constructor(
    private readonly sentryService: SentryService,
    private readonly configService: ConfigService,
  ) {
    this.initializeDefaultStrategies();
  }

  /**
   * Register a custom error recovery strategy
   */
  registerStrategy(strategy: BackendErrorRecoveryStrategy): void {
    this.strategies.push(strategy);
    this.logger.log(`Registered error recovery strategy: ${strategy.name}`);
  }

  /**
   * Attempt to recover from an error
   */
  async recoverFromError(
    error: any,
    context?: BackendErrorContext,
  ): Promise<boolean> {
    const errorKey = this.getErrorKey(error, context);
    const attempts = this.recoveryAttempts.get(errorKey) || 0;

    // Find applicable strategy
    const strategy = this.strategies.find((s) => s.canHandle(error));
    if (!strategy) {
      this.logger.warn(
        `No recovery strategy found for error: ${error.message}`,
      );
      return false;
    }

    const maxRetries = strategy.maxRetries || this.defaultMaxRetries;

    // Check if we've exceeded max retry attempts
    if (attempts >= maxRetries) {
      this.logger.error(
        `Recovery attempts exhausted for error: ${error.message} (${attempts}/${maxRetries})`,
      );

      this.sentryService.trackMetric({
        name: 'error_recovery.exhausted',
        value: 1,
        tags: {
          strategy: strategy.name,
          error_type: error.constructor.name,
        },
      });

      return false;
    }

    // Increment retry attempts
    this.recoveryAttempts.set(errorKey, attempts + 1);

    try {
      this.logger.log(
        `Attempting error recovery with strategy: ${strategy.name} (attempt ${attempts + 1}/${maxRetries})`,
      );

      // Apply backoff delay if specified
      if (strategy.backoffDelay && attempts > 0) {
        const delay = strategy.backoffDelay * Math.pow(2, attempts - 1);
        await this.delay(delay);
      }

      const recovered = await strategy.recover(error, context);

      if (recovered) {
        this.logger.log(
          `Successfully recovered from error using strategy: ${strategy.name}`,
        );
        this.recoveryAttempts.delete(errorKey);

        this.sentryService.trackMetric({
          name: 'error_recovery.success',
          value: 1,
          tags: {
            strategy: strategy.name,
            attempts: (attempts + 1).toString(),
            error_type: error.constructor.name,
          },
        });

        return true;
      } else {
        this.logger.warn(
          `Recovery strategy ${strategy.name} failed to recover from error`,
        );

        this.sentryService.trackMetric({
          name: 'error_recovery.failed',
          value: 1,
          tags: {
            strategy: strategy.name,
            attempts: (attempts + 1).toString(),
            error_type: error.constructor.name,
          },
        });

        return false;
      }
    } catch (recoveryError) {
      this.logger.error(
        `Error during recovery attempt with strategy ${strategy.name}:`,
        recoveryError,
      );

      this.sentryService.captureException(recoveryError, {
        recovery_context: {
          strategy: strategy.name,
          original_error: error.message,
          attempt: attempts + 1,
          context,
        },
      });

      return false;
    }
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Database connection recovery
    this.registerStrategy({
      name: 'database_reconnect',
      canHandle: (error) => {
        const message = error.message?.toLowerCase() || '';
        return (
          message.includes('connection') ||
          message.includes('econnrefused') ||
          message.includes('enotfound') ||
          message.includes('etimedout') ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND'
        );
      },
      recover: async (error, context) => {
        this.logger.log('Attempting database reconnection...');

        try {
          // Wait before attempting reconnection
          await this.delay(2000);

          // Try to reconnect - this would typically involve your database service
          // For now, we'll simulate a health check
          const isHealthy = await this.checkDatabaseHealth();
          return isHealthy;
        } catch (reconnectError) {
          this.logger.error('Database reconnection failed:', reconnectError);
          return false;
        }
      },
      maxRetries: 5,
      backoffDelay: 1000,
    });

    // External API retry
    this.registerStrategy({
      name: 'external_api_retry',
      canHandle: (error) => {
        const status = error.status || error.response?.status;
        return (
          status >= 500 || // Server errors
          status === 429 || // Rate limiting
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT'
        );
      },
      recover: async (error, context) => {
        this.logger.log(
          `Retrying external API call after error: ${error.message}`,
        );

        // For rate limiting, implement exponential backoff
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after'];
          if (retryAfter) {
            const delay = parseInt(retryAfter) * 1000;
            await this.delay(delay);
          }
        }

        return true; // Let the caller retry the operation
      },
      maxRetries: 3,
      backoffDelay: 2000,
    });

    // Redis connection recovery
    this.registerStrategy({
      name: 'redis_reconnect',
      canHandle: (error) => {
        const message = error.message?.toLowerCase() || '';
        return (
          message.includes('redis') ||
          message.includes('connection closed') ||
          error.code === 'NR_CLOSED'
        );
      },
      recover: async (error, context) => {
        this.logger.log('Attempting Redis reconnection...');

        try {
          await this.delay(1000);
          return await this.checkRedisHealth();
        } catch (reconnectError) {
          this.logger.error('Redis reconnection failed:', reconnectError);
          return false;
        }
      },
      maxRetries: 3,
      backoffDelay: 1000,
    });

    // AI service recovery
    this.registerStrategy({
      name: 'ai_service_retry',
      canHandle: (error) => {
        const message = error.message?.toLowerCase() || '';
        return (
          message.includes('openai') ||
          message.includes('ai service') ||
          message.includes('model') ||
          error.status === 429 || // Rate limiting
          error.status === 502 || // Bad gateway
          error.status === 503
        ); // Service unavailable
      },
      recover: async (error, context) => {
        this.logger.log(
          `Retrying AI service call after error: ${error.message}`,
        );

        // Handle rate limiting with exponential backoff
        if (error.status === 429) {
          const attempts =
            this.recoveryAttempts.get(this.getErrorKey(error, context)) || 0;
          const delay = Math.min(1000 * Math.pow(2, attempts), 60000); // Max 1 minute
          await this.delay(delay);
        }

        return true;
      },
      maxRetries: 5,
      backoffDelay: 5000,
    });

    // Memory/Resource cleanup recovery
    this.registerStrategy({
      name: 'memory_cleanup',
      canHandle: (error) => {
        const message = error.message?.toLowerCase() || '';
        return (
          message.includes('memory') ||
          message.includes('heap') ||
          message.includes('out of memory') ||
          error.name === 'RangeError'
        );
      },
      recover: async (error, context) => {
        this.logger.log('Attempting memory cleanup...');

        try {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }

          // Clear internal caches if possible
          await this.performMemoryCleanup();

          return true;
        } catch (cleanupError) {
          this.logger.error('Memory cleanup failed:', cleanupError);
          return false;
        }
      },
      maxRetries: 2,
      backoffDelay: 5000,
    });

    // Email service recovery
    this.registerStrategy({
      name: 'email_service_retry',
      canHandle: (error) => {
        const message = error.message?.toLowerCase() || '';
        return (
          message.includes('smtp') ||
          message.includes('email') ||
          message.includes('mail') ||
          error.code === 'ECONNECTION'
        );
      },
      recover: async (error, context) => {
        this.logger.log('Retrying email service...');

        // Wait before retrying email service
        await this.delay(3000);
        return true;
      },
      maxRetries: 3,
      backoffDelay: 3000,
    });

    // File system recovery
    this.registerStrategy({
      name: 'filesystem_retry',
      canHandle: (error) => {
        return (
          error.code === 'ENOENT' ||
          error.code === 'EACCES' ||
          error.code === 'EMFILE' ||
          error.code === 'EBUSY'
        );
      },
      recover: async (error, context) => {
        this.logger.log(`Retrying file system operation after: ${error.code}`);

        // For file handle exhaustion, wait longer
        if (error.code === 'EMFILE') {
          await this.delay(5000);
        } else {
          await this.delay(1000);
        }

        return true;
      },
      maxRetries: 3,
      backoffDelay: 1000,
    });
  }

  /**
   * Clear recovery attempts for a specific error
   */
  clearRecoveryAttempts(error: any, context?: BackendErrorContext): void {
    const errorKey = this.getErrorKey(error, context);
    this.recoveryAttempts.delete(errorKey);
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): Record<string, any> {
    return {
      activeAttempts: this.recoveryAttempts.size,
      registeredStrategies: this.strategies.length,
      strategyNames: this.strategies.map((s) => s.name),
    };
  }

  private getErrorKey(error: any, context?: BackendErrorContext): string {
    const errorIdentifier = `${error.constructor.name}_${error.message?.substring(0, 50) || 'unknown'}`;
    const contextIdentifier = context
      ? `${context.service || 'unknown'}_${context.method || 'unknown'}`
      : 'global';
    return `${errorIdentifier}_${contextIdentifier}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // This would check your actual database connection
      // For now, we'll return true as a placeholder
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      // This would check your actual Redis connection
      // For now, we'll return true as a placeholder
      return true;
    } catch {
      return false;
    }
  }

  private async performMemoryCleanup(): Promise<void> {
    // Clear any caches or temporary data
    // This is application-specific
    this.logger.log('Performing memory cleanup...');
  }
}

/**
 * Decorator for automatic error recovery
 */
export function WithErrorRecovery(context?: Partial<BackendErrorContext>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const errorRecoveryService = this
        .errorRecoveryService as ErrorRecoveryService;

      if (!errorRecoveryService) {
        // If no error recovery service available, just call original method
        return await originalMethod.apply(this, args);
      }

      const fullContext = {
        service: className,
        method: propertyKey,
        ...context,
      };

      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const recovered = await errorRecoveryService.recoverFromError(
          error,
          fullContext,
        );

        if (recovered) {
          // Retry the operation after successful recovery
          return await originalMethod.apply(this, args);
        }

        // Re-throw the error if recovery failed
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Higher-order function for error recovery
 */
export const withErrorRecovery = async <T>(
  operation: () => Promise<T>,
  errorRecoveryService: ErrorRecoveryService,
  context?: BackendErrorContext,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const recovered = await errorRecoveryService.recoverFromError(
      error,
      context,
    );

    if (recovered) {
      // Retry the operation after successful recovery
      return await operation();
    }

    // Re-throw the error if recovery failed
    throw error;
  }
};
