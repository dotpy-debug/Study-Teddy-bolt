'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query';
import { analyticsApi } from '@/lib/api/analytics';
import { aiApi } from '@/lib/api/ai';
import type {
  NextBestAction,
  RecommendationContext,
  UserPreferences,
  ActionFeedback,
  RecommendationRequest,
  RecommendationResponse,
  UseRecommendationsResult,
  UsePreferencesResult,
  UseFeedbackResult,
  ActionCategory,
  ActionPriority
} from '../types/next-best-action';

// API functions for NBA system
const nbaApi = {
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    try {
      // First try to get AI-powered recommendations
      const response = await fetch('/api/ai/next-best-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        return response.json();
      }

      // Fallback to generating recommendations based on analytics data
      return generateFallbackRecommendations(request);
    } catch (error) {
      console.warn('AI recommendations failed, using fallback:', error);
      return generateFallbackRecommendations(request);
    }
  },

  async submitFeedback(feedback: ActionFeedback): Promise<void> {
    try {
      await fetch('/api/ai/next-best-actions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Store feedback locally for later sync
      const storedFeedback = localStorage.getItem('nba_pending_feedback');
      const pendingFeedback = storedFeedback ? JSON.parse(storedFeedback) : [];
      pendingFeedback.push(feedback);
      localStorage.setItem('nba_pending_feedback', JSON.stringify(pendingFeedback));
    }
  },

  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const response = await fetch('/api/ai/next-best-actions/preferences');
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.warn('Failed to fetch preferences, using defaults:', error);
    }

    // Return default preferences
    return getDefaultPreferences();
  },

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      await fetch('/api/ai/next-best-actions/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      // Store preferences locally as fallback
      const stored = localStorage.getItem('nba_user_preferences');
      const current = stored ? JSON.parse(stored) : getDefaultPreferences();
      localStorage.setItem('nba_user_preferences', JSON.stringify({
        ...current,
        ...preferences
      }));
    }
  }
};

