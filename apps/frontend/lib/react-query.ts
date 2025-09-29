import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized settings for Study Teddy
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes for most data
      staleTime: 5 * 60 * 1000,
      // Cache time: 10 minutes
      gcTime: 10 * 60 * 1000,
      // Refetch on window focus for real-time data
      refetchOnWindowFocus: true,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetching for better UX
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Mutations don't need retry delay
      retryDelay: 0,
    },
  },
});

// Query keys factory for consistent key naming
export const queryKeys = {
  // Users
  users: {
    all: ['users'] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    stats: () => [...queryKeys.users.all, 'stats'] as const,
    achievements: () => [...queryKeys.users.all, 'achievements'] as const,
    activity: (filters?: any) => [...queryKeys.users.all, 'activity', filters] as const,
    sessions: () => [...queryKeys.users.all, 'sessions'] as const,
  },

  // Authentication
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    status: () => [...queryKeys.auth.all, 'status'] as const,
  },

  // Subjects
  subjects: {
    all: ['subjects'] as const,
    list: (filters?: any) => [...queryKeys.subjects.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.subjects.all, 'detail', id] as const,
    active: () => [...queryKeys.subjects.all, 'active'] as const,
    stats: (id?: string, timeRange?: string) => [...queryKeys.subjects.all, 'stats', id, timeRange] as const,
    progress: (id: string) => [...queryKeys.subjects.all, 'progress', id] as const,
    schedule: (id?: string) => [...queryKeys.subjects.all, 'schedule', id] as const,
    resources: (id: string) => [...queryKeys.subjects.all, 'resources', id] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    list: (filters?: any) => [...queryKeys.tasks.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
    today: () => [...queryKeys.tasks.all, 'today'] as const,
    upcoming: () => [...queryKeys.tasks.all, 'upcoming'] as const,
    overdue: () => [...queryKeys.tasks.all, 'overdue'] as const,
    stats: () => [...queryKeys.tasks.all, 'stats'] as const,
    studySessions: (taskId?: string) => [...queryKeys.tasks.all, 'study-sessions', taskId] as const,
  },

  // Focus Sessions
  focusSessions: {
    all: ['focus-sessions'] as const,
    list: (filters?: any) => [...queryKeys.focusSessions.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.focusSessions.all, 'detail', id] as const,
    active: () => [...queryKeys.focusSessions.all, 'active'] as const,
    paused: () => [...queryKeys.focusSessions.all, 'paused'] as const,
    status: (id: string) => [...queryKeys.focusSessions.all, 'status', id] as const,
    stats: (filters?: any) => [...queryKeys.focusSessions.all, 'stats', filters] as const,
    analytics: (id: string) => [...queryKeys.focusSessions.all, 'analytics', id] as const,
  },

  // Pomodoro
  pomodoro: {
    all: ['pomodoro'] as const,
    session: (sessionId: string) => [...queryKeys.pomodoro.all, 'session', sessionId] as const,
    settings: () => [...queryKeys.pomodoro.all, 'settings'] as const,
  },

  // AI
  ai: {
    all: ['ai'] as const,
    providers: () => [...queryKeys.ai.all, 'providers'] as const,
    usage: () => [...queryKeys.ai.all, 'usage'] as const,
    budget: () => [...queryKeys.ai.all, 'budget'] as const,
    history: (filters?: any) => [...queryKeys.ai.all, 'history', filters] as const,
    conversation: (id: string) => [...queryKeys.ai.all, 'conversation', id] as const,
    conversations: () => [...queryKeys.ai.all, 'conversations'] as const,
    health: () => [...queryKeys.ai.all, 'health'] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    study: (filters?: any) => [...queryKeys.analytics.all, 'study', filters] as const,
    subjects: (filters?: any) => [...queryKeys.analytics.all, 'subjects', filters] as const,
    performance: (filters?: any) => [...queryKeys.analytics.all, 'performance', filters] as const,
    insights: (filters?: any) => [...queryKeys.analytics.all, 'insights', filters] as const,
    goals: (goalIds?: string[]) => [...queryKeys.analytics.all, 'goals', goalIds] as const,
    dashboard: (filters?: any) => [...queryKeys.analytics.all, 'dashboard', filters] as const,
    comparison: (current: any, previous: any) => [...queryKeys.analytics.all, 'comparison', current, previous] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: any) => [...queryKeys.notifications.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.notifications.all, 'detail', id] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    stats: () => [...queryKeys.notifications.all, 'stats'] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
  },

  // Calendar
  calendar: {
    all: ['calendar'] as const,
    events: (filters?: any) => [...queryKeys.calendar.all, 'events', filters] as const,
    event: (id: string) => [...queryKeys.calendar.all, 'event', id] as const,
    integrations: () => [...queryKeys.calendar.all, 'integrations'] as const,
    googleCalendars: () => [...queryKeys.calendar.all, 'google-calendars'] as const,
    stats: (timeRange?: string) => [...queryKeys.calendar.all, 'stats', timeRange] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    overview: () => [...queryKeys.dashboard.all, 'overview'] as const,
    todayStats: () => [...queryKeys.dashboard.all, 'today-stats'] as const,
    weekStats: () => [...queryKeys.dashboard.all, 'week-stats'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recent-activity'] as const,
    upcomingTasks: () => [...queryKeys.dashboard.all, 'upcoming-tasks'] as const,
    currentSession: () => [...queryKeys.dashboard.all, 'current-session'] as const,
  },
} as const;

