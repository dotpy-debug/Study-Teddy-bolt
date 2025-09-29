import { apiClient, type ApiError } from './client';

// Types for Analytics API
export interface AnalyticsTimeRange {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  fromDate?: string;
  toDate?: string;
}

export interface StudyAnalytics {
  totalStudyTime: number;
  totalStudyTimeFormatted: string;
  averageSessionDuration: number;
  averageSessionDurationFormatted: string;
  totalSessions: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  focusScore: number;
  productivityTrend: 'up' | 'down' | 'stable';
  streakDays: number;
  longestStreak: number;
}

export interface SubjectAnalytics {
  subjectId: string;
  subjectName: string;
  color: string;
  studyTime: number;
  studyTimeFormatted: string;
  sessionsCount: number;
  tasksCompleted: number;
  tasksTotal: number;
  averageScore: number;
  focusScore: number;
  lastStudied?: string;
  progressPercentage: number;
}

export interface PerformanceMetrics {
  weeklyStats: {
    week: string;
    studyTime: number;
    sessions: number;
    tasksCompleted: number;
    focusScore: number;
  }[];
  monthlyGoals: {
    month: string;
    targetHours: number;
    actualHours: number;
    achievement: number;
    tasksTarget: number;
    tasksCompleted: number;
  }[];
  dailyPatterns: {
    hour: number;
    studyTime: number;
    sessions: number;
    efficiency: number;
  }[];
  subjectDistribution: {
    subjectId: string;
    subjectName: string;
    percentage: number;
    hours: number;
    color: string;
  }[];
}

export interface ProductivityInsights {
  insights: {
    category: 'focus' | 'timing' | 'subjects' | 'habits' | 'goals';
    title: string;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    recommendation?: string;
    confidence: number;
  }[];
  recommendations: {
    type: 'schedule' | 'focus' | 'break' | 'goal' | 'subject';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
    actionSteps: string[];
  }[];
  trends: {
    metric: string;
    direction: 'improving' | 'declining' | 'stable';
    change: number;
    significance: 'high' | 'medium' | 'low';
  }[];
}

export interface GoalProgress {
  goalId: string;
  title: string;
  type: 'study_time' | 'tasks_completed' | 'sessions_count' | 'focus_score' | 'streak';
  target: number;
  current: number;
  progress: number;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'custom';
  deadline?: string;
  onTrack: boolean;
  estimatedCompletion?: string;
  unit: string;
}

export interface ComparisonMetrics {
  current: StudyAnalytics;
  previous: StudyAnalytics;
  changes: {
    studyTime: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    sessions: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    completion: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
    focus: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
  };
}

export interface AnalyticsQueryParams {
  timeRange?: AnalyticsTimeRange;
  subjectIds?: string[];
  includeInactive?: boolean;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

// API result interface
export interface AnalyticsResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export const analyticsApi = {
  // Get overall study analytics
  getStudyAnalytics: async (params?: AnalyticsQueryParams): Promise<AnalyticsResult<StudyAnalytics>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.timeRange) {
        queryParams.append('period', params.timeRange.period);
        if (params.timeRange.fromDate) queryParams.append('fromDate', params.timeRange.fromDate);
        if (params.timeRange.toDate) queryParams.append('toDate', params.timeRange.toDate);
      }

      if (params?.subjectIds?.length) {
        params.subjectIds.forEach(id => queryParams.append('subjectIds', id));
      }

      if (params?.includeInactive !== undefined) {
        queryParams.append('includeInactive', params.includeInactive.toString());
      }

      if (params?.granularity) {
        queryParams.append('granularity', params.granularity);
      }

      const url = `/analytics/study${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{
        success: boolean;
        data: StudyAnalytics
      }>(url);

      return {
        data: response.data,
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

  // Get subject-specific analytics
  getSubjectAnalytics: async (params?: AnalyticsQueryParams): Promise<AnalyticsResult<SubjectAnalytics[]>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.timeRange) {
        queryParams.append('period', params.timeRange.period);
        if (params.timeRange.fromDate) queryParams.append('fromDate', params.timeRange.fromDate);
        if (params.timeRange.toDate) queryParams.append('toDate', params.timeRange.toDate);
      }

      if (params?.subjectIds?.length) {
        params.subjectIds.forEach(id => queryParams.append('subjectIds', id));
      }

      if (params?.includeInactive !== undefined) {
        queryParams.append('includeInactive', params.includeInactive.toString());
      }

      const url = `/analytics/subjects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{
        success: boolean;
        data: SubjectAnalytics[]
      }>(url);

      return {
        data: response.data,
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
  getPerformanceMetrics: async (params?: AnalyticsQueryParams): Promise<AnalyticsResult<PerformanceMetrics>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.timeRange) {
        queryParams.append('period', params.timeRange.period);
        if (params.timeRange.fromDate) queryParams.append('fromDate', params.timeRange.fromDate);
        if (params.timeRange.toDate) queryParams.append('toDate', params.timeRange.toDate);
      }

