import * as Sentry from '@sentry/nextjs';
import { Integrations } from '@sentry/integrations';
import { BrowserTracing, Replay } from '@sentry/nextjs';

const environment = process.env.NODE_ENV || 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,

  // Performance monitoring
  tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

  // Enable profiling for performance insights
  profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

  // Error tracking settings
  beforeSend(event, hint) {
    // Filter out development errors
    if (environment === 'development') {
      console.warn('Sentry event:', event);
    }

    // Filter out bot traffic
    if (event.request?.headers?.['user-agent']?.includes('bot')) {
      return null;
    }

    return event;
  },

  // Integrations for enhanced monitoring
  integrations: [
    new BrowserTracing({
      // Web Vitals monitoring
      enableWebVitals: true,
      // Route change tracking
      routingInstrumentation: Sentry.nextRouterInstrumentation({
        beforeNavigate: (context) => {
          return {
            ...context,
            // Track page views with custom metadata
            tags: {
              'page.type': context.pathname?.includes('/dashboard') ? 'dashboard' : 'public',
              'auth.status': context.pathname?.includes('/auth') ? 'unauthenticated' : 'authenticated',
              'feature.area': getFeatureArea(context.pathname),
            },
          };
        },
      }),
      // Custom transaction names for better organization
      beforeStartSpan: (context) => {
        context.name = getCustomTransactionName(context.name);
        return context;
      },
    }),
    new Integrations.HttpContext(),
    new Integrations.CaptureConsole({
      levels: ['error', 'warn'],
    }),
    // Session Replay for debugging (only in production with sampling)
    new Replay({
      // Session sampling: capture 10% of all sessions
      sessionSampleRate: environment === 'production' ? 0.1 : 1.0,
      // Error sampling: capture 100% of sessions with errors
      errorSampleRate: 1.0,
      // Privacy settings
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      // Only capture replays for critical pages
      beforeAddBreadcrumb: (breadcrumb) => {
        // Filter out sensitive breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.data?.logger?.includes('password')) {
          return null;
        }
        return breadcrumb;
      },
    }),
    // Custom integration for tracking user interactions
    new Integrations.ExtraErrorData({
      depth: 10,
    }),
  ],

  // Session tracking
  autoSessionTracking: true,

  // User feedback
  showReportDialog: false, // We'll implement custom feedback UI

  // Release tracking
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Custom tags
  initialScope: {
    tags: {
      component: 'frontend',
      app: 'studyteddy',
    },
  },

  // Performance budget settings
  beforeSendTransaction(event) {
    // Track Core Web Vitals performance
    if (event.transaction) {
      const duration = event.timestamp! - event.start_timestamp!;

      // Alert on slow transactions (>300ms as per PRD)
      if (duration > 0.3) {
        Sentry.addBreadcrumb({
          message: `Slow transaction detected: ${event.transaction}`,
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

  // Bundle size monitoring (250KB gzipped limit per PRD)
  beforeSend(event) {
    if (event.exception) {
      // Track bundle size issues
      const bundleError = event.exception.values?.some(
        exception => exception.value?.includes('ChunkLoadError') ||
                    exception.value?.includes('Loading chunk')
      );

      if (bundleError) {
        event.tags = {
          ...event.tags,
          errorType: 'bundle_load_error',
          priority: 'high',
        };
      }
    }

    return event;
  },
});

// Custom performance monitoring for Web Vitals
if (typeof window !== 'undefined') {
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB }) => {
    onCLS((metric) => {
      Sentry.addBreadcrumb({
        message: 'Core Web Vital: CLS',
        level: 'info',
        data: metric,
      });

      // Alert if CLS is poor (>0.25)
      if (metric.value > 0.25) {
        Sentry.captureMessage('Poor CLS detected', 'warning');
      }
    });

    // Note: FID is deprecated in web-vitals v4+, replaced by INP
    
    onFCP((metric) => {
      Sentry.addBreadcrumb({
        message: 'Core Web Vital: FCP',
        level: 'info',
        data: metric,
      });

      // Alert if FCP is poor (>3000ms)
      if (metric.value > 3000) {
        Sentry.captureMessage('Poor FCP detected', 'warning');
      }
    });

    onLCP((metric) => {
      Sentry.addBreadcrumb({
        message: 'Core Web Vital: LCP',
        level: 'info',
        data: metric,
      });

      // Alert if LCP is poor (>4000ms)
      if (metric.value > 4000) {
        Sentry.captureMessage('Poor LCP detected', 'warning');
      }
    });

    onTTFB((metric) => {
      Sentry.addBreadcrumb({
        message: 'Core Web Vital: TTFB',
        level: 'info',
        data: metric,
      });

      // Alert if TTFB is poor (>1800ms)
      if (metric.value > 1800) {
        Sentry.captureMessage('Poor TTFB detected', 'warning');
      }
    });
  });
}