// Fallback recommendation generator
async function generateFallbackRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
  const { context, maxRecommendations = 5 } = request;
  const recommendations: NextBestAction[] = [];

  // Get analytics data to inform recommendations
  try {
    const analyticsData = await analyticsApi.getDashboardAnalytics({
      timeRange: { period: 'week' }
    });

    if (analyticsData.data) {
      const { overview, subjects, goals } = analyticsData.data;

      // Generate study recommendations based on subject performance
      subjects.forEach((subject, index) => {
        if (recommendations.length >= maxRecommendations) return;

        if (subject.focusScore < 0.7 || Date.now() - new Date(subject.lastStudied || '').getTime() > 2 * 24 * 60 * 60 * 1000) {
          recommendations.push({
            id: `study-${subject.subjectId}-${Date.now()}`,
            category: 'study',
            priority: subject.focusScore < 0.5 ? 'high' : 'medium',
            title: `Review ${subject.subjectName}`,
            description: `Focus on ${subject.subjectName} to improve your performance. ${subject.focusScore < 0.7 ? 'Your recent focus score suggests this needs attention.' : 'It\'s been a while since your last session.'}`,
            estimatedTime: 45,
            impactScore: Math.round((1 - subject.focusScore) * 10),
            confidence: 0.8,
            reasoning: `Your focus score for ${subject.subjectName} is ${Math.round(subject.focusScore * 100)}%. Regular review sessions help maintain and improve performance.`,
            actionData: {
              subjectId: subject.subjectId,
              sessionType: 'focused-review'
            },
            createdAt: new Date().toISOString(),
            aiInsights: {
              bestTimeToAct: context.studyPatterns?.preferredHours?.length ?
                `${Math.min(...context.studyPatterns.preferredHours)}:00 AM - ${Math.max(...context.studyPatterns.preferredHours)}:00 PM` :
                'During your preferred study hours',
              successProbability: Math.max(0.6, subject.focusScore),
              relatedPatterns: ['Subject performance', 'Study consistency']
            }
          });
        }
      });

      // Generate break recommendation if needed
      if (context.userState?.todaysStudyTime && context.userState.todaysStudyTime > 120) {
        recommendations.push({
          id: `break-${Date.now()}`,
          category: 'break',
          priority: context.userState.todaysStudyTime > 180 ? 'high' : 'medium',
          title: 'Take a mindful break',
          description: `You've been studying for ${Math.round(context.userState.todaysStudyTime / 60)} hours today. A short break will help maintain your focus and prevent burnout.`,
          estimatedTime: 15,
          impactScore: 7,
          confidence: 0.9,
          reasoning: 'Research shows that regular breaks improve focus and retention. Taking breaks prevents mental fatigue and maintains productivity.',
          actionData: {
            sessionType: 'mindful-break'
          },
          createdAt: new Date().toISOString(),
          aiInsights: {
            bestTimeToAct: 'Now',
            successProbability: 0.95,
            relatedPatterns: ['Break timing', 'Productivity optimization']
          }
        });
      }

      // Generate goal-related recommendations
      goals.forEach(goal => {
        if (recommendations.length >= maxRecommendations) return;

        if (!goal.onTrack) {
          recommendations.push({
            id: `goal-${goal.goalId}-${Date.now()}`,
            category: 'goal',
            priority: goal.progress < 0.3 ? 'high' : 'medium',
            title: `Focus on "${goal.title}" goal`,
            description: `You're ${Math.round(goal.progress * 100)}% towards your goal. ${goal.deadline ? `With ${Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000))} days remaining, ` : ''}staying consistent will help you achieve this target.`,
            estimatedTime: 30,
            impactScore: 8,
            confidence: 0.75,
            reasoning: `Goal achievement requires consistent effort. You need ${goal.target - goal.current} more to reach your target.`,
            actionData: {
              goalId: goal.goalId
            },
            deadline: goal.deadline,
            createdAt: new Date().toISOString(),
            aiInsights: {
              successProbability: Math.max(0.4, goal.progress),
              relatedPatterns: ['Goal tracking', 'Progress momentum']
            }
          });
        }
      });
    }
  } catch (error) {
    console.warn('Failed to get analytics data for recommendations:', error);
  }

  // Add default recommendations if we don't have enough
  if (recommendations.length === 0) {
    recommendations.push({
      id: `default-study-${Date.now()}`,
      category: 'study',
      priority: 'medium',
      title: 'Start a focused study session',
      description: 'Begin a productive study session to make progress on your learning goals.',
      estimatedTime: 45,
      impactScore: 7,
      confidence: 0.7,
      reasoning: 'Regular study sessions are essential for academic progress and skill development.',
      actionData: {
        sessionType: 'focused-study'
      },
      createdAt: new Date().toISOString()
    });
  }

  return {
    recommendations: recommendations.slice(0, maxRecommendations),
    metadata: {
      totalPossibleActions: recommendations.length,
      filteredCount: recommendations.length,
      generationTime: Date.now(),
      modelVersion: 'fallback-v1.0',
      contextFactors: ['analytics-data', 'default-patterns'],
      confidence: 0.7
    }
  };
}

function getDefaultPreferences(): UserPreferences {
  return {
    enabledCategories: ['study', 'review', 'break', 'goal', 'schedule'],
    priorityFilter: 'all',
    maxRecommendations: 5,
    refreshInterval: 15,
    autoRefresh: true,
    notificationSettings: {
      highPriority: true,
      deadlineAlerts: true,
      optimalTimingAlerts: false,
      breakReminders: true,
      goalMilestones: true,
      adaptiveReminders: false
    },
    learningPreferences: {
      preferredSessionLength: 45,
      breakFrequency: 90,
      difficultSubjectsFirst: false,
      adaptToPerformance: true,
      energyBasedScheduling: false,
      contextSwitchingTolerance: 'medium'
    },
    schedulingPreferences: {
      preferredStudyHours: [9, 10, 11, 14, 15, 16],
      bufferTime: 15,
      autoScheduling: false,
      respectCalendarEvents: true,
      minimumSessionGap: 30,
      maximumDailyStudyHours: 8
    }
  };
}

