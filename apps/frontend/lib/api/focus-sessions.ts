import { apiClient, type ApiError } from './client';

// Types for Focus Sessions API
export interface FocusSession {
  id: string;
  userId: string;
  subjectId?: string;
  title?: string;
  type: 'pomodoro' | 'free' | 'goal_based';
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  startTime: string;
  endTime?: string;
  pausedDuration?: number; // in seconds
  totalDuration?: number; // in seconds
  breaksTaken?: number;
  pomodorosCompleted?: number;
  focusScore?: number; // 0.00 to 1.00
  notes?: string;
  goals?: string[];
  distractions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  title?: string;
  type: 'pomodoro' | 'free' | 'goal_based';
  subjectId?: string;
  goals?: string[];
  notes?: string;
  plannedDuration?: number; // in minutes for goal-based sessions
}

export interface UpdateSessionDto {
  title?: string;
  notes?: string;
  goals?: string[];
  focusScore?: number;
  distractions?: number;
  breaksTaken?: number;
  pomodorosCompleted?: number;
}

export interface SessionQueryParams {
  limit?: number;
  offset?: number;
  type?: 'pomodoro' | 'free' | 'goal_based';
  status?: 'active' | 'paused' | 'completed' | 'abandoned';
  subjectId?: string;
  fromDate?: string; // ISO string
  toDate?: string; // ISO string
}

export interface SessionStatsQueryParams {
  period?: 'today' | 'week' | 'month' | 'custom';
  fromDate?: string; // ISO string for custom period
  toDate?: string; // ISO string for custom period
  subjectId?: string;
}

export interface SessionStats {
  period: string;
  totalSessions: number;
  totalDuration: number;
  totalDurationFormatted: string;
  avgDuration: number;
  avgDurationFormatted: string;
  avgFocusScore: number;
  totalPomodoros: number;
  totalBreaks: number;
}

export interface SessionAnalytics {
  productivityScore: number;
  averageFocusTime: number;
  peakFocusTime: string;
  breakPattern: { time: string; duration: number }[];
  keyInsights: string[];
  recommendations: string[];
}

export interface CreateAnalyticsDto {
  productivityScore?: number;
  averageFocusTime?: number;
  peakFocusTime?: string;
  breakPattern?: { time: string; duration: number }[];
  keyInsights?: string[];
  recommendations?: string[];
}

export interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // number of work sessions before long break
  autoStartBreaks?: boolean;
  autoStartWork?: boolean;
}

