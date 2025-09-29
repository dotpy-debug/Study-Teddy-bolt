import * as Sentry from '@sentry/nextjs';
import { Integrations } from '@sentry/integrations';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const environment = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  // Performance monitoring for server-side rendering
  tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

  // Enable profiling for server performance
  profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

  // Server-side error handling
  beforeSend(event, hint) {
    // Filter out development noise
    if (environment === 'development') {
      console.warn('Sentry server event:', event);
    }

    // Filter out common Next.js development warnings
    if (event.logger === 'webpack' && environment === 'development') {
      return null;
    }

    return event;
  },

  // Server-specific integrations
  integrations: [
    new Sentry.BrowserTracing({
      // Track API routes and server actions
      enableWebVitals: false, // Only on client side
    }),
    new Integrations.HttpContext(),
    new Integrations.LocalVariables({
      captureAllExceptions: false, // Only for critical errors
    }),
    // Add profiling for server performance
    nodeProfilingIntegration(),
    // Enhanced error context
    new Integrations.ExtraErrorData({
      depth: 5,
      captureErrorCause: true,
    }),
    // Track server console logs
    new Integrations.CaptureConsole({
      levels: ['error', 'warn'],
    }),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Custom tags for server
  initialScope: {
    tags: {
      component: 'frontend-server',
      app: 'studyteddy',
    },
  },

  // Server performance monitoring
  beforeSendTransaction(event) {
    // Track server-side rendering performance
    if (event.transaction?.includes('pageload')) {
      const duration = event.timestamp! - event.start_timestamp!;

      // Alert on slow SSR (>500ms)
      if (duration > 0.5) {
        Sentry.addBreadcrumb({
          message: `Slow SSR detected: ${event.transaction}`,
          level: 'warning',
          data: {
            duration: `${duration * 1000}ms`,
            transaction: event.transaction,
          },
        });
      }
    }

    return event;
  },
});

// Track API route performance
export function trackAPIPerformance(routeName: string) {
  return Sentry.startTransaction({
    name: `API: ${routeName}`,
    op: 'api',
  });
}

// Track server action performance
export function trackServerAction(actionName: string) {
  return Sentry.startTransaction({
    name: `Server Action: ${actionName}`,
    op: 'server_action',
  });
}

// Enhanced server utilities
export const ServerSentryUtils = {
  // Track database operations from server
  trackDatabaseQuery: (query: string, duration: number, table?: string) => {
    Sentry.addBreadcrumb({
      message: `Database Query: ${table || 'unknown'}`,
      level: duration > 100 ? 'warning' : 'info',
      category: 'query',
      data: {
        query: query.substring(0, 100), // Truncate for privacy
        duration,
        table,
      },
    });

    // Alert on slow queries
    if (duration > 500) {
      Sentry.captureMessage(`Very slow database query: ${table}`, 'warning');
    }
  },

  // Track external API calls
  trackExternalAPI: (service: string, endpoint: string, duration: number, statusCode?: number) => {
    Sentry.addBreadcrumb({
      message: `External API: ${service}`,
      level: statusCode && statusCode >= 400 ? 'error' : 'info',
      category: 'http',
      data: {
        service,
        endpoint,
        duration,
        statusCode,
      },
    });

    // Alert on failures or slow calls
    if (statusCode && statusCode >= 500) {
      Sentry.captureMessage(`External API failure: ${service}`, 'error');
    } else if (duration > 5000) {
      Sentry.captureMessage(`Slow external API call: ${service}`, 'warning');
    }
  },

  // Track server-side AI operations
  trackAIOperation: (operation: string, provider: string, duration: number, success: boolean) => {
    Sentry.withScope((scope) => {
      scope.setTag('ai_provider', provider);
      scope.setTag('ai_operation', operation);
      scope.setContext('ai_metrics', {
        duration,
        success,
        provider,
        operation,
      });

      Sentry.addBreadcrumb({
        message: `AI Operation: ${operation}`,
        level: success ? 'info' : 'error',
        category: 'ai',
        data: {
          operation,
          provider,
          duration,
          success,
        },
      });

      // Alert on AI operation issues
      if (!success) {
        Sentry.captureMessage(`AI operation failed: ${operation}`, 'error');
      } else if (duration > 10000) {
        Sentry.captureMessage(`Slow AI operation: ${operation}`, 'warning');
      }
    });
  },

  // Track memory usage
  trackMemoryUsage: () => {
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      };

      Sentry.addBreadcrumb({
        message: 'Memory Usage Check',
        level: usageInMB.heapUsed > 512 ? 'warning' : 'info',
        category: 'performance',
        data: usageInMB,
      });

      // Alert on high memory usage
      if (usageInMB.heapUsed > 1024) {
        Sentry.captureMessage('High memory usage detected', 'warning');
      }
    }
  },

  // Track authentication events
  trackAuthEvent: (event: string, userId?: string, metadata?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      if (userId) {
        scope.setUser({ id: userId });
      }
      scope.setTag('auth_event', event);
      scope.setContext('auth_metadata', metadata);

      Sentry.addBreadcrumb({
        message: `Auth Event: ${event}`,
        level: event.includes('failed') || event.includes('error') ? 'error' : 'info',
        category: 'auth',
        data: {
          event,
          userId,
          ...metadata,
        },
      });
    });
  },
};

// Automatic memory monitoring
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    ServerSentryUtils.trackMemoryUsage();
  }, 60000); // Check every minute
}