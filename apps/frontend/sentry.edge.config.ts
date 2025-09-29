import * as Sentry from '@sentry/nextjs';

const environment = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  // Edge runtime specific configuration
  tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

  // Minimal integrations for edge runtime
  integrations: [
    new Sentry.BrowserTracing(),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Custom tags for edge
  initialScope: {
    tags: {
      component: 'frontend-edge',
      app: 'studyteddy',
    },
  },

  beforeSend(event, hint) {
    if (environment === 'development') {
      console.warn('Sentry edge event:', event);
    }

    // Filter out edge runtime specific noise
    if (event.exception?.values?.[0]?.value?.includes('EdgeRuntime')) {
      return null;
    }

    return event;
  },

  // Edge runtime specific performance monitoring
  beforeSendTransaction(event) {
    if (event.transaction) {
      const duration = event.timestamp! - event.start_timestamp!;

      // Alert on slow edge functions (>100ms)
      if (duration > 0.1) {
        Sentry.addBreadcrumb({
          message: `Slow edge function: ${event.transaction}`,
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

// Edge runtime utilities
export const EdgeSentryUtils = {
  // Track middleware performance
  trackMiddleware: (name: string, duration: number, path?: string) => {
    Sentry.addBreadcrumb({
      message: `Middleware: ${name}`,
      level: duration > 50 ? 'warning' : 'info',
      category: 'middleware',
      data: {
        name,
        duration,
        path,
      },
    });

    // Alert on slow middleware
    if (duration > 100) {
      Sentry.captureMessage(`Slow middleware detected: ${name}`, 'warning');
    }
  },

  // Track edge API routes
  trackEdgeAPI: (route: string, method: string, duration: number, status?: number) => {
    Sentry.addBreadcrumb({
      message: `Edge API: ${method.toUpperCase()} ${route}`,
      level: status && status >= 400 ? 'error' : 'info',
      category: 'api',
      data: {
        route,
        method,
        duration,
        status,
      },
    });

    // Alert on errors or slow responses
    if (status && status >= 500) {
      Sentry.captureMessage(`Edge API error: ${route}`, 'error');
    } else if (duration > 200) {
      Sentry.captureMessage(`Slow edge API: ${route}`, 'warning');
    }
  },

  // Track edge function cold starts
  trackColdStart: (functionName: string, initDuration: number) => {
    Sentry.withScope((scope) => {
      scope.setTag('cold_start', true);
      scope.setContext('cold_start', {
        functionName,
        initDuration,
      });

      Sentry.addBreadcrumb({
        message: `Cold Start: ${functionName}`,
        level: initDuration > 1000 ? 'warning' : 'info',
        category: 'performance',
        data: {
          functionName,
          initDuration,
        },
      });

      // Alert on slow cold starts
      if (initDuration > 2000) {
        Sentry.captureMessage(`Slow cold start: ${functionName}`, 'warning');
      }
    });
  },
};