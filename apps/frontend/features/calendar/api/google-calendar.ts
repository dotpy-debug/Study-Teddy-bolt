import axios from 'axios';
import {
  GoogleCalendar,
  GoogleCalendarEvent,
  GoogleAccount,
  SyncSettings,
  SyncStatus,
  SyncConflict,
  ImportExportOptions
} from '../types/google-calendar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API client instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/calendar/google`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const googleCalendarApi = {
  // Authentication
  async getAuthUrl(): Promise<{ authUrl: string; state: string }> {
    const response = await apiClient.get('/auth/url');
    return response.data;
  },

  async handleAuthCallback(code: string, state: string): Promise<GoogleAccount> {
    const response = await apiClient.post('/auth/callback', { code, state });
    return response.data;
  },

  async disconnectAccount(accountId: string): Promise<void> {
    await apiClient.delete(`/accounts/${accountId}`);
  },

  // Accounts
  async getConnectedAccounts(): Promise<GoogleAccount[]> {
    const response = await apiClient.get('/accounts');
    return response.data;
  },

  async refreshAccountToken(accountId: string): Promise<GoogleAccount> {
    const response = await apiClient.post(`/accounts/${accountId}/refresh`);
    return response.data;
  },

  // Calendars
  async getCalendars(accountId: string): Promise<GoogleCalendar[]> {
    const response = await apiClient.get(`/accounts/${accountId}/calendars`);
    return response.data;
  },

  async getCalendarEvents(
    accountId: string,
    calendarId: string,
    params: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: string;
    } = {}
  ): Promise<GoogleCalendarEvent[]> {
    const response = await apiClient.get(
      `/accounts/${accountId}/calendars/${calendarId}/events`,
      { params }
    );
    return response.data;
  },

  // Sync operations
  async getSyncSettings(): Promise<SyncSettings> {
    const response = await apiClient.get('/sync/settings');
    return response.data;
  },

  async updateSyncSettings(settings: Partial<SyncSettings>): Promise<SyncSettings> {
    const response = await apiClient.put('/sync/settings', settings);
    return response.data;
  },

  async getSyncStatus(): Promise<SyncStatus> {
    const response = await apiClient.get('/sync/status');
    return response.data;
  },

  async startSync(accountId?: string): Promise<{ syncId: string }> {
    const response = await apiClient.post('/sync/start', { accountId });
    return response.data;
  },

  async stopSync(syncId: string): Promise<void> {
    await apiClient.post(`/sync/${syncId}/stop`);
  },

  async getSyncConflicts(): Promise<SyncConflict[]> {
    const response = await apiClient.get('/sync/conflicts');
    return response.data;
  },

  async resolveConflict(
    conflictId: string,
    resolution: 'keep_google' | 'keep_local' | 'merge' | 'skip'
  ): Promise<void> {
    await apiClient.post(`/sync/conflicts/${conflictId}/resolve`, { resolution });
  },

  async resolveAllConflicts(
    resolution: 'keep_google' | 'keep_local' | 'merge' | 'skip'
  ): Promise<void> {
    await apiClient.post('/sync/conflicts/resolve-all', { resolution });
  },

  // Event operations
  async createEvent(
    accountId: string,
    calendarId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    const response = await apiClient.post(
      `/accounts/${accountId}/calendars/${calendarId}/events`,
      event
    );
    return response.data;
  },

  async updateEvent(
    accountId: string,
    calendarId: string,
    eventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    const response = await apiClient.put(
      `/accounts/${accountId}/calendars/${calendarId}/events/${eventId}`,
      event
    );
    return response.data;
  },

  async deleteEvent(
    accountId: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    await apiClient.delete(
      `/accounts/${accountId}/calendars/${calendarId}/events/${eventId}`
    );
  },

  // Import/Export
  async exportEvents(options: ImportExportOptions): Promise<Blob> {
    const response = await apiClient.post('/export', options, {
      responseType: 'blob'
    });
    return response.data;
  },

  async importEvents(file: File, accountId: string, calendarId: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);
    formData.append('calendarId', calendarId);

    const response = await apiClient.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Utility functions
  async testConnection(accountId: string): Promise<{ connected: boolean; error?: string }> {
    try {
      const response = await apiClient.get(`/accounts/${accountId}/test`);
      return response.data;
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async getQuotaInfo(accountId: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
  }> {
    const response = await apiClient.get(`/accounts/${accountId}/quota`);
    return response.data;
  }
};

// Utility functions for OAuth popup handling
export const oauthUtils = {
  openPopup(url: string, name: string = 'google_oauth'): Promise<Window | null> {
    const width = 500;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const popup = window.open(
      url,
      name,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    return new Promise((resolve) => {
      if (!popup) {
        resolve(null);
        return;
      }

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve(popup);
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!popup.closed) {
          popup.close();
        }
        resolve(popup);
      }, 300000);
    });
  },

  async handleOAuthFlow(): Promise<GoogleAccount | null> {
    try {
      const { authUrl, state } = await googleCalendarApi.getAuthUrl();
      const popup = await this.openPopup(authUrl);

      if (!popup) {
        throw new Error('Popup was blocked');
      }

      return new Promise((resolve, reject) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
            window.removeEventListener('message', messageHandler);
            resolve(event.data.account);
          } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', messageHandler);

        // Handle popup closed without completing auth
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            resolve(null);
          }
        }, 1000);
      });
    } catch (error) {
      console.error('OAuth flow error:', error);
      throw error;
    }
  }
};