// Query invalidation helpers
export const invalidateQueries = {
  // Invalidate all queries for a specific entity
  users: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
  subjects: () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all }),
  tasks: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
  focusSessions: () => queryClient.invalidateQueries({ queryKey: queryKeys.focusSessions.all }),
  analytics: () => queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
  notifications: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  calendar: () => queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),

  // Invalidate related queries when certain actions occur
  onTaskUpdate: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  },

  onSubjectUpdate: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  },

  onSessionUpdate: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.focusSessions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
  },

  onNotificationUpdate: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },

  onCalendarUpdate: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },

  // Invalidate everything (use sparingly)
  all: () => queryClient.invalidateQueries(),
};

// Optimistic update helpers
export const optimisticUpdates = {
  // Update task completion status
  updateTaskStatus: (taskId: string, status: string) => {
    queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: any) => {
      if (!old) return old;
      return { ...old, status };
    });
  },

  // Update notification read status
  markNotificationAsRead: (notificationId: string) => {
    queryClient.setQueryData(queryKeys.notifications.detail(notificationId), (old: any) => {
      if (!old) return old;
      return { ...old, isRead: true, readAt: new Date().toISOString() };
    });
  },

  // Update session status
  updateSessionStatus: (sessionId: string, status: string) => {
    queryClient.setQueryData(queryKeys.focusSessions.detail(sessionId), (old: any) => {
      if (!old) return old;
      return { ...old, status };
    });
  },
};

// Prefetch commonly used queries
export const prefetchQueries = {
  dashboard: async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.overview(),
        staleTime: 2 * 60 * 1000, // 2 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.tasks.today(),
        staleTime: 1 * 60 * 1000, // 1 minute
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.focusSessions.active(),
        staleTime: 30 * 1000, // 30 seconds
      }),
    ]);
  },

  subjects: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.subjects.active(),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },

  userProfile: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.users.profile(),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  },
};

// Background sync for real-time data
export const backgroundSync = {
  startActiveSessionPolling: (sessionId: string) => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.focusSessions.status(sessionId),
      });
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  },

  startNotificationPolling: () => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unread(),
      });
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  },
};

// Error handling utilities
export const queryErrorHandler = (error: any) => {
  console.error('Query error:', error);

  // Handle specific error types
  if (error?.status === 401) {
    // Redirect to login or refresh auth token
    window.location.href = '/auth/login';
  } else if (error?.status === 403) {
    // Handle permission errors
    console.warn('Permission denied');
  } else if (error?.status >= 500) {
    // Handle server errors
    console.error('Server error');
  }
};

// Dev tools configuration
export const devtools = {
  // Enable React Query Devtools only in development
  enabled: process.env.NODE_ENV === 'development',
  initialIsOpen: false,
  position: 'bottom-right' as const,
};