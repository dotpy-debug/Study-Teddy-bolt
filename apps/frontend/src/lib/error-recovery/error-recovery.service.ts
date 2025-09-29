import { SentryUtils } from '../../../sentry.client.config';

export interface ErrorRecoveryStrategy {
  name: string;
  canHandle: (error: Error) => boolean;
  recover: (error: Error, context?: any) => Promise<boolean>;
  fallback?: () => void;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private strategies: ErrorRecoveryStrategy[] = [];
  private recoveryAttempts: Map<string, number> = new Map();
  private maxRetryAttempts = 3;

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
      ErrorRecoveryService.instance.initializeDefaultStrategies();
    }
    return ErrorRecoveryService.instance;
  }

  /**
   * Register a custom error recovery strategy
   */
  registerStrategy(strategy: ErrorRecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Attempt to recover from an error
   */
  async recoverFromError(error: Error, context?: ErrorContext): Promise<boolean> {
    const errorKey = this.getErrorKey(error, context);
    const attempts = this.recoveryAttempts.get(errorKey) || 0;

    // Check if we've exceeded max retry attempts
    if (attempts >= this.maxRetryAttempts) {
      SentryUtils.trackUserAction('error_recovery_exhausted', {
        error: error.message,
        attempts,
        context,
      });
      return false;
    }

    // Increment retry attempts
    this.recoveryAttempts.set(errorKey, attempts + 1);

    // Find applicable strategy
    const strategy = this.strategies.find(s => s.canHandle(error));
    if (!strategy) {
      SentryUtils.trackUserAction('error_recovery_no_strategy', {
        error: error.message,
        context,
      });
      return false;
    }

    try {
      SentryUtils.trackUserAction('error_recovery_attempt', {
        strategy: strategy.name,
        error: error.message,
        attempt: attempts + 1,
        context,
      });

      const recovered = await strategy.recover(error, context);

      if (recovered) {
        // Clear retry attempts on successful recovery
        this.recoveryAttempts.delete(errorKey);

        SentryUtils.trackUserAction('error_recovery_success', {
          strategy: strategy.name,
          error: error.message,
          attempt: attempts + 1,
          context,
        });

        return true;
      } else {
        SentryUtils.trackUserAction('error_recovery_failed', {
          strategy: strategy.name,
          error: error.message,
          attempt: attempts + 1,
          context,
        });

        // Execute fallback if available
        if (strategy.fallback) {
          strategy.fallback();
        }

        return false;
      }
    } catch (recoveryError) {
      SentryUtils.trackUserAction('error_recovery_exception', {
        strategy: strategy.name,
        originalError: error.message,
        recoveryError: recoveryError.message,
        attempt: attempts + 1,
        context,
      });

      return false;
    }
  }

  /**
   * Clear recovery attempts for a specific error
   */
  clearRecoveryAttempts(error: Error, context?: ErrorContext): void {
    const errorKey = this.getErrorKey(error, context);
    this.recoveryAttempts.delete(errorKey);
  }

  /**
   * Get the number of recovery attempts for an error
   */
  getRecoveryAttempts(error: Error, context?: ErrorContext): number {
    const errorKey = this.getErrorKey(error, context);
    return this.recoveryAttempts.get(errorKey) || 0;
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Network error recovery
    this.registerStrategy({
      name: 'network_retry',
      canHandle: (error) => {
        return error.message.includes('fetch') ||
               error.message.includes('network') ||
               error.message.includes('timeout') ||
               error.name === 'TypeError';
      },
      recover: async (error, context) => {
        // Wait before retrying
        await this.delay(1000 * (this.getRecoveryAttempts(error, context) + 1));

        // Try to make a simple request to check connectivity
        try {
          const response = await fetch('/api/health', {
            method: 'GET',
            cache: 'no-cache',
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      fallback: () => {
        // Show offline message or switch to offline mode
        this.showNetworkErrorMessage();
      },
    });

    // Chunk loading error recovery
    this.registerStrategy({
      name: 'chunk_reload',
      canHandle: (error) => {
        return error.message.includes('ChunkLoadError') ||
               error.message.includes('Loading chunk') ||
               error.message.includes('script') && error.message.includes('load');
      },
      recover: async () => {
        // Force reload the page to get fresh chunks
        window.location.reload();
        return true;
      },
    });

    // Authentication error recovery
    this.registerStrategy({
      name: 'auth_refresh',
      canHandle: (error) => {
        return error.message.includes('401') ||
               error.message.includes('unauthorized') ||
               error.message.includes('token');
      },
      recover: async () => {
        try {
          // Try to refresh the authentication token
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (response.ok) {
            return true;
          }
        } catch {
          // Refresh failed
        }

        // Redirect to login if refresh fails
        window.location.href = '/auth/login';
        return false;
      },
    });

    // Session storage recovery
    this.registerStrategy({
      name: 'session_recovery',
      canHandle: (error) => {
        return error.message.includes('session') ||
               error.message.includes('storage') ||
               error.message.includes('localStorage');
      },
      recover: async () => {
        try {
          // Clear potentially corrupted session data
          localStorage.removeItem('app_session');
          sessionStorage.clear();

          // Try to restore from backup if available
          const backup = localStorage.getItem('app_session_backup');
          if (backup) {
            localStorage.setItem('app_session', backup);
            return true;
          }

          return false;
        } catch {
          return false;
        }
      },
      fallback: () => {
        // Show message about session reset
        this.showSessionResetMessage();
      },
    });

    // API rate limit recovery
    this.registerStrategy({
      name: 'rate_limit_backoff',
      canHandle: (error) => {
        return error.message.includes('429') ||
               error.message.includes('rate limit') ||
               error.message.includes('too many requests');
      },
      recover: async (error, context) => {
        // Exponential backoff
        const attempt = this.getRecoveryAttempts(error, context);
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds

        await this.delay(delay);
        return true;
      },
      fallback: () => {
        this.showRateLimitMessage();
      },
    });

    // Memory error recovery
    this.registerStrategy({
      name: 'memory_cleanup',
      canHandle: (error) => {
        return error.message.includes('memory') ||
               error.message.includes('heap') ||
               error.name === 'RangeError';
      },
      recover: async () => {
        try {
          // Clear caches and force garbage collection
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(name => caches.delete(name))
            );
          }

          // Clear large objects from memory if possible
          this.performMemoryCleanup();

          return true;
        } catch {
          return false;
        }
      },
      fallback: () => {
        // Suggest page refresh
        this.showMemoryErrorMessage();
      },
    });

    // Generic API error recovery
    this.registerStrategy({
      name: 'api_retry',
      canHandle: (error) => {
        return error.message.includes('500') ||
               error.message.includes('502') ||
               error.message.includes('503') ||
               error.message.includes('504');
      },
      recover: async (error, context) => {
        // Wait before retrying
        const attempt = this.getRecoveryAttempts(error, context);
        await this.delay(2000 * (attempt + 1));

        // The actual retry will be handled by the calling code
        return true;
      },
    });
  }

  private getErrorKey(error: Error, context?: ErrorContext): string {
    const contextKey = context ?
      `${context.component || 'unknown'}_${context.action || 'unknown'}` :
      'global';
    return `${error.name}_${error.message.substring(0, 50)}_${contextKey}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private showNetworkErrorMessage(): void {
    // This would integrate with your notification system
    console.warn('Network connection issue detected. Please check your internet connection.');
  }

  private showSessionResetMessage(): void {
    console.info('Session data has been reset due to an error. You may need to log in again.');
  }

  private showRateLimitMessage(): void {
    console.warn('Request rate limit exceeded. Please wait a moment before trying again.');
  }

  private showMemoryErrorMessage(): void {
    console.warn('Memory issue detected. Consider refreshing the page.');
  }

  private performMemoryCleanup(): void {
    // Clear any large objects or caches that can be safely removed
    // This is application-specific and would need to be implemented
    // based on your specific memory management needs
  }
}

// Export singleton instance
export const errorRecoveryService = ErrorRecoveryService.getInstance();

// Utility functions for easy integration
export const withErrorRecovery = async <T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const recovered = await errorRecoveryService.recoverFromError(error as Error, context);

    if (recovered) {
      // Retry the operation after successful recovery
      return await operation();
    }

    // Re-throw the error if recovery failed
    throw error;
  }
};

export const createErrorContext = (
  component: string,
  action: string,
  metadata?: Record<string, any>
): ErrorContext => ({
  component,
  action,
  timestamp: Date.now(),
  url: typeof window !== 'undefined' ? window.location.href : undefined,
  metadata,
});