// Custom hook for recommendations
export function useRecommendations(
  context: Partial<RecommendationContext>,
  options?: {
    maxRecommendations?: number;
    filters?: {
      categories?: ActionCategory[];
      priorities?: ActionPriority[];
    };
    enabled?: boolean;
  }
): UseRecommendationsResult {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const request: RecommendationRequest = useMemo(() => ({
    context,
    maxRecommendations: options?.maxRecommendations || 5,
    filters: options?.filters ? {
      categories: options.filters.categories,
      priorities: options.filters.priorities
    } : undefined
  }), [context, options?.maxRecommendations, options?.filters]);

  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.ai.all.concat(['nba-recommendations', request, lastRefresh]),
    queryFn: () => nbaApi.getRecommendations(request),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    enabled: options?.enabled !== false,
    retry: 2,
    retryDelay: 1000
  });

  const refresh = useCallback(() => {
    setLastRefresh(Date.now());
    queryClient.invalidateQueries({
      queryKey: queryKeys.ai.all.concat(['nba-recommendations'])
    });
  }, [queryClient]);

  return {
    recommendations: response?.recommendations || [],
    isLoading,
    error: error as Error | null,
    refetch,
    refresh,
    metadata: response?.metadata
  };
}

// Custom hook for user preferences
export function usePreferences(): UsePreferencesResult {
  const queryClient = useQueryClient();

  const {
    data: preferences,
    isLoading,
    error
  } = useQuery({
    queryKey: queryKeys.ai.all.concat(['nba-preferences']),
    queryFn: nbaApi.getUserPreferences,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1
  });

  const updateMutation = useMutation({
    mutationFn: nbaApi.updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.all.concat(['nba-preferences'])
      });
    }
  });

  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    await updateMutation.mutateAsync(newPreferences);
  }, [updateMutation]);

  const resetToDefaults = useCallback(async () => {
    await updateMutation.mutateAsync(getDefaultPreferences());
  }, [updateMutation]);

  return {
    preferences: preferences || null,
    isLoading,
    error: error as Error | null,
    updatePreferences,
    resetToDefaults
  };
}

// Custom hook for feedback submission
export function useFeedback(): UseFeedbackResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: nbaApi.submitFeedback,
    onSuccess: () => {
      // Invalidate recommendations to potentially get updated ones
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.all.concat(['nba-recommendations'])
      });
    }
  });

  const submitFeedback = useCallback(async (feedback: ActionFeedback) => {
    const feedbackWithTimestamp = {
      ...feedback,
      timestamp: new Date().toISOString()
    };
    await mutation.mutateAsync(feedbackWithTimestamp);
  }, [mutation]);

  return {
    submitFeedback,
    isSubmitting: mutation.isPending,
    error: mutation.error as Error | null
  };
}

