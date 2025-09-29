import { apiClient, type ApiError } from './client';

// Types for Calendar API
export interface CalendarEvent {
  id: string;
  userId: string;
  googleEventId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  type: 'study' | 'task' | 'break' | 'exam' | 'assignment' | 'class' | 'meeting' | 'personal' | 'other';
  category: 'academic' | 'personal' | 'work' | 'health';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'confirmed' | 'tentative' | 'cancelled';
  isRecurring: boolean;
  recurrenceRule?: string;
  parentEventId?: string;
  subjectId?: string;
  taskId?: string;
  sessionId?: string;
  attendees?: string[];
  reminders?: {
    method: 'email' | 'popup' | 'notification';
    minutes: number;
  }[];
  color?: string;
  isGoogleCalendarEvent: boolean;
  googleCalendarId?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  type: 'study' | 'task' | 'break' | 'exam' | 'assignment' | 'class' | 'meeting' | 'personal' | 'other';
  category?: 'academic' | 'personal' | 'work' | 'health';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  subjectId?: string;
  taskId?: string;
  sessionId?: string;
  attendees?: string[];
  reminders?: {
    method: 'email' | 'popup' | 'notification';
    minutes: number;
  }[];
  color?: string;
  recurrenceRule?: string;
  syncWithGoogle?: boolean;
  googleCalendarId?: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
  type?: 'study' | 'task' | 'break' | 'exam' | 'assignment' | 'class' | 'meeting' | 'personal' | 'other';
  category?: 'academic' | 'personal' | 'work' | 'health';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'confirmed' | 'tentative' | 'cancelled';
  subjectId?: string;
  taskId?: string;
  sessionId?: string;
  attendees?: string[];
  reminders?: {
    method: 'email' | 'popup' | 'notification';
    minutes: number;
  }[];
  color?: string;
  updateRecurrence?: 'this' | 'following' | 'all';
}

export interface CalendarQueryParams {
  startDate: string;
  endDate: string;
  type?: 'study' | 'task' | 'break' | 'exam' | 'assignment' | 'class' | 'meeting' | 'personal' | 'other';
  category?: 'academic' | 'personal' | 'work' | 'health';
  subjectId?: string;
  includeRecurring?: boolean;
  includeGoogleEvents?: boolean;
  view?: 'month' | 'week' | 'day' | 'agenda';
}

export interface CalendarIntegration {
  id: string;
  userId: string;
  provider: 'google' | 'outlook' | 'apple';
  isConnected: boolean;
  accountEmail: string;
  calendarId: string;
  calendarName: string;
  isDefault: boolean;
  syncEnabled: boolean;
  lastSyncedAt?: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  accessRole: string;
  backgroundColor: string;
  foregroundColor: string;
  selected: boolean;
  timeZone: string;
}

export interface CalendarStats {
  totalEvents: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  studyHoursThisWeek: number;
  studyHoursThisMonth: number;
  upcomingDeadlines: number;
  eventsByType: {
    study: number;
    task: number;
    break: number;
    exam: number;
    assignment: number;
    class: number;
    meeting: number;
    personal: number;
    other: number;
  };
  busyDays: {
    date: string;
    eventCount: number;
    totalHours: number;
  }[];
}

export interface ScheduleOptimization {
  suggestedSlots: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    type: 'study' | 'break' | 'review';
    subjectId?: string;
    confidence: number;
    reason: string;
  }[];
  conflicts: {
    eventId: string;
    title: string;
    startTime: string;
    endTime: string;
    type: string;
    severity: 'minor' | 'major' | 'critical';
    suggestion: string;
  }[];
  workloadAnalysis: {
    overloadedDays: string[];
    lightDays: string[];
    recommendedChanges: string[];
  };
}

// API result interface
export interface CalendarResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export const calendarApi = {
  // Get calendar events
  getEvents: async (params: CalendarQueryParams): Promise<CalendarResult<CalendarEvent[]>> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('startDate', params.startDate);
      queryParams.append('endDate', params.endDate);

      if (params.type) queryParams.append('type', params.type);
      if (params.category) queryParams.append('category', params.category);
      if (params.subjectId) queryParams.append('subjectId', params.subjectId);
      if (params.includeRecurring !== undefined) queryParams.append('includeRecurring', params.includeRecurring.toString());
      if (params.includeGoogleEvents !== undefined) queryParams.append('includeGoogleEvents', params.includeGoogleEvents.toString());
      if (params.view) queryParams.append('view', params.view);

      const url = `/calendar/events?${queryParams.toString()}`;
      const response = await apiClient.get<{
        success: boolean;
        data: CalendarEvent[]
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

  // Get event by ID
  getEventById: async (id: string): Promise<CalendarResult<CalendarEvent>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CalendarEvent
      }>(`/calendar/events/${id}`);

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