      if (params?.granularity) {
        queryParams.append('granularity', params.granularity);
      }

      const url = `/analytics/performance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{
        success: boolean;
        data: PerformanceMetrics
      }>(url);

      return {
        data: response.data,
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
  getProductivityInsights: async (params?: AnalyticsQueryParams): Promise<AnalyticsResult<ProductivityInsights>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.timeRange) {
        queryParams.append('period', params.timeRange.period);
        if (params.timeRange.fromDate) queryParams.append('fromDate', params.timeRange.fromDate);
        if (params.timeRange.toDate) queryParams.append('toDate', params.timeRange.toDate);
      }

      const url = `/analytics/insights${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{
        success: boolean;
        data: ProductivityInsights
      }>(url);

      return {
        data: response.data,
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
  getGoalProgress: async (goalIds?: string[]): Promise<AnalyticsResult<GoalProgress[]>> => {
    try {
      const queryParams = new URLSearchParams();

      if (goalIds?.length) {
        goalIds.forEach(id => queryParams.append('goalIds', id));
      }

      const url = `/analytics/goals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{
        success: boolean;
        data: GoalProgress[]
      }>(url);

      return {
        data: response.data,
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

  // Get comparison metrics
  getComparisonMetrics: async (
    currentPeriod: AnalyticsTimeRange,
    previousPeriod: AnalyticsTimeRange
  ): Promise<AnalyticsResult<ComparisonMetrics>> => {
    try {
      const queryParams = new URLSearchParams();

      // Current period
      queryParams.append('currentPeriod', currentPeriod.period);
      if (currentPeriod.fromDate) queryParams.append('currentFromDate', currentPeriod.fromDate);
      if (currentPeriod.toDate) queryParams.append('currentToDate', currentPeriod.toDate);

      // Previous period
      queryParams.append('previousPeriod', previousPeriod.period);
      if (previousPeriod.fromDate) queryParams.append('previousFromDate', previousPeriod.fromDate);
      if (previousPeriod.toDate) queryParams.append('previousToDate', previousPeriod.toDate);

      const url = `/analytics/comparison?${queryParams.toString()}`;
      const response = await apiClient.get<{
        success: boolean;
        data: ComparisonMetrics
      }>(url);

      return {
        data: response.data,
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

  // Get enhanced analytics dashboard data
  getDashboardAnalytics: async (params?: AnalyticsQueryParams): Promise<AnalyticsResult<{
    overview: StudyAnalytics;
    subjects: SubjectAnalytics[];
    performance: PerformanceMetrics;
    insights: ProductivityInsights;
    goals: GoalProgress[];
  }>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.timeRange) {
        queryParams.append('period', params.timeRange.period);
        if (params.timeRange.fromDate) queryParams.append('fromDate', params.timeRange.fromDate);
        if (params.timeRange.toDate) queryParams.append('toDate', params.timeRange.toDate);
      }

      const url = `/analytics/dashboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{
        success: boolean;
        data: {
          overview: StudyAnalytics;
          subjects: SubjectAnalytics[];
          performance: PerformanceMetrics;
          insights: ProductivityInsights;
          goals: GoalProgress[];
        }
      }>(url);

      return {
        data: response.data,
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

  // Export analytics data
  exportAnalytics: async (
    format: 'json' | 'csv' | 'pdf' = 'json',
    params?: AnalyticsQueryParams
  ): Promise<AnalyticsResult<Blob>> => {
    try {
      const queryParams = new URLSearchParams({ format });

      if (params?.timeRange) {
        queryParams.append('period', params.timeRange.period);
        if (params.timeRange.fromDate) queryParams.append('fromDate', params.timeRange.fromDate);
        if (params.timeRange.toDate) queryParams.append('toDate', params.timeRange.toDate);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/analytics/export?${queryParams.toString()}`,
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

  // Generate analytics report
  generateReport: async (
    type: 'weekly' | 'monthly' | 'semester' | 'custom',
    params?: AnalyticsQueryParams & {
      includeCharts?: boolean;
      includeRecommendations?: boolean;
      emailReport?: boolean;
    }
  ): Promise<AnalyticsResult<{
    reportId: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
    emailSent?: boolean;
  }>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          reportId: string;
          status: 'generating' | 'completed' | 'failed';
          downloadUrl?: string;
          emailSent?: boolean;
        };
        message: string
      }>('/analytics/reports', {
        type,
        ...params
      });

      return {
        data: response.data,
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

// Export types for use in components
export type {
  AnalyticsTimeRange,
  StudyAnalytics,
  SubjectAnalytics,
  PerformanceMetrics,
  ProductivityInsights,
  GoalProgress,
  ComparisonMetrics,
  AnalyticsQueryParams,
  AnalyticsResult
};