// API result interface
export interface SessionResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export const focusSessionsApi = {
  // Get all focus sessions with filtering
  getSessions: async (params?: SessionQueryParams): Promise<SessionResult<FocusSession[]>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.subjectId) queryParams.append('subjectId', params.subjectId);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      const url = `/focus-sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{ success: boolean; data: FocusSession[] }>(url);

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

  // Get active focus session
  getActiveSession: async (): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: FocusSession | null }>('/focus-sessions/active');

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

  // Get paused focus sessions
  getPausedSessions: async (): Promise<SessionResult<FocusSession[]>> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: FocusSession[] }>('/focus-sessions/paused');

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

  // Get session statistics
  getStats: async (params?: SessionStatsQueryParams): Promise<SessionResult<SessionStats>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.period) queryParams.append('period', params.period);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);
      if (params?.subjectId) queryParams.append('subjectId', params.subjectId);

      const url = `/focus-sessions/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{ success: boolean; data: SessionStats }>(url);

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

  // Get session by ID
  getSessionById: async (id: string): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: FocusSession }>(`/focus-sessions/${id}`);

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

  // Get real-time session status with current duration
  getSessionStatus: async (id: string): Promise<SessionResult<FocusSession & { currentDuration: number }>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: FocusSession & { currentDuration: number }
      }>(`/focus-sessions/${id}/status`);

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

  // Start a new focus session
  startSession: async (data: CreateSessionDto): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: FocusSession;
        message: string
      }>('/focus-sessions', data);

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

  // Update a focus session
  updateSession: async (id: string, data: UpdateSessionDto): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: FocusSession;
        message: string
      }>(`/focus-sessions/${id}`, data);

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

  // Pause a focus session
  pauseSession: async (id: string): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: FocusSession;
        message: string
      }>(`/focus-sessions/${id}/pause`);

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

  // Resume a focus session
  resumeSession: async (id: string): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: FocusSession;
        message: string
      }>(`/focus-sessions/${id}/resume`);

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

  // End a focus session
  endSession: async (id: string): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: FocusSession;
        message: string
      }>(`/focus-sessions/${id}/end`);

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

  // Abandon a focus session
  abandonSession: async (id: string): Promise<SessionResult<FocusSession>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: FocusSession;
        message: string
      }>(`/focus-sessions/${id}/abandon`);

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

  // Delete a focus session
  deleteSession: async (id: string): Promise<SessionResult<void>> => {
    try {
      await apiClient.delete<{ success: boolean; message: string }>(`/focus-sessions/${id}`);

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

  // Get session analytics
  getSessionAnalytics: async (id: string): Promise<SessionResult<SessionAnalytics>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: SessionAnalytics
      }>(`/focus-sessions/${id}/analytics`);

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

  // Create session analytics
  createSessionAnalytics: async (
    id: string,
    data: CreateAnalyticsDto
  ): Promise<SessionResult<SessionAnalytics>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: SessionAnalytics;
        message: string
      }>(`/focus-sessions/${id}/analytics`, data);

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

  // Get default Pomodoro settings
  getDefaultPomodoroSettings: async (): Promise<SessionResult<PomodoroSettings>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: PomodoroSettings
      }>('/pomodoro/settings/default');

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

  // Get Pomodoro session for active session
  getPomodoroSession: async (sessionId: string): Promise<SessionResult<{
    sessionId: string;
    userId: string;
    phase: 'work' | 'short_break' | 'long_break';
    currentCycle: number;
    pomodorosCompleted: number;
    settings: PomodoroSettings;
    phaseStartTime: string;
    expectedEndTime: string;
    isActive: boolean;
  }>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          sessionId: string;
          userId: string;
          phase: 'work' | 'short_break' | 'long_break';
          currentCycle: number;
          pomodorosCompleted: number;
          settings: PomodoroSettings;
          phaseStartTime: string;
          expectedEndTime: string;
          isActive: boolean;
        }
      }>(`/pomodoro/sessions/${sessionId}`);

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

  // Create Pomodoro session
  createPomodoroSession: async (
    sessionId: string,
    settings?: Partial<PomodoroSettings>
  ): Promise<SessionResult<{
    sessionId: string;
    phase: 'work' | 'short_break' | 'long_break';
    currentCycle: number;
    pomodorosCompleted: number;
    settings: PomodoroSettings;
    phaseStartTime: string;
    expectedEndTime: string;
    isActive: boolean;
  }>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          sessionId: string;
          phase: 'work' | 'short_break' | 'long_break';
          currentCycle: number;
          pomodorosCompleted: number;
          settings: PomodoroSettings;
          phaseStartTime: string;
          expectedEndTime: string;
          isActive: boolean;
        }
      }>(`/pomodoro/sessions/${sessionId}`, settings || {});

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

  // Complete Pomodoro phase (work or break)
  completePomodoroPhase: async (sessionId: string): Promise<SessionResult<{
    phase: 'work' | 'short_break' | 'long_break';
    pomodorosCompleted: number;
    expectedEndTime: string;
  }>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          phase: 'work' | 'short_break' | 'long_break';
          pomodorosCompleted: number;
          expectedEndTime: string;
        }
      }>(`/pomodoro/sessions/${sessionId}/complete-phase`);

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

  // Update Pomodoro settings
  updatePomodoroSettings: async (
    sessionId: string,
    settings: Partial<PomodoroSettings>
  ): Promise<SessionResult<PomodoroSettings>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: PomodoroSettings
      }>(`/pomodoro/sessions/${sessionId}/settings`, settings);

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
  FocusSession,
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryParams,
  SessionStatsQueryParams,
  SessionStats,
  SessionAnalytics,
  CreateAnalyticsDto,
  PomodoroSettings,
  SessionResult
};