// Custom hook for context building
export function useRecommendationContext(): Partial<RecommendationContext> {
  const [context, setContext] = useState<Partial<RecommendationContext>>({});

  // Get analytics data for context
  const { data: analyticsData } = useQuery({
    queryKey: queryKeys.analytics.dashboard(),
    queryFn: () => analyticsApi.getDashboardAnalytics({
      timeRange: { period: 'week' }
    }),
    staleTime: 5 * 60 * 1000
  });

  // Get study analytics for patterns
  const { data: studyAnalytics } = useQuery({
    queryKey: queryKeys.analytics.study(),
    queryFn: () => analyticsApi.getStudyAnalytics({
      timeRange: { period: 'month' }
    }),
    staleTime: 10 * 60 * 1000
  });

  // Get performance metrics
  const { data: performanceData } = useQuery({
    queryKey: queryKeys.analytics.performance(),
    queryFn: () => analyticsApi.getPerformanceMetrics({
      timeRange: { period: 'week' }
    }),
    staleTime: 10 * 60 * 1000
  });

  useEffect(() => {
    const newContext: Partial<RecommendationContext> = {
      currentTime: new Date().toISOString(),
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    if (analyticsData?.data) {
      const { overview, subjects, goals } = analyticsData.data;

      // Build study patterns from analytics
      newContext.studyPatterns = {
        preferredHours: [9, 10, 11, 14, 15, 16], // Default, would come from analytics
        averageSessionLength: 60, // Default, would come from analytics
        focusScores: subjects.reduce((acc, subject) => {
          acc[subject.subjectId] = subject.focusScore;
          return acc;
        }, {} as Record<string, number>),
        breakPatterns: {
          frequency: 90,
          averageDuration: 15,
          preferredBreakTypes: ['mindful-break', 'active-break']
        },
        productivityCurve: [], // Would be built from historical data
        subjectRotation: subjects.map(s => s.subjectId),
        weeklyDistribution: {}
      };

      // Build subject performance data
      newContext.subjectPerformance = subjects.reduce((acc, subject) => {
        acc[subject.subjectId] = {
          averageScore: subject.averageScore,
          timeSpent: subject.studyTime,
          lastStudied: subject.lastStudied || '',
          difficultyAreas: [],
          improvementTrend: 'stable',
          confidenceLevel: subject.focusScore,
          masteryLevel: subject.focusScore > 0.8 ? 'advanced' :
                       subject.focusScore > 0.6 ? 'intermediate' : 'beginner',
          recommendedFocusAreas: []
        };
        return acc;
      }, {} as Record<string, any>);

      // Build goal progress data
      newContext.goalProgress = goals.map(goal => ({
        goalId: goal.goalId,
        title: goal.title,
        type: goal.type as any,
        progress: goal.current,
        target: goal.target,
        deadline: goal.deadline,
        milestones: [],
        onTrack: goal.onTrack,
        estimatedCompletion: goal.estimatedCompletion
      }));

      // Add user state information
      newContext.userState = {
        energyLevel: 'medium',
        mood: 'good',
        motivation: 'medium',
        todaysStudyTime: overview.totalStudyTime,
        todaysBreakTime: 0,
        streakDays: overview.streakDays,
        fatigueLevel: overview.totalStudyTime > 240 ? 'moderate' : 'mild'
      };
    }

    if (performanceData?.data) {
      // Add recent session data
      newContext.recentSessions = performanceData.data.weeklyStats.map((week, index) => ({
        sessionId: `week-${index}`,
        subjectId: 'general',
        subjectName: 'General Study',
        duration: week.studyTime,
        focusScore: week.focusScore,
        completedTasks: week.tasksCompleted,
        distractions: 0,
        completedAt: week.week,
        sessionType: 'focused-study' as const
      }));
    }

    setContext(newContext);
  }, [analyticsData, studyAnalytics, performanceData]);

  return context;
}

// Custom hook for dismissed actions
export function useDismissedActions() {
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());

  const dismiss = useCallback((actionId: string) => {
    setDismissedActions(prev => new Set([...prev, actionId]));
  }, []);

  const undismiss = useCallback((actionId: string) => {
    setDismissedActions(prev => {
      const newSet = new Set(prev);
      newSet.delete(actionId);
      return newSet;
    });
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissedActions(new Set());
  }, []);

  return {
    dismissedActions,
    dismiss,
    undismiss,
    clearDismissed
  };
}

// Custom hook for action execution
export function useActionExecution() {
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());

  const executeAction = useCallback(async (action: NextBestAction) => {
    setExecutingActions(prev => new Set([...prev, action.id]));

    try {
      // Implement action execution logic based on action type
      switch (action.category) {
        case 'study':
          // Navigate to study session or start timer
          console.log('Starting study session:', action);
          break;
        case 'break':
          // Start break timer or show break suggestions
          console.log('Starting break:', action);
          break;
        case 'goal':
          // Navigate to goal management
          console.log('Managing goal:', action);
          break;
        case 'schedule':
          // Open calendar or scheduling interface
          console.log('Opening scheduler:', action);
          break;
        case 'review':
          // Start review session
          console.log('Starting review:', action);
          break;
      }

      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { success: true, message: 'Action executed successfully' };
    } catch (error) {
      console.error('Failed to execute action:', error);
      return { success: false, message: 'Failed to execute action' };
    } finally {
      setExecutingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(action.id);
        return newSet;
      });
    }
  }, []);

  return {
    executeAction,
    executingActions,
    isExecuting: (actionId: string) => executingActions.has(actionId)
  };
}