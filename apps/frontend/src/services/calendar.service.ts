import api from './api';
import { ApiResponse } from '@/types/api';

// Calendar DTOs
export interface ConnectCalendarDto {
  code: string;
}

export interface DisconnectCalendarDto {
  calendarAccountId: string;
}

export interface CalendarAccount {
  id: string;
  userId: string;
  provider: 'google';
  accountEmail: string;
  accountName: string;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  calendarIds?: string[];
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleSessionDto {
  taskId: string;
  startTime: string;
  endTime: string;
  title?: string;
  description?: string;
  sendReminders?: boolean;
  reminderMinutes?: number;
  location?: string;
}

export interface UpdateScheduledSessionDto {
  eventId: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  description?: string;
  location?: string;
}

export interface DeleteScheduledSessionDto {
  eventId: string;
  sendCancellation?: boolean;
}

export interface CheckAvailabilityDto {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  breakMinutes?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  taskId?: string;
  focusSessionId?: string;
  calendarId: string;
  htmlLink: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusyTimeSlot {
  start: string;
  end: string;
  eventTitle?: string;
  calendarName?: string;
}

export interface AvailableTimeSlot {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface AvailabilityResponse {
  busySlots: BusyTimeSlot[];
  availableSlots: AvailableTimeSlot[];
  nextAvailableSlot?: AvailableTimeSlot;
}

export interface CalendarAuthUrlResponse {
  authUrl: string;
}

class CalendarService {
  /**
   * Get Google Calendar OAuth URL
   */
  async getAuthUrl(): Promise<ApiResponse<CalendarAuthUrlResponse>> {
    try {
      const response = await api.get<CalendarAuthUrlResponse>('/api/calendar/auth-url');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Connect Google Calendar account
   */
  async connectCalendar(code: string): Promise<ApiResponse<CalendarAccount>> {
    try {
      const response = await api.post<CalendarAccount>('/api/calendar/connect', { code });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Disconnect calendar account
   */
  async disconnectCalendar(calendarAccountId: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.post('/api/calendar/disconnect', { calendarAccountId });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get connected calendar accounts
   */
  async getCalendarAccounts(): Promise<ApiResponse<CalendarAccount[]>> {
    try {
      const response = await api.get<CalendarAccount[]>('/api/calendar/accounts');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Schedule a study session
   */
  async scheduleSession(dto: ScheduleSessionDto): Promise<ApiResponse<CalendarEvent>> {
    try {
      const response = await api.post<CalendarEvent>('/api/calendar/schedule', dto);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update scheduled session
   */
  async updateScheduledSession(dto: UpdateScheduledSessionDto): Promise<ApiResponse<CalendarEvent>> {
    try {
      const response = await api.put<CalendarEvent>('/api/calendar/schedule', dto);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete scheduled session
   */
  async deleteScheduledSession(dto: DeleteScheduledSessionDto): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete('/api/calendar/schedule', { data: dto });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check calendar availability
   */
  async checkAvailability(dto: CheckAvailabilityDto): Promise<ApiResponse<AvailabilityResponse>> {
    try {
      const response = await api.post<AvailabilityResponse>('/api/calendar/check-availability', dto);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get calendar events for time range
   */
  async getEvents(startTime: string, endTime: string): Promise<ApiResponse<CalendarEvent[]>> {
    try {
      const response = await api.get<CalendarEvent[]>('/api/calendar/events', {
        params: { startTime, endTime },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle OAuth callback - opens Google OAuth in new window and returns the code
   */
  async handleOAuthFlow(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get auth URL
        const authUrlResponse = await this.getAuthUrl();
        const authUrl = authUrlResponse.data?.authUrl;

        if (!authUrl) {
          throw new Error('Failed to get authorization URL');
        }

        // Open OAuth window
        const width = 600;
        const height = 700;
        const left = window.innerWidth / 2 - width / 2;
        const top = window.innerHeight / 2 - height / 2;

        const authWindow = window.open(
          authUrl,
          'Google Calendar Authorization',
          `width=${width},height=${height},left=${left},top=${top}`,
        );

        if (!authWindow) {
          throw new Error('Failed to open authorization window. Please check your popup blocker.');
        }

        // Listen for OAuth callback
        const checkInterval = setInterval(() => {
          try {
            if (authWindow.closed) {
              clearInterval(checkInterval);
              reject(new Error('Authorization window was closed'));
              return;
            }

            // Check if we're on the callback URL
            const currentUrl = authWindow.location.href;
            if (currentUrl.includes('/api/calendar/oauth/callback')) {
              // Extract code from URL
              const urlParams = new URLSearchParams(authWindow.location.search);
              const code = urlParams.get('code');

              if (code) {
                clearInterval(checkInterval);
                authWindow.close();
                resolve(code);
              } else {
                const error = urlParams.get('error');
                clearInterval(checkInterval);
                authWindow.close();
                reject(new Error(error || 'Authorization failed'));
              }
            }
          } catch (e) {
            // Cross-origin error - window is still on Google's domain
            // This is expected and we continue checking
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          reject(new Error('Authorization timeout'));
        }, 5 * 60 * 1000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Complete calendar connection flow
   */
  async completeCalendarConnection(): Promise<CalendarAccount> {
    try {
      // Handle OAuth flow to get code
      const code = await this.handleOAuthFlow();

      // Connect calendar with code
      const response = await this.connectCalendar(code);

      if (!response.data) {
        throw new Error('Failed to connect calendar');
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new CalendarService();