  // Create calendar event
  createEvent: async (data: CreateEventDto): Promise<CalendarResult<CalendarEvent>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: CalendarEvent;
        message: string
      }>('/calendar/events', data);

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

  // Update calendar event
  updateEvent: async (id: string, data: UpdateEventDto): Promise<CalendarResult<CalendarEvent>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: CalendarEvent;
        message: string
      }>(`/calendar/events/${id}`, data);

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

  // Delete calendar event
  deleteEvent: async (id: string, deleteRecurrence?: 'this' | 'following' | 'all'): Promise<CalendarResult<void>> => {
    try {
      const params = deleteRecurrence ? `?deleteRecurrence=${deleteRecurrence}` : '';
      await apiClient.delete<{
        success: boolean;
        message: string
      }>(`/calendar/events/${id}${params}`);

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

  // Get calendar integrations
  getIntegrations: async (): Promise<CalendarResult<CalendarIntegration[]>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CalendarIntegration[]
      }>('/calendar/integrations');

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

  // Connect Google Calendar
  connectGoogleCalendar: async (): Promise<CalendarResult<{
    authUrl: string;
    state: string;
  }>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          authUrl: string;
          state: string;
        };
        message: string
      }>('/calendar/google/connect');

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

  // Handle Google Calendar OAuth callback
  handleGoogleCallback: async (code: string, state: string): Promise<CalendarResult<CalendarIntegration>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: CalendarIntegration;
        message: string
      }>('/calendar/google/callback', { code, state });

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

  // Get Google Calendars
  getGoogleCalendars: async (): Promise<CalendarResult<GoogleCalendar[]>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: GoogleCalendar[]
      }>('/calendar/google/calendars');

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

  // Sync with Google Calendar
  syncWithGoogle: async (calendarId?: string): Promise<CalendarResult<{
    imported: number;
    exported: number;
    updated: number;
    deleted: number;
    conflicts: number;
  }>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          imported: number;
          exported: number;
          updated: number;
          deleted: number;
          conflicts: number;
        };
        message: string
      }>('/calendar/google/sync', { calendarId });

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

  // Disconnect Google Calendar
  disconnectGoogleCalendar: async (integrationId: string): Promise<CalendarResult<void>> => {
    try {
      await apiClient.delete<{
        success: boolean;
        message: string
      }>(`/calendar/integrations/${integrationId}`);

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

  // Get calendar statistics
  getStats: async (timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<CalendarResult<CalendarStats>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CalendarStats
      }>(`/calendar/stats?timeRange=${timeRange}`);

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

  // Optimize schedule
  optimizeSchedule: async (data: {
    timeRange: { startDate: string; endDate: string };
    preferences: {
      studyHoursPerDay: number;
      preferredStudyTimes: string[];
      breakLength: number;
      maxSessionLength: number;
    };
    constraints?: {
      unavailableSlots: { date: string; startTime: string; endTime: string }[];
      mandatoryEvents: string[];
    };
  }): Promise<CalendarResult<ScheduleOptimization>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: ScheduleOptimization;
        message: string
      }>('/calendar/optimize', data);

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

  // Find available time slots
  findAvailableSlots: async (data: {
    duration: number; // in minutes
    startDate: string;
    endDate: string;
    preferredTimes?: string[];
    excludeWeekends?: boolean;
    minSlotGap?: number;
  }): Promise<CalendarResult<{
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    score: number;
  }[]>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          date: string;
          startTime: string;
          endTime: string;
          duration: number;
          score: number;
        }[];
        message: string
      }>('/calendar/available-slots', data);

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

  // Export calendar
  exportCalendar: async (
    format: 'ics' | 'json' | 'csv' = 'ics',
    params?: CalendarQueryParams
  ): Promise<CalendarResult<Blob>> => {
    try {
      const queryParams = new URLSearchParams({ format });

      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.type) queryParams.append('type', params.type);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.subjectId) queryParams.append('subjectId', params.subjectId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/calendar/export?${queryParams.toString()}`,
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

  // Import calendar from file
  importCalendar: async (file: File, options?: {
    mergeStrategy: 'replace' | 'merge' | 'skip';
    defaultCalendarId?: string;
  }): Promise<CalendarResult<{
    imported: number;
    skipped: number;
    errors: string[];
  }>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (options) {
        formData.append('options', JSON.stringify(options));
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/calendar/import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      return {
        data: result.data,
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
  CalendarEvent,
  CreateEventDto,
  UpdateEventDto,
  CalendarQueryParams,
  CalendarIntegration,
  GoogleCalendar,
  CalendarStats,
  ScheduleOptimization,
  CalendarResult
};