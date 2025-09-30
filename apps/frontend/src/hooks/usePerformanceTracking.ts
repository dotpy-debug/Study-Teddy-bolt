import { useEffect, useCallback, useRef } from 'react';
import { performanceMonitor } from '../lib/performance/performance-monitor';
import { SentryUtils } from '../../sentry.client.config';

/**
 * Hook to track component render performance
 */
export function useRenderTracking(componentName: string) {
  const renderStart = useRef<number>(0);

  useEffect(() => {
    renderStart.current = performance.now();
  });

  useEffect(() => {
    const renderDuration = performance.now() - renderStart.current;
    performanceMonitor.trackComponentRender(componentName, renderDuration);
  });
}

/**
 * Hook to track user interactions
 */
export function useInteractionTracking() {
  const trackClick = useCallback((elementName: string, metadata?: Record<string, any>) => {
    SentryUtils.trackUserAction('click', {
      element: elementName,
      timestamp: Date.now(),
      ...metadata,
    });
  }, []);

  const trackFormSubmit = useCallback((formName: string, success: boolean, metadata?: Record<string, any>) => {
    SentryUtils.trackUserAction('form_submit', {
      form: formName,
      success,
      timestamp: Date.now(),
      ...metadata,
    });
  }, []);

  const trackNavigation = useCallback((from: string, to: string, metadata?: Record<string, any>) => {
    SentryUtils.trackUserAction('navigation', {
      from,
      to,
      timestamp: Date.now(),
      ...metadata,
    });
  }, []);

  const trackFeatureUsage = useCallback((feature: string, context?: Record<string, any>) => {
    SentryUtils.trackFeatureUsage(feature, {
      timestamp: Date.now(),
      ...context,
    });
  }, []);

  return {
    trackClick,
    trackFormSubmit,
    trackNavigation,
    trackFeatureUsage,
  };
}

/**
 * Hook to track user journeys
 */
