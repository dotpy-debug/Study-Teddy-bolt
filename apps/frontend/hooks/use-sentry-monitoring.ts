import { useEffect, useCallback, useRef } from 'react';
import * as Sentry from '@sentry/nextjs';
import { performanceMonitor } from '@/lib/monitoring';

export interface MonitoringOptions {
  trackRender?: boolean;
  trackInteractions?: boolean;
  trackErrors?: boolean;
  componentName?: string;
}

export function useSentryMonitoring(options: MonitoringOptions = {}) {
  const {
    trackRender = true,
    trackInteractions = true,
    trackErrors = true,
    componentName = 'Unknown Component',
  } = options;

  const renderStartRef = useRef<string | null>(null);
  const interactionCountRef = useRef(0);

  // Track component render performance
  useEffect(() => {
    if (trackRender) {
      renderStartRef.current = performanceMonitor.startRender(componentName);

      return () => {
        if (renderStartRef.current) {
          performanceMonitor.endRender(componentName, renderStartRef.current);
        }
      };
    }
  }, [componentName, trackRender]);

  // Track user interactions
  const trackInteraction = useCallback(
    (action: string, element: string, metadata?: Record<string, any>) => {
      if (!trackInteractions) return;

      interactionCountRef.current += 1;

      performanceMonitor.trackUserInteraction(action, element, {
        ...metadata,
        component: componentName,
        interactionCount: interactionCountRef.current,
      });

      // Track interaction in Sentry
      Sentry.addBreadcrumb({
        message: `User interaction: ${action} on ${element}`,
        level: 'info',
        category: 'ui.interaction',
        data: {
          action,
          element,
          component: componentName,
          ...metadata,
        },
      });
    },
    [componentName, trackInteractions],
  );

  // Track API calls with Sentry context
  const trackAPICall = useCallback(
    (endpoint: string, method: string = 'GET') => {
      const apiTracker = performanceMonitor.trackAPICall(endpoint, method);

      return {
        finish: (status: number, error?: Error, responseData?: any) => {
          // Add component context to Sentry
          Sentry.withScope((scope) => {
            scope.setContext('component', {
              name: componentName,
              apiCall: `${method} ${endpoint}`,
              status,
            });

            if (error) {
              scope.setTag('api_error', true);
              Sentry.captureException(error);
            }

            if (responseData) {
              scope.setContext('response', {
                size: JSON.stringify(responseData).length,
                type: typeof responseData,
              });
            }
          });

          apiTracker.finish(status, error);
        },
      };
    },
    [componentName],
  );

  // Track custom metrics
  const trackCustomMetric = useCallback(
    (name: string, value: number, unit: string = 'ms', metadata?: Record<string, any>) => {
      performanceMonitor.trackCustomMetric(name, value, unit);

      // Send to Sentry as well
      Sentry.addBreadcrumb({
        message: `Custom metric: ${name}`,
        level: 'info',
        category: 'performance',
        data: {
          name,
          value,
          unit,
          component: componentName,
          ...metadata,
        },
      });
    },
    [componentName],
  );

  // Track errors with component context
  const trackError = useCallback(
    (error: Error, context?: Record<string, any>) => {
      if (!trackErrors) return;

      Sentry.withScope((scope) => {
        scope.setContext('component', {
          name: componentName,
          ...context,
        });

        scope.setTag('component_error', true);
        scope.setLevel('error');

        Sentry.captureException(error);
      });
    },
    [componentName, trackErrors],
  );

  // Track page views
  const trackPageView = useCallback(
    (pageName: string, metadata?: Record<string, any>) => {
      performanceMonitor.trackPageLoad(pageName);

      Sentry.addBreadcrumb({
        message: `Page view: ${pageName}`,
        level: 'info',
        category: 'navigation',
        data: {
          page: pageName,
          component: componentName,
          ...metadata,
        },
      });
    },
    [componentName],
  );

  return {
    trackInteraction,
    trackAPICall,
    trackCustomMetric,
    trackError,
    trackPageView,
  };
}

