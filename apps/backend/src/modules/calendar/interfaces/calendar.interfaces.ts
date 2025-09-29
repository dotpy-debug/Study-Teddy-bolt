import { calendar_v3 } from 'googleapis';

export interface CalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  tokenType?: string;
  scope?: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  extendedProperties?: {
    private?: {
      taskId?: string;
      focusSessionId?: string;
      subjectId?: string;
      createdByStudyTeddy?: string;
    };
  };
}

export interface FreeBusyRequest {
  timeMin: string;
  timeMax: string;
  items: Array<{ id: string }>;
}

export interface FreeBusyResponse {
  calendars: {
    [calendarId: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
      errors?: Array<{
        domain: string;
        reason: string;
      }>;
    };
  };
}

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingEvents: Array<{
    title: string;
    start: string;
    end: string;
    calendarName?: string;
  }>;
}

export interface NextFreeSlotOptions {
  startSearchFrom: Date;
  endSearchAt: Date;
  durationMinutes: number;
  breakMinutes?: number;
  preferredTimes?: {
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[];
  };
  maxSearchDays?: number;
}

export interface StudyTeddyCalendar {
  id: string;
  summary: string;
  description: string;
  timeZone: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
}

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  scopes: string[];
  calendarName: string;
}

// Extended calendar event interface with additional features
export interface CalendarEventExtended extends CalendarEvent {
  recurrence?: string[];
  recurringRule?: RecurringEventRule;
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  transparency?: 'opaque' | 'transparent';
  sendNotifications?: boolean;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
  };
}

// Recurring event rule interface
export interface RecurringEventRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  until?: string;
  count?: number;
  byWeekDay?: string[];
  byMonthDay?: number[];
  byMonth?: number[];
}

// Enhanced calendar list entry
export interface CalendarListEntryExtended extends CalendarListEntry {
  timeZone?: string;
  selected?: boolean;
  colorId?: string;
  defaultReminders?: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
}

// Rate limiting interface
export interface RateLimitStatus {
  remaining: number;
  resetTime: number;
  total: number;
}

// Batch operation result
export interface BatchOperationResult {
  successful: Array<{
    index: number;
    event?: calendar_v3.Schema$Event;
    eventId?: string;
  }>;
  failed: Array<{
    index: number;
    error: string;
    event?: any;
    eventId?: string;
  }>;
  total: number;
}

// Calendar sync result
export interface CalendarSyncResult {
  syncTime: Date;
  eventsAdded: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflicts: Array<{
    eventId: string;
    conflictType: 'update' | 'delete' | 'create';
    resolution: 'google_wins' | 'local_wins' | 'manual';
  }>;
  errors: Array<{
    eventId?: string;
    error: string;
  }>;
}

// Notification settings
export interface NotificationSettings {
  userId: string;
  channelId: string;
  resourceId: string;
  calendarId: string;
  webhookUrl: string;
  expiration: Date;
  active: boolean;
}

// Calendar watch channel
export interface CalendarWatchChannel {
  id: string;
  resourceId: string;
  calendarId: string;
  expiration: Date;
  webhookUrl: string;
}

// Enhanced conflict check result
export interface ConflictCheckResultExtended extends ConflictCheckResult {
  suggestedAlternatives?: TimeSlot[];
}

// Event attendance status
export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  comment?: string;
  additionalGuests?: number;
  organizer?: boolean;
  resource?: boolean;
}

// Calendar access control
export interface CalendarACL {
  role: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
  scope: {
    type: 'default' | 'user' | 'group' | 'domain';
    value?: string;
  };
}

// Calendar settings
export interface CalendarSettings {
  timeZone: string;
  format24HourTime?: boolean;
  defaultEventLength?: number;
  defaultReminders?: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
  workingHours?: {
    enabled: boolean;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
}

// Event reminder
export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

// Calendar color
export interface CalendarColor {
  background: string;
  foreground: string;
}

// Event query options
export interface EventQueryOptions {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  showDeleted?: boolean;
  singleEvents?: boolean;
  updatedMin?: string;
  q?: string; // text search
}

// Calendar import/export
export interface CalendarExportOptions {
  format: 'ical' | 'json';
  includeDeleted?: boolean;
  timeRange?: {
    start: string;
    end: string;
  };
}

export interface CalendarImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    line?: number;
    error: string;
    event?: any;
  }>;
}
