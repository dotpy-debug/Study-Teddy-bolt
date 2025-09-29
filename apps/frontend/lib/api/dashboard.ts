import { apiClient, type ApiError } from './client';
import type {
  DashboardStats,
  WeeklyOverview,
  StudyStreak,
  SubjectStats,
  PerformanceMetrics,
  DashboardFilters
} from '@studyteddy/shared';

// Dashboard result interface
export interface DashboardResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

// Analytics time range
export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

// Study analytics interface
export interface StudyAnalytics {
  totalStudyTime: number; // minutes
  averageSessionLength: number; // minutes
  mostProductiveHour: number; // 0-23
  longestSession: number; // minutes
  studyStreak: StudyStreak;
  subjectBreakdown: SubjectStats[];
  weeklyComparison: {
    thisWeek: number;
    lastWeek: number;
    percentageChange: number;
  };
}

// Progress tracking interface
export interface ProgressSummary {
  tasksCompleted: number;
  tasksTotal: number;
  completionRate: number;
  overdueTasks: number;
  upcomingDeadlines: number;
  averageTaskCompletionTime: number; // hours
}

// Goal tracking interface
export interface GoalProgress {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
  progress: number; // percentage
  isOnTrack: boolean;
}

export const dashboardApi = {
  // Get comprehensive dashboard statistics
  getStats: async (filters?: DashboardFilters): Promise<DashboardResult<DashboardStats>> => {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) params.append('dateRange', filters.dateRange);
      if (filters?.subject) params.append('subject', filters.subject);
      if (filters?.taskStatus) params.append('taskStatus', filters.taskStatus);

      const url = `/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<DashboardStats>(url);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get current study streak
  getStreak: async (): Promise<DashboardResult<StudyStreak>> => {
    try {
      const response = await apiClient.get<StudyStreak>('/dashboard/streak');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get weekly overview with optional time range
  getWeeklyOverview: async (weeks: number = 4): Promise<DashboardResult<WeeklyOverview[]>> => {
    try {
      const params = new URLSearchParams({ weeks: weeks.toString() });
      const response = await apiClient.get<WeeklyOverview[]>(`/dashboard/weekly?${params.toString()}`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get study analytics for specified time range
  getStudyAnalytics: async (timeRange: TimeRange = 'month'): Promise<DashboardResult<StudyAnalytics>> => {
    try {
      const params = new URLSearchParams({ timeRange });
      const response = await apiClient.get<StudyAnalytics>(`/dashboard/analytics?${params.toString()}`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get progress summary
  getProgressSummary: async (timeRange: TimeRange = 'week'): Promise<DashboardResult<ProgressSummary>> => {
    try {
      const params = new URLSearchParams({ timeRange });
      const response = await apiClient.get<ProgressSummary>(`/dashboard/progress?${params.toString()}`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async (timeRange: TimeRange = 'month'): Promise<DashboardResult<PerformanceMetrics>> => {
    try {
      const params = new URLSearchParams({ timeRange });
      const response = await apiClient.get<PerformanceMetrics>(`/dashboard/performance?${params.toString()}`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get subject-specific statistics
  getSubjectStats: async (timeRange: TimeRange = 'month'): Promise<DashboardResult<SubjectStats[]>> => {
    try {
      const params = new URLSearchParams({ timeRange });
      const response = await apiClient.get<SubjectStats[]>(`/dashboard/subjects?${params.toString()}`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get goal progress
  getGoalProgress: async (): Promise<DashboardResult<GoalProgress[]>> => {
    try {
      const response = await apiClient.get<GoalProgress[]>('/dashboard/goals');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Create a new goal
  createGoal: async (goal: {
    title: string;
    target: number;
    unit: string;
    deadline?: string;
  }): Promise<DashboardResult<GoalProgress>> => {
    try {
      const response = await apiClient.post<GoalProgress>('/dashboard/goals', goal);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update goal progress
  updateGoal: async (
    goalId: string,
    updates: Partial<GoalProgress>
  ): Promise<DashboardResult<GoalProgress>> => {
    try {
      const response = await apiClient.put<GoalProgress>(`/dashboard/goals/${goalId}`, updates);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Delete a goal
  deleteGoal: async (goalId: string): Promise<DashboardResult<void>> => {
    try {
      await apiClient.delete(`/dashboard/goals/${goalId}`);

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get daily activity data for calendar heatmap
  getDailyActivity: async (
    year: number = new Date().getFullYear()
  ): Promise<DashboardResult<{ date: string; value: number }[]>> => {
    try {
      const params = new URLSearchParams({ year: year.toString() });
      const response = await apiClient.get<{ date: string; value: number }[]>(
        `/dashboard/activity?${params.toString()}`
      );

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get productivity insights
  getProductivityInsights: async (): Promise<DashboardResult<{
    recommendations: string[];
    insights: string[];
    trends: {
      label: string;
      trend: 'up' | 'down' | 'stable';
      value: number;
      previousValue: number;
    }[];
  }>> => {
    try {
      const response = await apiClient.get<{
        recommendations: string[];
        insights: string[];
        trends: {
          label: string;
          trend: 'up' | 'down' | 'stable';
          value: number;
          previousValue: number;
        }[];
      }>('/dashboard/insights');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Export dashboard data
  exportData: async (
    format: 'json' | 'csv' | 'pdf' = 'json',
    timeRange: TimeRange = 'month'
  ): Promise<DashboardResult<Blob>> => {
    try {
      const params = new URLSearchParams({ format, timeRange });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/dashboard/export?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      return {
        data: blob,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get real-time stats (for live dashboard updates)
  getRealtimeStats: async (): Promise<DashboardResult<{
    activeUsers: number;
    tasksCompletedToday: number;
    currentStudySessions: number;
    aiInteractionsToday: number;
  }>> => {
    try {
      const response = await apiClient.get<{
        activeUsers: number;
        tasksCompletedToday: number;
        currentStudySessions: number;
        aiInteractionsToday: number;
      }>('/dashboard/realtime');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }
};