// Helper functions
function getFeatureArea(pathname?: string): string {
  if (!pathname) return 'unknown';

  if (pathname.includes('/dashboard')) return 'dashboard';
  if (pathname.includes('/tasks')) return 'task-management';
  if (pathname.includes('/study')) return 'study-sessions';
  if (pathname.includes('/focus')) return 'focus-mode';
  if (pathname.includes('/ai')) return 'ai-features';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/auth')) return 'authentication';

  return 'public';
}

function getCustomTransactionName(originalName: string): string {
  // Clean up transaction names for better organization
  if (originalName.startsWith('pageload')) {
    const route = originalName.replace('pageload', '').trim();
    const featureArea = getFeatureArea(route);
    return `Page Load: ${featureArea}${route}`;
  }

  if (originalName.startsWith('navigation')) {
    return `Navigation: ${originalName.replace('navigation', '').trim()}`;
  }

  return originalName;
}

// Export utility functions for use in components
export const SentryUtils = {
  // Track user actions
  trackUserAction: (action: string, data?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      message: `User Action: ${action}`,
      level: 'info',
      category: 'user',
      data,
    });
  },

  // Track feature usage
  trackFeatureUsage: (feature: string, context?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      scope.setTag('feature', feature);
      scope.setContext('feature_context', context);

      Sentry.addBreadcrumb({
        message: `Feature Used: ${feature}`,
        level: 'info',
        category: 'feature',
        data: context,
      });
    });
  },

  // Track API calls from frontend
  trackAPICall: (endpoint: string, method: string, duration?: number) => {
    Sentry.addBreadcrumb({
      message: `API Call: ${method.toUpperCase()} ${endpoint}`,
      level: 'info',
      category: 'http',
      data: {
        method,
        endpoint,
        duration,
      },
    });

    // Alert on slow API calls from frontend
    if (duration && duration > 3000) {
      Sentry.captureMessage(`Slow API call detected: ${method} ${endpoint}`, 'warning');
    }
  },

  // Set user context
  setUserContext: (user: { id: string; email?: string; [key: string]: any }) => {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      ...user,
    });
  },

  // Track custom metrics
  trackMetric: (name: string, value: number, tags?: Record<string, string>) => {
    Sentry.withScope((scope) => {
      if (tags) {
        Object.entries(tags).forEach(([key, val]) => {
          scope.setTag(key, val);
        });
      }

      Sentry.addBreadcrumb({
        message: `Metric: ${name}`,
        level: 'info',
        category: 'metric',
        data: { name, value, tags },
      });
    });
  },

  // Track study session events
  trackStudySession: (event: 'start' | 'pause' | 'resume' | 'complete', sessionData?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      scope.setTag('study_session_event', event);
      scope.setContext('study_session', sessionData);

      Sentry.addBreadcrumb({
        message: `Study Session: ${event}`,
        level: 'info',
        category: 'study',
        data: sessionData,
      });
    });
  },

  // Track AI interactions
  trackAIInteraction: (type: 'query' | 'generation' | 'analysis', data?: Record<string, any>) => {
    Sentry.withScope((scope) => {
      scope.setTag('ai_interaction', type);
      scope.setContext('ai_context', data);

      Sentry.addBreadcrumb({
        message: `AI Interaction: ${type}`,
        level: 'info',
        category: 'ai',
        data,
      });
    });
  },
};

// Performance observer for additional metrics
if (typeof window !== 'undefined') {
  // Track custom performance metrics
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure') {
        SentryUtils.trackMetric(entry.name, entry.duration, {
          type: 'custom_measure',
        });
      }

      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;

        // Track navigation metrics
        SentryUtils.trackMetric('navigation.dom_complete', navEntry.domComplete - navEntry.fetchStart);
        SentryUtils.trackMetric('navigation.load_complete', navEntry.loadEventEnd - navEntry.fetchStart);
        SentryUtils.trackMetric('navigation.dns_lookup', navEntry.domainLookupEnd - navEntry.domainLookupStart);
        SentryUtils.trackMetric('navigation.tcp_connection', navEntry.connectEnd - navEntry.connectStart);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['measure', 'navigation'] });
  } catch (error) {
    // Ignore if not supported
  }
}