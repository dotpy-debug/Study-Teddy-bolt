import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const environment = process.env.NODE_ENV || 'development';
const dsn = process.env.SENTRY_DSN;
const release = process.env.SENTRY_RELEASE;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Enhanced integrations for backend
    integrations: [
      // HTTP request tracking with detailed tracing
      new Sentry.Integrations.Http({
        tracing: true,
        breadcrumbs: true,
      }),

      // Database integrations
      new Sentry.Integrations.Postgres({
        usePgNative: false,
      }),

      // Node.js profiling
      nodeProfilingIntegration(),

      // Enhanced error context
      // Enhanced error context (removed - deprecated)

      // Console logs capture (errors and warnings only)
      // Console logs capture (removed - deprecated)

      // Local variables in stack traces (production only for critical errors)
      // Local variables (removed - deprecated)

      // Request data integration
      // Request data (removed - deprecated)

      // OnUncaughtException integration
      // OnUncaughtException (removed - deprecated)

      // OnUnhandledRejection integration
      // OnUnhandledRejection (removed - deprecated)
    ],

    // Error filtering and preprocessing
    beforeSend: (event, hint) => {
      // Log in development
      if (environment === 'development') {
        console.log('Sentry Backend Event:', {
          level: event.level,
          message: event.message,
          exception: event.exception?.values?.[0]?.value,
          transaction: event.transaction,
        });
      }

      // Filter out health check requests
      if (event.request?.url?.includes('/health')) {
        return null;
      }

      // Filter out metrics endpoints
      if (event.request?.url?.includes('/metrics')) {
        return null;
      }

      // Filter out bot traffic
      const userAgent = event.request?.headers?.['user-agent'];
      if (
        userAgent &&
        (userAgent.includes('bot') ||
          userAgent.includes('crawler') ||
          userAgent.includes('spider'))
      ) {
        return null;
      }

      // Filter out known non-critical errors
      const errorMessage = event.exception?.values?.[0]?.value || '';
      if (isNonCriticalError(errorMessage)) {
        return null;
      }

      // Enhance error with additional context
      if (event.exception) {
        enhanceErrorContext(event, hint);
      }

      return event;
    },

    // Transaction filtering
    beforeSendTransaction: (event) => {
      // Filter out health check transactions
      if (event.transaction?.includes('/health')) {
        return null;
      }

      // Filter out metrics transactions
      if (event.transaction?.includes('/metrics')) {
        return null;
      }

      // Add performance context
      const duration = event.timestamp! - event.start_timestamp!;
      if (duration > 1) {
        // Slow transaction (>1 second)
        event.tags = {
          ...event.tags,
          performance_issue: 'slow_transaction',
        };
      }

      return event;
    },

    // Default tags for all events
    initialScope: {
      tags: {
        component: 'backend',
        app: 'studyteddy',
        runtime: 'nodejs',
        version: process.version,
      },
    },

    // Enable debug mode in development
    debug: environment === 'development',

    // Maximum breadcrumbs
    maxBreadcrumbs: 100,

    // Attach stack traces to pure capture message calls
    attachStacktrace: true,

    // Send default PII (Personally Identifiable Information)
    sendDefaultPii: false,

    // Maximum value length for event values
    maxValueLength: 250,

    // Server name (don't send hostname in production)
    serverName:
      environment === 'production' ? undefined : require('os').hostname(),
  });

  console.log(`Sentry initialized for ${environment} environment`);
} else {
  console.warn('Sentry DSN not configured, monitoring disabled');
}

// Helper functions
function isNonCriticalError(message: string): boolean {
  const nonCriticalPatterns = [
    'ECONNRESET',
    'EPIPE',
    'ENOTFOUND',
    'ETIMEDOUT',
    'Client disconnected',
    'Request aborted',
    'Connection terminated',
    'socket hang up',
    'premature close',
    'Connection lost',
    'Query read timeout',
    'Connection terminated unexpectedly',
  ];

  return nonCriticalPatterns.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
}

function enhanceErrorContext(event: any, hint: any) {
  // Add Node.js process information
  event.contexts = {
    ...event.contexts,
    runtime: {
      name: 'node',
      version: process.version,
    },
    os: {
      name: process.platform,
      version: require('os').release(),
    },
    app: {
      app_start_time: new Date(
        Date.now() - process.uptime() * 1000,
      ).toISOString(),
      app_memory: process.memoryUsage(),
    },
  };

  // Add environment variables (non-sensitive only)
  const safeEnvVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? '[REDACTED]' : undefined,
    REDIS_URL: process.env.REDIS_URL ? '[REDACTED]' : undefined,
  };

  event.contexts.environment = safeEnvVars;

  // Add request context if available
  if (hint.originalException?.request) {
    const req = hint.originalException.request;
    event.contexts.request_details = {
      body_size: req.body ? JSON.stringify(req.body).length : 0,
      has_files: !!req.files,
      is_authenticated: !!req.user,
    };
  }
}

// Export Sentry for use in other parts of the application
export { Sentry };