// Hook for tracking form submissions
export function useFormMonitoring(formName: string) {
  const { trackInteraction, trackError, trackCustomMetric } = useSentryMonitoring({
    componentName: `Form: ${formName}`,
  });

  const trackFormSubmission = useCallback(
    (success: boolean, validationErrors?: string[], submissionTime?: number) => {
      const action = success ? 'form_submit_success' : 'form_submit_error';

      trackInteraction(action, formName, {
        success,
        validationErrors,
        submissionTime,
      });

      if (submissionTime) {
        trackCustomMetric('form_submission_time', submissionTime, 'ms', {
          formName,
          success,
        });
      }

      // Track form success/error rates
      Sentry.addBreadcrumb({
        message: `Form submission: ${formName}`,
        level: success ? 'info' : 'warning',
        category: 'form',
        data: {
          formName,
          success,
          validationErrors,
          submissionTime,
        },
      });
    },
    [formName, trackInteraction, trackCustomMetric],
  );

  const trackFormValidation = useCallback(
    (fieldName: string, isValid: boolean, errorMessage?: string) => {
      trackInteraction('form_validation', fieldName, {
        isValid,
        errorMessage,
      });
    },
    [trackInteraction],
  );

  return {
    trackFormSubmission,
    trackFormValidation,
    trackError,
  };
}

// Hook for tracking AI interactions
export function useAIMonitoring() {
  const { trackAPICall, trackCustomMetric, trackError } = useSentryMonitoring({
    componentName: 'AI Interaction',
  });

  const trackAIRequest = useCallback(
    (operationType: string, inputTokens?: number, metadata?: Record<string, any>) => {
      const startTime = performance.now();

      const transaction = Sentry.startTransaction({
        name: `AI: ${operationType}`,
        op: 'ai.request',
      });

      transaction.setContext('ai', {
        operationType,
        inputTokens,
        ...metadata,
      });

      return {
        finish: (
          success: boolean,
          outputTokens?: number,
          error?: Error,
          responseData?: any,
        ) => {
          const duration = performance.now() - startTime;

          transaction.setData('duration', duration);
          transaction.setData('success', success);
          transaction.setData('inputTokens', inputTokens || 0);
          transaction.setData('outputTokens', outputTokens || 0);

          if (success) {
            transaction.setStatus('ok');
          } else {
            transaction.setStatus('internal_error');
            if (error) {
              trackError(error, {
                operationType,
                inputTokens,
                outputTokens,
              });
            }
          }

          // Track AI usage metrics
          trackCustomMetric('ai_request_duration', duration, 'ms', {
            operationType,
            success,
          });

          if (inputTokens) {
            trackCustomMetric('ai_input_tokens', inputTokens, 'tokens', {
              operationType,
            });
          }

          if (outputTokens) {
            trackCustomMetric('ai_output_tokens', outputTokens, 'tokens', {
              operationType,
            });
          }

          transaction.finish();
        },
      };
    },
    [trackAPICall, trackCustomMetric, trackError],
  );

  return {
    trackAIRequest,
  };
}

// Hook for tracking authentication flows
export function useAuthMonitoring() {
  const { trackInteraction, trackError, trackCustomMetric } = useSentryMonitoring({
    componentName: 'Authentication',
  });

  const trackAuthAttempt = useCallback(
    (method: 'login' | 'register' | 'oauth', provider?: string) => {
      const startTime = performance.now();

      return {
        finish: (success: boolean, error?: Error, userId?: string) => {
          const duration = performance.now() - startTime;

          trackInteraction(`auth_${method}`, provider || 'email', {
            success,
            duration,
            userId,
          });

          trackCustomMetric('auth_attempt_duration', duration, 'ms', {
            method,
            provider,
            success,
          });

          if (success && userId) {
            Sentry.setUser({ id: userId });
          }

          if (error) {
            trackError(error, {
              method,
              provider,
              duration,
            });
          }
        },
      };
    },
    [trackInteraction, trackCustomMetric, trackError],
  );

  const trackAuthStateChange = useCallback(
    (newState: 'authenticated' | 'unauthenticated' | 'loading', userId?: string) => {
      trackInteraction('auth_state_change', newState, { userId });

      if (newState === 'authenticated' && userId) {
        Sentry.setUser({ id: userId });
      } else if (newState === 'unauthenticated') {
        Sentry.setUser(null);
      }
    },
    [trackInteraction],
  );

  return {
    trackAuthAttempt,
    trackAuthStateChange,
  };
}