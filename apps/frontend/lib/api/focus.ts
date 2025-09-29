import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const focusApi = axios.create({
  baseURL: `${API_BASE_URL}/focus`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
focusApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
focusApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface StartFocusSessionRequest {
  type: 'pomodoro' | 'free' | 'goal_based';
  plannedDuration: number; // minutes
  taskId?: string;
  subjectId?: string;
  presetId?: string;
  notes?: string;
  breakDuration?: number;
  targetSessions?: number;
}

export interface StopFocusSessionRequest {
  sessionId: string;
  actualDuration?: number; // minutes
  effectiveMinutes?: number; // actual focused time
  completionReason: 'completed' | 'interrupted' | 'abandoned';
  notes?: string;
  distractions?: number;
  focusScore?: number; // 0-1
}

export interface ScheduleFocusSessionRequest {
  title: string;
  scheduledAt: string; // ISO date string
  duration: number; // minutes
  type: 'pomodoro' | 'free' | 'goal_based';
  taskId?: string;
  subjectId?: string;
  presetId?: string;
  notes?: string;
  reminderMinutes?: number;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
}

export interface FocusSession {
  id: string;
  userId: string;
  type: 'pomodoro' | 'free' | 'goal_based';
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'abandoned';
  title?: string;
  plannedDuration: number; // minutes
  actualDuration?: number; // minutes
  effectiveMinutes?: number; // actual focused time
  taskId?: string;
  subjectId?: string;
  presetId?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  pausedDuration?: number; // seconds
  breaksTaken?: number;
  pomodorosCompleted?: number;
  focusScore?: number; // 0-1
  notes?: string;
  distractions?: number;
  completionReason?: string;
  reminderSent?: boolean;
  reminderMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSessionQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  taskId?: string;
  subjectId?: string;
}

export interface FocusSessionStats {
  totalSessions: number;
  totalMinutes: number;
  totalEffectiveMinutes: number;
  currentStreak: number;
  longestStreak: number;
  averageFocusScore: number;
  todayMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  completionRate: number;
  averageSessionLength: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
}

// API Functions
export const focusSessionsApi = {
  // Start a new focus session
  async startSession(data: StartFocusSessionRequest): Promise<FocusSession> {
    const response = await focusApi.post('/start', data);
    return response.data;
  },

  // Stop the current focus session
  async stopSession(data: StopFocusSessionRequest): Promise<FocusSession> {
    const response = await focusApi.post('/stop', data);
    return response.data;
  },

  // Schedule a future focus session
  async scheduleSession(data: ScheduleFocusSessionRequest): Promise<FocusSession> {
    const response = await focusApi.post('/schedule', data);
    return response.data;
  },

  // Get current active session
  async getCurrentSession(): Promise<FocusSession | null> {
    const response = await focusApi.get('/current');
    return response.data;
  },

  // Get scheduled sessions
  async getScheduledSessions(query?: FocusSessionQuery): Promise<{
    sessions: FocusSession[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await focusApi.get('/scheduled', { params: query });
    return response.data;
  },

  // Get session history
  async getSessionHistory(query?: FocusSessionQuery): Promise<{
    sessions: FocusSession[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await focusApi.get('/history', { params: query });
    return response.data;
  },

  // Get a specific session
  async getSession(sessionId: string): Promise<FocusSession> {
    const response = await focusApi.get(`/${sessionId}`);
    return response.data;
  },

  // Update a scheduled session
  async updateSession(sessionId: string, data: Partial<ScheduleFocusSessionRequest>): Promise<FocusSession> {
    const response = await focusApi.patch(`/${sessionId}`, data);
    return response.data;
  },

  // Cancel a scheduled session
  async cancelSession(sessionId: string): Promise<void> {
    await focusApi.delete(`/${sessionId}`);
  },

  // Extend current session
  async extendSession(sessionId: string, minutes: number): Promise<FocusSession> {
    const response = await focusApi.post(`/${sessionId}/extend`, { minutes });
    return response.data;
  },

  // Get focus session statistics
  async getStats(dateFrom?: string, dateTo?: string): Promise<FocusSessionStats> {
    const response = await focusApi.get('/stats', {
      params: { dateFrom, dateTo }
    });
    return response.data;
  },

  // Pause current session
  async pauseSession(sessionId: string): Promise<FocusSession> {
    const response = await focusApi.post(`/${sessionId}/pause`);
    return response.data;
  },

  // Resume paused session
  async resumeSession(sessionId: string): Promise<FocusSession> {
    const response = await focusApi.post(`/${sessionId}/resume`);
    return response.data;
  },

  // Add break to current session
  async addBreak(sessionId: string, duration: number): Promise<FocusSession> {
    const response = await focusApi.post(`/${sessionId}/break`, { duration });
    return response.data;
  },

  // Update session notes
  async updateNotes(sessionId: string, notes: string): Promise<FocusSession> {
    const response = await focusApi.patch(`/${sessionId}/notes`, { notes });
    return response.data;
  },

  // Record distraction
  async recordDistraction(sessionId: string): Promise<FocusSession> {
    const response = await focusApi.post(`/${sessionId}/distraction`);
    return response.data;
  },
};

export default focusSessionsApi;