export function useJourneyTracking(journeyName: string) {
  const journeyIdRef = useRef<string>('');

  const startJourney = useCallback(() => {
    journeyIdRef.current = `${journeyName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    performanceMonitor.startUserJourney(journeyIdRef.current, journeyName);
  }, [journeyName]);

  const addStep = useCallback((stepName: string, metadata?: Record<string, any>) => {
    if (journeyIdRef.current) {
      performanceMonitor.addJourneyStep(journeyIdRef.current, stepName, metadata);
    }
  }, []);

  const completeJourney = useCallback((success: boolean = true) => {
    if (journeyIdRef.current) {
      performanceMonitor.completeUserJourney(journeyIdRef.current, success);
      journeyIdRef.current = '';
    }
  }, []);

  // Auto-start journey when hook is first used
  useEffect(() => {
    startJourney();
    return () => {
      // Auto-complete journey on unmount
      if (journeyIdRef.current) {
        completeJourney(false); // Assume incomplete if component unmounts
      }
    };
  }, [startJourney, completeJourney]);

  return {
    addStep,
    completeJourney,
    restartJourney: startJourney,
  };
}

/**
 * Hook to track API calls
 */
export function useAPITracking() {
  const trackAPICall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> => {
    const startTime = performance.now();
    let status = 200;

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      performanceMonitor.trackAPICall(endpoint, method, duration, status);
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      status = error.status || error.response?.status || 500;
      performanceMonitor.trackAPICall(endpoint, method, duration, status);

      // Track API errors
      SentryUtils.trackUserAction('api_error', {
        endpoint,
        method,
        status,
        error: error.message,
        duration,
      });

      throw error;
    }
  }, []);

  return { trackAPICall };
}

/**
 * Hook to track study session performance
 */
export function useStudySessionTracking() {
  const sessionStartRef = useRef<number>(0);
  const focusTimeRef = useRef<number>(0);
  const pausesRef = useRef<number>(0);

  const startSession = useCallback((sessionType: string, metadata?: Record<string, any>) => {
    sessionStartRef.current = Date.now();
    focusTimeRef.current = 0;
    pausesRef.current = 0;

    SentryUtils.trackStudySession('start', {
      type: sessionType,
      startTime: sessionStartRef.current,
      ...metadata,
    });
  }, []);

  const pauseSession = useCallback(() => {
    pausesRef.current += 1;
    SentryUtils.trackStudySession('pause', {
      pauseCount: pausesRef.current,
      sessionDuration: Date.now() - sessionStartRef.current,
    });
  }, []);

  const resumeSession = useCallback(() => {
    SentryUtils.trackStudySession('resume', {
      pauseCount: pausesRef.current,
      sessionDuration: Date.now() - sessionStartRef.current,
    });
  }, []);

  const completeSession = useCallback((completed: boolean = true, metadata?: Record<string, any>) => {
    const totalDuration = Date.now() - sessionStartRef.current;

    SentryUtils.trackStudySession('complete', {
      completed,
      totalDuration,
      focusTime: focusTimeRef.current,
      pauseCount: pausesRef.current,
      efficiency: focusTimeRef.current / totalDuration,
      ...metadata,
    });

    // Track performance metrics
    performanceMonitor.trackMetric({
      name: 'study_session.duration',
      value: totalDuration,
      unit: 'ms',
      tags: {
        completed: completed.toString(),
        type: 'study_session',
      },
    });
  }, []);

  const addFocusTime = useCallback((duration: number) => {
    focusTimeRef.current += duration;
  }, []);

  return {
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    addFocusTime,
  };
}

/**
 * Hook to track AI interaction performance
 */
export function useAITracking() {
  const trackAIInteraction = useCallback(async <T>(
    aiCall: () => Promise<T>,
    interactionType: 'query' | 'generation' | 'analysis',
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      performanceMonitor.startMeasure(`ai_${interactionType}_${Date.now()}`);

      const result = await aiCall();
      const duration = performance.now() - startTime;

      SentryUtils.trackAIInteraction(interactionType, {
        duration,
        success: true,
        ...metadata,
      });

      // Track AI performance metrics
      performanceMonitor.trackMetric({
        name: `ai.${interactionType}.duration`,
        value: duration,
        unit: 'ms',
        tags: {
          type: interactionType,
          success: 'true',
        },
      });

      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;

      SentryUtils.trackAIInteraction(interactionType, {
        duration,
        success: false,
        error: error.message,
        ...metadata,
      });

      // Track AI errors
      performanceMonitor.trackMetric({
        name: `ai.${interactionType}.error`,
        value: duration,
        unit: 'ms',
        tags: {
          type: interactionType,
          success: 'false',
          error: error.message,
        },
      });

      throw error;
    }
  }, []);

  return { trackAIInteraction };
}

/**
 * Hook to track page load performance
 */
export function usePageLoadTracking(pageName: string) {
  useEffect(() => {
    // Track page load when component mounts
    const loadTime = performance.now();

    // Wait for next tick to ensure rendering is complete
    setTimeout(() => {
      const renderTime = performance.now() - loadTime;

      performanceMonitor.trackMetric({
        name: `page.load.${pageName}`,
        value: renderTime,
        unit: 'ms',
        tags: {
          page: pageName,
          type: 'page_load',
        },
      });

      SentryUtils.trackUserAction('page_load', {
        page: pageName,
        loadTime: renderTime,
        timestamp: Date.now(),
      });
    }, 0);
  }, [pageName]);
}

/**
 * Hook to track form performance
 */
export function useFormTracking(formName: string) {
  const formStartRef = useRef<number>(0);
  const interactionsRef = useRef<number>(0);

  const startForm = useCallback(() => {
    formStartRef.current = Date.now();
    interactionsRef.current = 0;

    SentryUtils.trackUserAction('form_start', {
      form: formName,
      startTime: formStartRef.current,
    });
  }, [formName]);

  const trackInteraction = useCallback((fieldName: string, interactionType: string) => {
    interactionsRef.current += 1;

    SentryUtils.trackUserAction('form_interaction', {
      form: formName,
      field: fieldName,
      interactionType,
      interactionCount: interactionsRef.current,
    });
  }, [formName]);

  const completeForm = useCallback((success: boolean, validationErrors?: string[]) => {
    const completionTime = Date.now() - formStartRef.current;

    SentryUtils.trackUserAction('form_complete', {
      form: formName,
      success,
      completionTime,
      interactions: interactionsRef.current,
      validationErrors,
    });

    // Track form performance
    performanceMonitor.trackMetric({
      name: `form.completion.${formName}`,
      value: completionTime,
      unit: 'ms',
      tags: {
        form: formName,
        success: success.toString(),
        type: 'form_completion',
      },
    });
  }, [formName]);

  useEffect(() => {
    startForm();
  }, [startForm]);

  return {
    trackInteraction,
    completeForm,
  };
}