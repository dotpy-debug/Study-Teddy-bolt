export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
  primary?: boolean;
  selected?: boolean;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  creator?: {
    email: string;
    displayName?: string;
  };
  organizer?: {
    email: string;
    displayName?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  created: string;
  updated: string;
  calendarId: string;
  recurringEventId?: string;
  recurrence?: string[];
}

export interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  connectedAt: string;
  lastSyncAt?: string;
  isActive: boolean;
}

export interface SyncSettings {
  direction: 'import' | 'export' | 'bidirectional';
  frequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  autoSync: boolean;
  conflictResolution: 'keep_google' | 'keep_local' | 'merge' | 'ask';
  syncPastEvents: boolean;
  syncFutureEvents: boolean;
  pastEventsDays: number;
  futureEventsDays: number;
  selectedCalendars: string[];
}

export interface EventMapping {
  googleEventTypes: string[];
  studyEventType: 'study' | 'deadline' | 'exam' | 'break' | 'other';
  subjectMapping: Record<string, string>;
  locationMapping: Record<string, string>;
  defaultSubject?: string;
  defaultDuration: number;
  includeDescription: boolean;
  includeLocation: boolean;
  includeAttendees: boolean;
}

export interface SyncConflict {
  id: string;
  type: 'time_overlap' | 'duplicate' | 'modified_both' | 'deleted_both';
  googleEvent: GoogleCalendarEvent;
  localEvent: {
    id: string;
    title: string;
    date: string;
    time: string;
    duration?: number;
    subject: string;
    type: string;
  };
  suggestedResolution: 'keep_google' | 'keep_local' | 'merge';
  resolvedAt?: string;
  resolution?: 'keep_google' | 'keep_local' | 'merge' | 'skip';
}

export interface SyncStatus {
  isRunning: boolean;
  lastSyncAt?: string;
  lastSyncStatus: 'success' | 'error' | 'partial' | 'cancelled';
  lastSyncError?: string;
  eventsSynced: number;
  eventsSkipped: number;
  conflictsFound: number;
  nextSyncAt?: string;
}

export interface CalendarIntegrationState {
  connectedAccounts: GoogleAccount[];
  selectedAccount?: GoogleAccount;
  calendars: GoogleCalendar[];
  syncSettings: SyncSettings;
  eventMapping: EventMapping;
  syncStatus: SyncStatus;
  conflicts: SyncConflict[];
  isLoading: boolean;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

export interface ImportExportOptions {
  format: 'ics' | 'csv' | 'json';
  dateRange: {
    start: string;
    end: string;
  };
  includeFields: string[];
  selectedCalendars: string[];
}