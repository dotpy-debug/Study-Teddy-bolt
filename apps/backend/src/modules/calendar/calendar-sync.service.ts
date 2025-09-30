import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { DrizzleService } from '../../db/drizzle.service';
import {
  googleCalendarTokens,
  calendarMappings,
  calendarEvents,
  calendarSyncLogs,
  calendarAccounts,
  tasks,
  subjects,
  GoogleCalendarToken,
  CalendarMapping,
  CalendarEvent,
  NewCalendarEvent,
  NewCalendarSyncLog,
} from '../../db/schema';
import { eq, and, or, isNull, gte, lte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface SyncResult {
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsDetected: number;
  errorsEncountered: number;
  syncDuration: number;
  syncToken?: string;
}

export interface ConflictResolution {
  eventId: string;
  resolution: 'local_wins' | 'remote_wins' | 'manual';
  localVersion: any;
  remoteVersion: any;
  resolvedVersion?: any;
}

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);
  private readonly oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL,
  );

  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Perform a full sync for a user's calendar
   */
  async performFullSync(userId: string, calendarAccountId?: string): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.log(`Starting full sync for user ${userId}`);

    const result: SyncResult = {
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      errorsEncountered: 0,
      syncDuration: 0,
    };

    try {
      // Get user's calendar mappings
      const mappings = await this.getUserCalendarMappings(userId, calendarAccountId);

      for (const mapping of mappings) {
        if (!mapping.syncEnabled) continue;

        try {
          const calendar = await this.getAuthenticatedCalendar(userId, mapping.calendarAccountId);
          const mapResult = await this.syncCalendarMapping(calendar, mapping, 'full');

          result.eventsProcessed += mapResult.eventsProcessed;
          result.eventsCreated += mapResult.eventsCreated;
          result.eventsUpdated += mapResult.eventsUpdated;
          result.eventsDeleted += mapResult.eventsDeleted;
          result.conflictsDetected += mapResult.conflictsDetected;
        } catch (error) {
          this.logger.error(`Error syncing calendar ${mapping.googleCalendarId}:`, error);
          result.errorsEncountered++;
        }
      }

      result.syncDuration = Date.now() - startTime;
      this.logger.log(`Full sync completed for user ${userId}:`, result);

      return result;
    } catch (error) {
      this.logger.error(`Full sync failed for user ${userId}:`, error);
      result.errorsEncountered++;
      result.syncDuration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Perform an incremental sync for a user's calendar
   */
  async performIncrementalSync(userId: string, calendarAccountId?: string): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.log(`Starting incremental sync for user ${userId}`);

    const result: SyncResult = {
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      errorsEncountered: 0,
      syncDuration: 0,
    };

    try {
      const mappings = await this.getUserCalendarMappings(userId, calendarAccountId);

      for (const mapping of mappings) {
        if (!mapping.syncEnabled) continue;

        try {
          const calendar = await this.getAuthenticatedCalendar(userId, mapping.calendarAccountId);
          const mapResult = await this.syncCalendarMapping(calendar, mapping, 'incremental');

          result.eventsProcessed += mapResult.eventsProcessed;
          result.eventsCreated += mapResult.eventsCreated;
          result.eventsUpdated += mapResult.eventsUpdated;
          result.eventsDeleted += mapResult.eventsDeleted;
          result.conflictsDetected += mapResult.conflictsDetected;
        } catch (error) {
          this.logger.error(`Error syncing calendar ${mapping.googleCalendarId}:`, error);
          result.errorsEncountered++;
        }
      }

      result.syncDuration = Date.now() - startTime;
      this.logger.log(`Incremental sync completed for user ${userId}:`, result);

      return result;
    } catch (error) {
      this.logger.error(`Incremental sync failed for user ${userId}:`, error);
      result.errorsEncountered++;
      result.syncDuration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Sync a single event
   */
  async syncSingleEvent(
    userId: string,
    eventId: string,
    calendarAccountId?: string,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.log(`Syncing single event ${eventId} for user ${userId}`);

    const result: SyncResult = {
      eventsProcessed: 1,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      errorsEncountered: 0,
      syncDuration: 0,
    };

    try {
      // Find the event in our database
      const existingEvent = await this.drizzle.db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.userId, userId),
            or(eq(calendarEvents.id, eventId), eq(calendarEvents.googleEventId, eventId)),
          ),
        )
        .limit(1);

      if (existingEvent.length === 0) {
        throw new NotFoundException(`Event ${eventId} not found`);
      }

      const event = existingEvent[0];
      const mapping = await this.getCalendarMapping(userId, event.googleCalendarId!);

      if (!mapping) {
        throw new NotFoundException(
          `Calendar mapping not found for calendar ${event.googleCalendarId}`,
        );
      }

      const calendar = await this.getAuthenticatedCalendar(userId, mapping.calendarAccountId);

      // Fetch the latest version from Google
      const googleEvent = await calendar.events.get({
        calendarId: event.googleCalendarId!,
        eventId: event.googleEventId!,
      });

      if (googleEvent.data) {
        const syncResult = await this.processCalendarEvent(googleEvent.data, mapping, calendar);
        result.eventsUpdated = syncResult.updated ? 1 : 0;
        result.conflictsDetected = syncResult.conflictDetected ? 1 : 0;
      }

      result.syncDuration = Date.now() - startTime;
      return result;
    } catch (error) {
      this.logger.error(`Single event sync failed for event ${eventId}:`, error);
      result.errorsEncountered++;
      result.syncDuration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Process webhook update from Google Calendar
   */
  async processWebhookUpdate(
    userId: string,
    calendarAccountId: string,
    webhookData: any,
  ): Promise<SyncResult> {
    const startTime = Date.now();
    this.logger.log(`Processing webhook update for user ${userId}, calendar ${calendarAccountId}`);

    const result: SyncResult = {
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      errorsEncountered: 0,
      syncDuration: 0,
    };

    try {
      // Get the specific calendar mapping
      const mapping = await this.drizzle.db
        .select()
        .from(calendarMappings)
        .where(
          and(
            eq(calendarMappings.userId, userId),
            eq(calendarMappings.calendarAccountId, calendarAccountId),
          ),
        )
        .limit(1);

      if (mapping.length === 0) {
        throw new NotFoundException('Calendar mapping not found');
      }

      const calendar = await this.getAuthenticatedCalendar(userId, calendarAccountId);
      const mapResult = await this.syncCalendarMapping(calendar, mapping[0], 'incremental');

      result.eventsProcessed = mapResult.eventsProcessed;
      result.eventsCreated = mapResult.eventsCreated;
      result.eventsUpdated = mapResult.eventsUpdated;
      result.eventsDeleted = mapResult.eventsDeleted;
      result.conflictsDetected = mapResult.conflictsDetected;

      result.syncDuration = Date.now() - startTime;
      return result;
    } catch (error) {
      this.logger.error(`Webhook processing failed:`, error);
      result.errorsEncountered++;
      result.syncDuration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Refresh user's OAuth token
   */
  async refreshUserToken(userId: string, googleEmail: string): Promise<void> {
    this.logger.log(`Refreshing token for user ${userId}, email ${googleEmail}`);

    const tokenRecord = await this.drizzle.db
      .select()
      .from(googleCalendarTokens)
      .where(
        and(
          eq(googleCalendarTokens.userId, userId),
          eq(googleCalendarTokens.googleEmail, googleEmail),
        ),
      )
      .limit(1);

    if (tokenRecord.length === 0) {
      throw new NotFoundException('Token record not found');
    }

    const token = tokenRecord[0];

    try {
      this.oauth2Client.setCredentials({
        refresh_token: token.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token || !credentials.expiry_date) {
        throw new Error('Failed to refresh token: Invalid credentials received');
      }

      // Update the token in the database
      await this.drizzle.db
        .update(googleCalendarTokens)
        .set({
          accessToken: credentials.access_token,
          expiresAt: new Date(credentials.expiry_date),
          lastTokenRefresh: new Date(),
          tokenRefreshCount: token.tokenRefreshCount + 1,
          lastError: null,
          errorCount: 0,
          lastErrorAt: null,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarTokens.id, token.id));

      this.logger.log(`Token refreshed successfully for user ${userId}`);
    } catch (error) {
      this.logger.error(`Token refresh failed for user ${userId}:`, error);

      // Update error tracking
      await this.drizzle.db
        .update(googleCalendarTokens)
        .set({
          lastError: error.message,
          errorCount: token.errorCount + 1,
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarTokens.id, token.id));

      throw error;
    }
  }

  /**
   * Resolve conflicts between local and remote events
   */
  async resolveConflicts(userId: string, conflicts: ConflictResolution[]): Promise<void> {
    this.logger.log(`Resolving ${conflicts.length} conflicts for user ${userId}`);

    for (const conflict of conflicts) {
      try {
        const event = await this.drizzle.db
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.id, conflict.eventId))
          .limit(1);

        if (event.length === 0) {
          this.logger.warn(`Event ${conflict.eventId} not found for conflict resolution`);
          continue;
        }

        let resolvedData: any;

        switch (conflict.resolution) {
          case 'local_wins':
            resolvedData = conflict.localVersion;
            break;
          case 'remote_wins':
            resolvedData = conflict.remoteVersion;
            break;
          case 'manual':
            resolvedData = conflict.resolvedVersion;
            break;
          default:
            throw new BadRequestException(`Invalid conflict resolution: ${conflict.resolution}`);
        }

        // Update the event with resolved data
        await this.drizzle.db
          .update(calendarEvents)
          .set({
            ...resolvedData,
            conflictDetected: false,
            conflictData: {
              localVersion: conflict.localVersion,
              remoteVersion: conflict.remoteVersion,
              conflictType: 'resolved',
              resolvedAt: new Date().toISOString(),
              resolution: conflict.resolution,
            },
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, conflict.eventId));

        this.logger.log(
          `Resolved conflict for event ${conflict.eventId} using ${conflict.resolution}`,
        );
      } catch (error) {
        this.logger.error(`Failed to resolve conflict for event ${conflict.eventId}:`, error);
      }
    }
  }

  /**
   * Get authenticated Google Calendar client
   */
  private async getAuthenticatedCalendar(
    userId: string,
    calendarAccountId: string,
  ): Promise<calendar_v3.Calendar> {
    const tokenRecord = await this.drizzle.db
      .select()
      .from(googleCalendarTokens)
      .innerJoin(calendarAccounts, eq(calendarAccounts.id, calendarAccountId))
      .where(
        and(
          eq(googleCalendarTokens.userId, userId),
          eq(calendarAccounts.id, calendarAccountId),
          eq(googleCalendarTokens.syncEnabled, true),
        ),
      )
      .limit(1);

    if (tokenRecord.length === 0) {
      throw new NotFoundException('Calendar token not found or sync disabled');
    }

    const token = tokenRecord[0].google_calendar_tokens;

    // Check if token is expired
    if (new Date(token.expiresAt) <= new Date()) {
      await this.refreshUserToken(userId, token.googleEmail);
      return this.getAuthenticatedCalendar(userId, calendarAccountId); // Recursive call with fresh token
    }

    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get user's calendar mappings
   */
  private async getUserCalendarMappings(
    userId: string,
    calendarAccountId?: string,
  ): Promise<CalendarMapping[]> {
    const whereConditions = [eq(calendarMappings.userId, userId)];

    if (calendarAccountId) {
      whereConditions.push(eq(calendarMappings.calendarAccountId, calendarAccountId));
    }

    return this.drizzle.db
      .select()
      .from(calendarMappings)
      .where(and(...whereConditions));
  }

  /**
   * Get calendar mapping by calendar ID
   */
  private async getCalendarMapping(
    userId: string,
    googleCalendarId: string,
  ): Promise<CalendarMapping | null> {
    const mapping = await this.drizzle.db
      .select()
      .from(calendarMappings)
      .where(
        and(
          eq(calendarMappings.userId, userId),
          eq(calendarMappings.googleCalendarId, googleCalendarId),
        ),
      )
      .limit(1);

    return mapping.length > 0 ? mapping[0] : null;
  }

  /**
   * Sync a specific calendar mapping
   */
  private async syncCalendarMapping(
    calendar: calendar_v3.Calendar,
    mapping: CalendarMapping,
    syncType: 'full' | 'incremental',
  ): Promise<SyncResult> {
    const result: SyncResult = {
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflictsDetected: 0,
      errorsEncountered: 0,
      syncDuration: 0,
    };

    try {
      const params: any = {
        calendarId: mapping.googleCalendarId,
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'updated',
      };

      // For incremental sync, use sync token if available
      if (syncType === 'incremental' && mapping.lastSyncToken) {
        params.syncToken = mapping.lastSyncToken;
      } else {
        // For full sync or first incremental sync, get events from last 30 days to 1 year ahead
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date();
        timeMax.setFullYear(timeMax.getFullYear() + 1);

        params.timeMin = timeMin.toISOString();
        params.timeMax = timeMax.toISOString();
      }

      let nextPageToken: string | undefined;
      let newSyncToken: string | undefined;

      do {
        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await calendar.events.list(params);
        const events = response.data.items || [];

        result.eventsProcessed += events.length;

        // Process each event
        for (const event of events) {
          try {
            const eventResult = await this.processCalendarEvent(event, mapping, calendar);
            if (eventResult.created) result.eventsCreated++;
            if (eventResult.updated) result.eventsUpdated++;
            if (eventResult.deleted) result.eventsDeleted++;
            if (eventResult.conflictDetected) result.conflictsDetected++;
          } catch (error) {
            this.logger.error(`Error processing event ${event.id}:`, error);
            result.errorsEncountered++;
          }
        }

        nextPageToken = response.data.nextPageToken;
        newSyncToken = response.data.nextSyncToken;
      } while (nextPageToken);

      // Update mapping with new sync token
      if (newSyncToken) {
        await this.drizzle.db
          .update(calendarMappings)
          .set({
            lastSyncToken: newSyncToken,
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(calendarMappings.id, mapping.id));

        result.syncToken = newSyncToken;
      }

      return result;
    } catch (error) {
      this.logger.error(`Error syncing calendar ${mapping.googleCalendarId}:`, error);
      throw error;
    }
  }

  /**
   * Process a single calendar event
   */
  private async processCalendarEvent(
    googleEvent: calendar_v3.Schema$Event,
    mapping: CalendarMapping,
    calendar: calendar_v3.Calendar,
  ): Promise<{
    created: boolean;
    updated: boolean;
    deleted: boolean;
    conflictDetected: boolean;
  }> {
    const result = {
      created: false,
      updated: false,
      deleted: false,
      conflictDetected: false,
    };

    if (!googleEvent.id) {
      return result;
    }

    // Check if event is deleted
    if (googleEvent.status === 'cancelled') {
      await this.handleDeletedEvent(googleEvent.id, mapping.userId);
      result.deleted = true;
      return result;
    }

    // Find existing event in our database
    const existingEvent = await this.drizzle.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, mapping.userId),
          eq(calendarEvents.googleEventId, googleEvent.id),
        ),
      )
      .limit(1);

    const eventData = this.convertGoogleEventToLocal(googleEvent, mapping);

    if (existingEvent.length === 0) {
      // Create new event
      await this.drizzle.db.insert(calendarEvents).values(eventData);
      result.created = true;

      // Auto-create task if enabled
      if (mapping.autoCreateTasks) {
        await this.createTaskFromEvent(eventData, mapping);
      }
    } else {
      // Update existing event
      const existing = existingEvent[0];
      const eventHash = this.generateEventHash(googleEvent);

      // Check for conflicts
      if (existing.locallyModified && existing.syncHash !== eventHash) {
        result.conflictDetected = true;
        await this.handleEventConflict(existing, googleEvent, mapping);
      } else {
        // No conflict, update the event
        await this.drizzle.db
          .update(calendarEvents)
          .set({
            ...eventData,
            syncHash: eventHash,
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, existing.id));

        result.updated = true;
      }
    }

    return result;
  }

  /**
   * Convert Google Calendar event to local event format
   */
  private convertGoogleEventToLocal(
    googleEvent: calendar_v3.Schema$Event,
    mapping: CalendarMapping,
  ): NewCalendarEvent {
    const startTime = googleEvent.start?.dateTime
      ? new Date(googleEvent.start.dateTime)
      : new Date(googleEvent.start?.date + 'T00:00:00');

    const endTime = googleEvent.end?.dateTime
      ? new Date(googleEvent.end.dateTime)
      : new Date(googleEvent.end?.date + 'T23:59:59');

    const isAllDay = !googleEvent.start?.dateTime && !!googleEvent.start?.date;

    // Detect if this is a study block
    const isStudyBlock = this.detectStudyBlock(googleEvent, mapping);

    // Map to subject if configured
    const subjectId = this.mapEventToSubject(googleEvent, mapping);

    return {
      id: uuidv4(),
      userId: mapping.userId,
      calendarAccountId: mapping.calendarAccountId,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || null,
      location: googleEvent.location || null,
      startTime,
      endTime,
      isAllDay,
      timezone: googleEvent.start?.timeZone || null,
      status: this.mapGoogleStatus(googleEvent.status),
      visibility: googleEvent.visibility || 'default',
      googleEventId: googleEvent.id!,
      googleCalendarId: mapping.googleCalendarId,
      googleHtmlLink: googleEvent.htmlLink || null,
      googleHangoutLink: googleEvent.hangoutLink || null,
      googleICalUID: googleEvent.iCalUID || null,
      googleSequence: googleEvent.sequence || 0,
      googleEtag: googleEvent.etag || null,
      isRecurring: !!googleEvent.recurrence,
      recurrenceRule: googleEvent.recurrence ? googleEvent.recurrence.join('\n') : null,
      attendees: this.mapAttendees(googleEvent.attendees),
      useDefaultReminders: googleEvent.reminders?.useDefault ?? true,
      overrideReminders: this.mapReminders(googleEvent.reminders?.overrides),
      subjectId,
      isStudyBlock,
      studyDuration: isStudyBlock
        ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
        : null,
      syncHash: this.generateEventHash(googleEvent),
      lastSyncAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Map Google Calendar event status to local status
   */
  private mapGoogleStatus(status?: string): 'tentative' | 'confirmed' | 'cancelled' {
    switch (status) {
      case 'tentative':
        return 'tentative';
      case 'confirmed':
        return 'confirmed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Map Google Calendar attendees to local format
   */
  private mapAttendees(attendees?: calendar_v3.Schema$EventAttendee[]): any[] {
    if (!attendees) return [];

    return attendees.map((attendee) => ({
      email: attendee.email!,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus as any,
      organizer: attendee.organizer,
      self: attendee.self,
    }));
  }

  /**
   * Map Google Calendar reminders to local format
   */
  private mapReminders(overrides?: calendar_v3.Schema$EventReminder[]): any[] {
    if (!overrides) return [];

    return overrides.map((reminder) => ({
      method: reminder.method as 'email' | 'popup',
      minutes: reminder.minutes!,
    }));
  }

  /**
   * Detect if an event is a study block based on mapping rules
   */
  private detectStudyBlock(
    googleEvent: calendar_v3.Schema$Event,
    mapping: CalendarMapping,
  ): boolean {
    if (!mapping.studyBlockDetection) return false;

    const title = googleEvent.summary?.toLowerCase() || '';
    const description = googleEvent.description?.toLowerCase() || '';

    // Common study-related keywords
    const studyKeywords = [
      'study',
      'homework',
      'assignment',
      'review',
      'reading',
      'practice',
      'exam',
      'test',
      'quiz',
      'learn',
      'research',
      'project',
      'coursework',
      'lecture',
      'tutorial',
    ];

    return studyKeywords.some(
      (keyword) => title.includes(keyword) || description.includes(keyword),
    );
  }

  /**
   * Map event to subject based on mapping rules
   */
  private mapEventToSubject(
    googleEvent: calendar_v3.Schema$Event,
    mapping: CalendarMapping,
  ): string | null {
    // Use default subject if configured
    if (mapping.defaultSubjectId) {
      return mapping.defaultSubjectId;
    }

    // Check title mappings
    if (mapping.eventTitleMappings) {
      const title = googleEvent.summary || '';
      for (const titleMapping of mapping.eventTitleMappings) {
        const regex = new RegExp(titleMapping.pattern, 'i');
        if (regex.test(title) && titleMapping.subjectId) {
          return titleMapping.subjectId;
        }
      }
    }

    // Check color mappings
    if (mapping.colorMappings && googleEvent.colorId) {
      const colorMapping = mapping.colorMappings.find(
        (cm) => cm.googleColorId === googleEvent.colorId,
      );
      if (colorMapping?.subjectId) {
        return colorMapping.subjectId;
      }
    }

    return null;
  }

  /**
   * Generate hash for event change detection
   */
  private generateEventHash(googleEvent: calendar_v3.Schema$Event): string {
    const hashData = {
      id: googleEvent.id,
      summary: googleEvent.summary,
      description: googleEvent.description,
      location: googleEvent.location,
      start: googleEvent.start,
      end: googleEvent.end,
      status: googleEvent.status,
      updated: googleEvent.updated,
      sequence: googleEvent.sequence,
    };

    return crypto.createHash('sha256').update(JSON.stringify(hashData)).digest('hex');
  }

  /**
   * Handle deleted events
   */
  private async handleDeletedEvent(googleEventId: string, userId: string): Promise<void> {
    await this.drizzle.db
      .update(calendarEvents)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(calendarEvents.userId, userId), eq(calendarEvents.googleEventId, googleEventId)),
      );
  }

  /**
   * Handle event conflicts
   */
  private async handleEventConflict(
    existingEvent: CalendarEvent,
    googleEvent: calendar_v3.Schema$Event,
    mapping: CalendarMapping,
  ): Promise<void> {
    const conflictData = {
      localVersion: existingEvent,
      remoteVersion: googleEvent,
      conflictType: 'data_mismatch',
      resolvedAt: null,
      resolution: null,
    };

    await this.drizzle.db
      .update(calendarEvents)
      .set({
        conflictDetected: true,
        conflictData,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, existingEvent.id));

    // Auto-resolve based on mapping preference
    if (mapping.conflictResolution !== 'manual') {
      const resolution: ConflictResolution = {
        eventId: existingEvent.id,
        resolution: mapping.conflictResolution,
        localVersion: existingEvent,
        remoteVersion: googleEvent,
      };

      await this.resolveConflicts(mapping.userId, [resolution]);
    }
  }

  /**
   * Create a task from a calendar event
   */
  private async createTaskFromEvent(
    eventData: NewCalendarEvent,
    mapping: CalendarMapping,
  ): Promise<void> {
    if (!eventData.isStudyBlock) return;

    try {
      await this.drizzle.db.insert(tasks).values({
        id: uuidv4(),
        userId: mapping.userId,
        subjectId: eventData.subjectId,
        title: `Study: ${eventData.title}`,
        description: eventData.description,
        dueDate: eventData.endTime,
        estimatedMinutes: eventData.studyDuration,
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.log(`Created task for study event: ${eventData.title}`);
    } catch (error) {
      this.logger.error(`Failed to create task for event ${eventData.title}:`, error);
    }
  }
}
