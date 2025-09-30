import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { Inject } from '@nestjs/common';
import { DRIZZLE_TOKEN } from '@/db/drizzle.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import {
  CalendarEvent,
  CalendarTokens,
  FreeBusyRequest,
  FreeBusyResponse,
  StudyTeddyCalendar,
  CalendarListEntry,
  ConflictCheckResult,
  NextFreeSlotOptions,
  TimeSlot,
  GoogleCalendarConfig,
  RecurringEventRule,
  CalendarEventExtended,
  BatchOperationResult,
  CalendarSyncResult,
  RateLimitStatus,
  NotificationSettings,
  CalendarWatchChannel,
} from './interfaces/calendar.interfaces';
import {
  calendarAccounts,
  calendarTokens,
  calendarEvents,
  calendarSyncLogs,
  calendarNotifications,
} from '@/db/schema';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly STUDY_TEDDY_CALENDAR_NAME = 'Study Teddy';
  private readonly STUDY_TEDDY_CALENDAR_COLOR = '#4285f4'; // Google Blue
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  // Rate limiting tracking
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly RATE_LIMIT_PER_USER = 100; // requests per minute
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

  // Batch operation settings
  private readonly BATCH_SIZE = 50;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second

  constructor(
    private readonly configService: ConfigService,
    @Inject(DRIZZLE_TOKEN) private readonly db: NodePgDatabase,
  ) {}

  /**
   * Get Google Calendar configuration
   */
  private getGoogleCalendarConfig(): GoogleCalendarConfig {
    return {
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      redirectUrl: this.configService.get<string>('GOOGLE_REDIRECT_URL')!,
      scopes: this.SCOPES,
      calendarName: this.STUDY_TEDDY_CALENDAR_NAME,
    };
  }

  /**
   * Create OAuth2 client
   */
  private createOAuth2Client(): OAuth2Client {
    const config = this.getGoogleCalendarConfig();
    return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUrl);
  }

  /**
   * Get OAuth2 authorization URL
   */
  async getAuthUrl(userId: string, state?: string): Promise<string> {
    try {
      const oauth2Client = this.createOAuth2Client();
      const config = this.getGoogleCalendarConfig();

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: config.scopes,
        prompt: 'consent',
        state: state || userId,
        include_granted_scopes: true,
      });

      this.logger.debug(`Generated auth URL for user ${userId}`);
      return authUrl;
    } catch (error) {
      this.logger.error(`Failed to generate auth URL: ${error.message}`);
      throw new HttpException(
        'Failed to generate authorization URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(userId: string, code: string): Promise<CalendarTokens> {
    try {
      const oauth2Client = this.createOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      const calendarTokens: CalendarTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type,
        scope: tokens.scope,
      };

      // Store tokens in database
      await this.storeTokens(userId, calendarTokens);

      this.logger.debug(`Stored tokens for user ${userId}`);
      return calendarTokens;
    } catch (error) {
      this.logger.error(`Failed to exchange code for tokens: ${error.message}`);
      throw new HttpException('Failed to exchange authorization code', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Store tokens in database
   */
  private async storeTokens(userId: string, tokens: CalendarTokens): Promise<void> {
    try {
      const existingTokens = await this.db
        .select()
        .from(calendarTokens)
        .where(eq(calendarTokens.userId, userId))
        .limit(1);

      const tokenData = {
        userId,
        provider: 'google' as const,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        updatedAt: new Date(),
      };

      if (existingTokens.length > 0) {
        await this.db
          .update(calendarTokens)
          .set(tokenData)
          .where(eq(calendarTokens.userId, userId));
      } else {
        await this.db.insert(calendarTokens).values({
          ...tokenData,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to store tokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get stored tokens for user
   */
  async getStoredTokens(userId: string): Promise<CalendarTokens | null> {
    try {
      const tokens = await this.db
        .select()
        .from(calendarTokens)
        .where(eq(calendarTokens.userId, userId))
        .limit(1);

      if (tokens.length === 0) {
        return null;
      }

      const token = tokens[0];
      return {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiryDate: token.expiryDate?.getTime(),
        tokenType: token.tokenType,
        scope: token.scope,
      };
    } catch (error) {
      this.logger.error(`Failed to get stored tokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<CalendarTokens> {
    try {
      const storedTokens = await this.getStoredTokens(userId);
      if (!storedTokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: storedTokens.refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      const newTokens: CalendarTokens = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || storedTokens.refreshToken,
        expiryDate: credentials.expiry_date,
        tokenType: credentials.token_type,
        scope: credentials.scope,
      };

      await this.storeTokens(userId, newTokens);

      this.logger.debug(`Refreshed tokens for user ${userId}`);
      return newTokens;
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      throw new HttpException('Failed to refresh access token', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Get authenticated OAuth2 client
   */
  private async getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
    const tokens = await this.getStoredTokens(userId);
    if (!tokens) {
      throw new HttpException('No calendar tokens found for user', HttpStatus.UNAUTHORIZED);
    }

    // Check if token needs refresh
    if (tokens.expiryDate && tokens.expiryDate <= Date.now()) {
      if (tokens.refreshToken) {
        const refreshedTokens = await this.refreshToken(userId);
        tokens.accessToken = refreshedTokens.accessToken;
        tokens.expiryDate = refreshedTokens.expiryDate;
      } else {
        throw new HttpException(
          'Access token expired and no refresh token available',
          HttpStatus.UNAUTHORIZED,
        );
      }
    }

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate,
      token_type: tokens.tokenType,
      scope: tokens.scope,
    });

    return oauth2Client;
  }

  /**
   * Get calendar API client
   */
  private async getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
    const authClient = await this.getAuthenticatedClient(userId);
    return google.calendar({ version: 'v3', auth: authClient });
  }

  /**
   * Check and enforce rate limits
   */
  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return;
    }

    if (userLimit.count >= this.RATE_LIMIT_PER_USER) {
      throw new HttpException(
        'Rate limit exceeded. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    userLimit.count += 1;
  }

  /**
   * Get rate limit status for user
   */
  getRateLimitStatus(userId: string): RateLimitStatus {
    const userLimit = this.rateLimitMap.get(userId);
    const now = Date.now();

    if (!userLimit || now > userLimit.resetTime) {
      return {
        remaining: this.RATE_LIMIT_PER_USER,
        resetTime: now + this.RATE_LIMIT_WINDOW,
        total: this.RATE_LIMIT_PER_USER,
      };
    }

    return {
      remaining: Math.max(0, this.RATE_LIMIT_PER_USER - userLimit.count),
      resetTime: userLimit.resetTime,
      total: this.RATE_LIMIT_PER_USER,
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS,
    baseDelay: number = this.RETRY_DELAY_BASE,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error.code === 401 || error.code === 403 || error.code === 404) {
          throw error;
        }

        if (attempt === maxAttempts) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        this.logger.warn(`Retrying operation, attempt ${attempt + 1}/${maxAttempts}`);
      }
    }

    throw lastError;
  }

  /**
   * List all calendars for the user
   */
  async listCalendars(userId: string): Promise<CalendarListEntry[]> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        const response = await calendar.calendarList.list({
          minAccessRole: 'reader',
          showDeleted: false,
          showHidden: false,
        });

        const calendars = response.data.items || [];

        return calendars.map((cal) => ({
          id: cal.id || '',
          summary: cal.summary || '',
          description: cal.description,
          primary: cal.primary || false,
          accessRole: cal.accessRole || 'reader',
          backgroundColor: cal.backgroundColor,
          timeZone: cal.timeZone,
          selected: cal.selected,
        }));
      });
    } catch (error) {
      this.logger.error(`Failed to list calendars for user ${userId}: ${error.message}`);
      throw new HttpException(
        `Failed to list calendars: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create or get Study Teddy calendar (idempotent)
   */
  async ensureStudyTeddyCalendar(userId: string): Promise<StudyTeddyCalendar> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        // First, check if Study Teddy calendar already exists
        const calendarList = await calendar.calendarList.list({
          minAccessRole: 'owner',
          showDeleted: false,
        });

        const existingCalendar = calendarList.data.items?.find(
          (cal) => cal.summary === this.STUDY_TEDDY_CALENDAR_NAME,
        );

        if (existingCalendar) {
          this.logger.debug(`Study Teddy calendar already exists: ${existingCalendar.id}`);
          return {
            id: existingCalendar.id || '',
            summary: existingCalendar.summary || '',
            description: existingCalendar.description || 'Your Study Teddy study sessions',
            timeZone: existingCalendar.timeZone || 'UTC',
          };
        }

        // Create new Study Teddy calendar
        this.logger.debug('Creating new Study Teddy calendar');
        const newCalendar = await calendar.calendars.insert({
          requestBody: {
            summary: this.STUDY_TEDDY_CALENDAR_NAME,
            description: 'Your Study Teddy study sessions and tasks',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          },
        });

        if (!newCalendar.data.id) {
          throw new Error('Failed to create calendar - no ID returned');
        }

        // Update calendar color and settings
        await calendar.calendarList.update({
          calendarId: newCalendar.data.id,
          requestBody: {
            backgroundColor: this.STUDY_TEDDY_CALENDAR_COLOR,
            foregroundColor: '#000000',
            selected: true,
            defaultReminders: [
              { method: 'popup', minutes: 15 },
              { method: 'email', minutes: 30 },
            ],
          },
        });

        this.logger.debug(`Created Study Teddy calendar: ${newCalendar.data.id}`);

        return {
          id: newCalendar.data.id,
          summary: newCalendar.data.summary || this.STUDY_TEDDY_CALENDAR_NAME,
          description: newCalendar.data.description || 'Your Study Teddy study sessions',
          timeZone: newCalendar.data.timeZone || 'UTC',
        };
      });
    } catch (error) {
      this.logger.error(`Failed to ensure Study Teddy calendar: ${error.message}`);
      throw new HttpException(
        `Failed to create Study Teddy calendar: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get Study Teddy calendar ID
   */
  async getStudyTeddyCalendarId(userId: string): Promise<string> {
    const calendar = await this.ensureStudyTeddyCalendar(userId);
    return calendar.id;
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    userId: string,
    event: CalendarEventExtended,
    calendarId?: string,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        // Use Study Teddy calendar if no calendar ID provided
        const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(userId));

        const eventData: calendar_v3.Schema$Event = {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          reminders: event.reminders,
          attendees: event.attendees,
          recurrence: event.recurrence,
          visibility: event.visibility,
          transparency: event.transparency,
          extendedProperties: {
            ...event.extendedProperties,
            private: {
              ...event.extendedProperties?.private,
              createdByStudyTeddy: 'true',
            },
          },
        };

        // Handle recurring events
        if (event.recurringRule) {
          eventData.recurrence = [this.buildRecurrenceRule(event.recurringRule)];
        }

        const response = await calendar.events.insert({
          calendarId: targetCalendarId,
          requestBody: eventData,
          sendUpdates: event.sendNotifications ? 'all' : 'none',
        });

        this.logger.debug(`Created event: ${response.data.id} in calendar ${targetCalendarId}`);

        // Store event in local database for sync tracking
        await this.storeEventLocally(userId, response.data, targetCalendarId);

        return response.data;
      });
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`);
      throw new HttpException(
        `Failed to create calendar event: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    event: Partial<CalendarEventExtended>,
    calendarId?: string,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(userId));

        // First get the existing event
        const existingEvent = await calendar.events.get({
          calendarId: targetCalendarId,
          eventId,
        });

        // Merge with updates
        const updatedEvent: calendar_v3.Schema$Event = {
          ...existingEvent.data,
          ...event,
          extendedProperties: {
            ...existingEvent.data.extendedProperties,
            ...event.extendedProperties,
            private: {
              ...existingEvent.data.extendedProperties?.private,
              ...event.extendedProperties?.private,
            },
          },
        };

        // Handle recurring rule updates
        if (event.recurringRule) {
          updatedEvent.recurrence = [this.buildRecurrenceRule(event.recurringRule)];
        }

        const response = await calendar.events.update({
          calendarId: targetCalendarId,
          eventId,
          requestBody: updatedEvent,
          sendUpdates: event.sendNotifications ? 'all' : 'none',
        });

        this.logger.debug(`Updated event: ${eventId} in calendar ${targetCalendarId}`);

        // Update event in local database
        await this.updateEventLocally(userId, response.data, targetCalendarId);

        return response.data;
      });
    } catch (error) {
      this.logger.error(`Failed to update event: ${error.message}`);
      throw new HttpException(
        `Failed to update calendar event: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    userId: string,
    eventId: string,
    calendarId?: string,
    sendUpdates: boolean = false,
  ): Promise<void> {
    try {
      this.checkRateLimit(userId);

      await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(userId));

        await calendar.events.delete({
          calendarId: targetCalendarId,
          eventId,
          sendUpdates: sendUpdates ? 'all' : 'none',
        });

        this.logger.debug(`Deleted event: ${eventId} from calendar ${targetCalendarId}`);

        // Remove event from local database
        await this.deleteEventLocally(userId, eventId, targetCalendarId);
      });
    } catch (error) {
      this.logger.error(`Failed to delete event: ${error.message}`);
      throw new HttpException(
        `Failed to delete calendar event: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a calendar event
   */
  async getEvent(
    userId: string,
    eventId: string,
    calendarId?: string,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(userId));

        const response = await calendar.events.get({
          calendarId: targetCalendarId,
          eventId,
        });

        return response.data;
      });
    } catch (error) {
      this.logger.error(`Failed to get event: ${error.message}`);
      throw new HttpException(
        `Failed to get calendar event: ${error.message}`,
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * List events in a time range
   */
  async listEvents(
    userId: string,
    timeMin: string,
    timeMax: string,
    calendarId?: string,
    options?: {
      maxResults?: number;
      orderBy?: 'startTime' | 'updated';
      showDeleted?: boolean;
      singleEvents?: boolean;
    },
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(userId));

        const response = await calendar.events.list({
          calendarId: targetCalendarId,
          timeMin,
          timeMax,
          singleEvents: options?.singleEvents ?? true,
          orderBy: options?.orderBy || 'startTime',
          maxResults: options?.maxResults || 2500,
          showDeleted: options?.showDeleted || false,
        });

        return response.data.items || [];
      });
    } catch (error) {
      this.logger.error(`Failed to list events: ${error.message}`);
      throw new HttpException(
        `Failed to list calendar events: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get free/busy information for multiple calendars
   */
  async getFreeBusy(
    userId: string,
    timeMin: string,
    timeMax: string,
    calendarIds?: string[],
  ): Promise<FreeBusyResponse> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);

        // If no calendar IDs provided, get all user's calendars
        let targetCalendarIds = calendarIds;
        if (!targetCalendarIds || targetCalendarIds.length === 0) {
          const calendars = await this.listCalendars(userId);
          targetCalendarIds = calendars.map((cal) => cal.id);
        }

        const request: FreeBusyRequest = {
          timeMin,
          timeMax,
          items: targetCalendarIds.map((id) => ({ id })),
        };

        const response = await calendar.freebusy.query({
          requestBody: request,
        });

        const result: FreeBusyResponse = {
          calendars: {},
        };

        // Process response
        if (response.data.calendars) {
          for (const [calendarId, calendarData] of Object.entries(response.data.calendars)) {
            result.calendars[calendarId] = {
              busy:
                calendarData.busy?.map((slot) => ({
                  start: slot.start || '',
                  end: slot.end || '',
                })) || [],
              errors: calendarData.errors,
            };
          }
        }

        return result;
      });
    } catch (error) {
      this.logger.error(`Failed to get free/busy information: ${error.message}`);
      throw new HttpException(
        `Failed to get availability: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check for event conflicts
   */
  async checkEventConflicts(
    userId: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string,
  ): Promise<ConflictCheckResult> {
    try {
      const busyTimes = await this.getAllBusyTimes(userId, startTime, endTime);
      const requestedStart = new Date(startTime).getTime();
      const requestedEnd = new Date(endTime).getTime();

      const conflictingEvents: ConflictCheckResult['conflictingEvents'] = [];

      for (const busy of busyTimes) {
        if (excludeEventId && busy.eventId === excludeEventId) {
          continue; // Skip the event we're updating
        }

        const busyStart = new Date(busy.start).getTime();
        const busyEnd = new Date(busy.end).getTime();

        // Check for overlap
        if (
          (requestedStart >= busyStart && requestedStart < busyEnd) ||
          (requestedEnd > busyStart && requestedEnd <= busyEnd) ||
          (requestedStart <= busyStart && requestedEnd >= busyEnd)
        ) {
          conflictingEvents.push({
            title: busy.title || 'Busy',
            start: busy.start,
            end: busy.end,
            calendarName: busy.calendarName,
            eventId: busy.eventId,
          });
        }
      }

      return {
        hasConflict: conflictingEvents.length > 0,
        conflictingEvents,
      };
    } catch (error) {
      this.logger.error(`Failed to check event conflicts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find next available time slot
   */
  async findNextFreeSlot(userId: string, options: NextFreeSlotOptions): Promise<TimeSlot | null> {
    try {
      const {
        startSearchFrom,
        endSearchAt,
        durationMinutes,
        breakMinutes = 0,
        preferredTimes,
        maxSearchDays = 30,
      } = options;

      const currentDate = new Date(startSearchFrom);
      const searchEndDate = new Date(
        Math.min(
          endSearchAt.getTime(),
          startSearchFrom.getTime() + maxSearchDays * 24 * 60 * 60 * 1000,
        ),
      );

      while (currentDate < searchEndDate) {
        // Check if current day matches preferred days of week
        if (
          preferredTimes?.daysOfWeek &&
          !preferredTimes.daysOfWeek.includes(currentDate.getDay())
        ) {
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(preferredTimes.startHour || 9, 0, 0, 0);
          continue;
        }

        const dayStart = new Date(currentDate);
        dayStart.setHours(preferredTimes?.startHour || 9, 0, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(preferredTimes?.endHour || 17, 0, 0, 0);

        // Get busy times for this day
        const busyTimes = await this.getAllBusyTimes(
          userId,
          dayStart.toISOString(),
          dayEnd.toISOString(),
        );

        // Sort busy times by start time
        busyTimes.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        // Find gaps between busy times
        let searchStart = dayStart;

        for (const busy of busyTimes) {
          const busyStart = new Date(busy.start);
          const gap = busyStart.getTime() - searchStart.getTime();
          const requiredTime = (durationMinutes + breakMinutes) * 60 * 1000;

          if (gap >= requiredTime) {
            // Found a suitable slot
            return {
              start: new Date(searchStart),
              end: new Date(searchStart.getTime() + durationMinutes * 60 * 1000),
              durationMinutes,
            };
          }

          searchStart = new Date(new Date(busy.end).getTime() + breakMinutes * 60 * 1000);
        }

        // Check if there's time after the last busy slot
        const remainingTime = dayEnd.getTime() - searchStart.getTime();
        const requiredTime = durationMinutes * 60 * 1000;

        if (remainingTime >= requiredTime) {
          return {
            start: new Date(searchStart),
            end: new Date(searchStart.getTime() + durationMinutes * 60 * 1000),
            durationMinutes,
          };
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(preferredTimes?.startHour || 9, 0, 0, 0);
      }

      return null; // No suitable slot found
    } catch (error) {
      this.logger.error(`Failed to find next free slot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch create events
   */
  async batchCreateEvents(
    userId: string,
    events: CalendarEventExtended[],
    calendarId?: string,
  ): Promise<BatchOperationResult> {
    const results: BatchOperationResult = {
      successful: [],
      failed: [],
      total: events.length,
    };

    // Process in batches
    for (let i = 0; i < events.length; i += this.BATCH_SIZE) {
      const batch = events.slice(i, i + this.BATCH_SIZE);

      const batchPromises = batch.map(async (event, index) => {
        try {
          const created = await this.createEvent(userId, event, calendarId);
          results.successful.push({
            index: i + index,
            event: created,
          });
        } catch (error) {
          results.failed.push({
            index: i + index,
            error: error.message,
            event: event,
          });
        }
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + this.BATCH_SIZE < events.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.debug(
      `Batch operation completed: ${results.successful.length} successful, ${results.failed.length} failed`,
    );
    return results;
  }

  /**
   * Batch update events
   */
  async batchUpdateEvents(
    userId: string,
    updates: Array<{ eventId: string; event: Partial<CalendarEventExtended> }>,
    calendarId?: string,
  ): Promise<BatchOperationResult> {
    const results: BatchOperationResult = {
      successful: [],
      failed: [],
      total: updates.length,
    };

    // Process in batches
    for (let i = 0; i < updates.length; i += this.BATCH_SIZE) {
      const batch = updates.slice(i, i + this.BATCH_SIZE);

      const batchPromises = batch.map(async (update, index) => {
        try {
          const updated = await this.updateEvent(userId, update.eventId, update.event, calendarId);
          results.successful.push({
            index: i + index,
            event: updated,
          });
        } catch (error) {
          results.failed.push({
            index: i + index,
            error: error.message,
            event: update,
          });
        }
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + this.BATCH_SIZE < updates.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.debug(
      `Batch update completed: ${results.successful.length} successful, ${results.failed.length} failed`,
    );
    return results;
  }

  /**
   * Batch delete events
   */
  async batchDeleteEvents(
    userId: string,
    eventIds: string[],
    calendarId?: string,
  ): Promise<BatchOperationResult> {
    const results: BatchOperationResult = {
      successful: [],
      failed: [],
      total: eventIds.length,
    };

    // Process in batches
    for (let i = 0; i < eventIds.length; i += this.BATCH_SIZE) {
      const batch = eventIds.slice(i, i + this.BATCH_SIZE);

      const batchPromises = batch.map(async (eventId, index) => {
        try {
          await this.deleteEvent(userId, eventId, calendarId);
          results.successful.push({
            index: i + index,
            eventId,
          });
        } catch (error) {
          results.failed.push({
            index: i + index,
            error: error.message,
            eventId,
          });
        }
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + this.BATCH_SIZE < eventIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.logger.debug(
      `Batch delete completed: ${results.successful.length} successful, ${results.failed.length} failed`,
    );
    return results;
  }

  /**
   * Synchronize calendar events bidirectionally
   */
  async syncCalendar(
    userId: string,
    calendarId?: string,
    options?: {
      fullSync?: boolean;
      lastSyncTime?: Date;
      conflictResolution?: 'google_wins' | 'local_wins' | 'merge';
    },
  ): Promise<CalendarSyncResult> {
    try {
      const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(userId));
      const lastSync = options?.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24h ago
      const syncTime = new Date();

      const result: CalendarSyncResult = {
        syncTime,
        eventsAdded: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        conflicts: [],
        errors: [],
      };

      // Get events from Google Calendar
      const googleEvents = await this.listEvents(
        userId,
        lastSync.toISOString(),
        syncTime.toISOString(),
        targetCalendarId,
        { showDeleted: true },
      );

      // Get local events from database
      const localEvents = await this.getLocalEvents(userId, targetCalendarId, lastSync);

      // Process Google events
      for (const googleEvent of googleEvents) {
        try {
          if (!googleEvent.id) continue;

          const localEvent = localEvents.find((e) => e.googleEventId === googleEvent.id);

          if (googleEvent.status === 'cancelled') {
            // Event was deleted in Google Calendar
            if (localEvent) {
              await this.deleteEventLocally(userId, googleEvent.id, targetCalendarId);
              result.eventsDeleted++;
            }
          } else if (!localEvent) {
            // New event from Google Calendar
            await this.storeEventLocally(userId, googleEvent, targetCalendarId);
            result.eventsAdded++;
          } else {
            // Event exists in both - check for conflicts
            const googleUpdated = new Date(googleEvent.updated || 0);
            const localUpdated = new Date(localEvent.updatedAt);

            if (googleUpdated > localUpdated) {
              // Google event is newer
              if (options?.conflictResolution === 'local_wins') {
                // Update Google with local data
                await this.updateEvent(
                  userId,
                  googleEvent.id,
                  {
                    summary: localEvent.title,
                    description: localEvent.description,
                    start: { dateTime: localEvent.startTime.toISOString() },
                    end: { dateTime: localEvent.endTime.toISOString() },
                  },
                  targetCalendarId,
                );
              } else {
                // Update local with Google data (default)
                await this.updateEventLocally(userId, googleEvent, targetCalendarId);
                result.eventsUpdated++;
              }
            } else if (localUpdated > googleUpdated) {
              // Local event is newer
              if (options?.conflictResolution === 'google_wins') {
                // Update local with Google data
                await this.updateEventLocally(userId, googleEvent, targetCalendarId);
                result.eventsUpdated++;
              } else {
                // Update Google with local data (default for local changes)
                await this.updateEvent(
                  userId,
                  googleEvent.id,
                  {
                    summary: localEvent.title,
                    description: localEvent.description,
                    start: { dateTime: localEvent.startTime.toISOString() },
                    end: { dateTime: localEvent.endTime.toISOString() },
                  },
                  targetCalendarId,
                );
              }
            }
          }
        } catch (error) {
          result.errors.push({
            eventId: googleEvent.id,
            error: error.message,
          });
        }
      }

      // Log sync operation
      await this.logSyncOperation(userId, targetCalendarId, result);

      this.logger.debug(`Calendar sync completed for user ${userId}: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to sync calendar: ${error.message}`);
      throw new HttpException(
        `Calendar sync failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Set up calendar change notifications (webhooks)
   */
  async setupCalendarNotifications(
    userId: string,
    webhookUrl: string,
    calendarId?: string,
  ): Promise<CalendarWatchChannel> {
    try {
      this.checkRateLimit(userId);

      return await this.retryOperation(async () => {
        const calendar = await this.getCalendarClient(userId);
        const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(userId));

        const channel = {
          id: `${userId}-${targetCalendarId}-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
          expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        };

        const response = await calendar.events.watch({
          calendarId: targetCalendarId,
          requestBody: channel,
        });

        const watchChannel: CalendarWatchChannel = {
          id: response.data.id!,
          resourceId: response.data.resourceId!,
          calendarId: targetCalendarId,
          expiration: new Date(parseInt(response.data.expiration)),
          webhookUrl,
        };

        // Store notification settings
        await this.storeNotificationSettings(userId, watchChannel);

        this.logger.debug(
          `Set up calendar notifications for user ${userId}, channel ${watchChannel.id}`,
        );
        return watchChannel;
      });
    } catch (error) {
      this.logger.error(`Failed to setup calendar notifications: ${error.message}`);
      throw new HttpException(
        `Failed to setup notifications: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Handle calendar change notifications
   */
  async handleCalendarNotification(
    channelId: string,
    resourceId: string,
    eventType: string,
  ): Promise<void> {
    try {
      // Get notification settings
      const notification = await this.getNotificationSettings(channelId);
      if (!notification) {
        this.logger.warn(`Received notification for unknown channel: ${channelId}`);
        return;
      }

      // Trigger calendar sync for the user
      await this.syncCalendar(notification.userId, notification.calendarId, {
        fullSync: false,
        lastSyncTime: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      });

      this.logger.debug(`Processed calendar notification for channel ${channelId}`);
    } catch (error) {
      this.logger.error(`Failed to handle calendar notification: ${error.message}`);
    }
  }

  /**
   * Revoke calendar access
   */
  async revokeAccess(userId: string): Promise<void> {
    try {
      const tokens = await this.getStoredTokens(userId);
      if (!tokens) {
        return; // Already revoked
      }

      // Revoke the token with Google
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });

      try {
        await oauth2Client.revokeCredentials();
      } catch (error) {
        // Token might already be revoked, log but continue
        this.logger.warn(`Failed to revoke credentials with Google: ${error.message}`);
      }

      // Remove tokens from database
      await this.db.delete(calendarTokens).where(eq(calendarTokens.userId, userId));

      // Remove local events
      await this.db.delete(calendarEvents).where(eq(calendarEvents.userId, userId));

      this.logger.debug(`Revoked calendar access for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke calendar access: ${error.message}`);
      throw new HttpException('Failed to revoke calendar access', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Private helper methods

  private async getAllBusyTimes(
    userId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<
    Array<{
      start: string;
      end: string;
      calendarId?: string;
      title?: string;
      eventId?: string;
      calendarName?: string;
    }>
  > {
    try {
      const freeBusy = await this.getFreeBusy(userId, timeMin, timeMax);
      const busyTimes: Array<{
        start: string;
        end: string;
        calendarId?: string;
        title?: string;
        eventId?: string;
        calendarName?: string;
      }> = [];

      for (const [calendarId, calendarData] of Object.entries(freeBusy.calendars)) {
        if (calendarData.busy) {
          calendarData.busy.forEach((slot) => {
            busyTimes.push({
              ...slot,
              calendarId,
            });
          });
        }
      }

      // Sort by start time
      busyTimes.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      return busyTimes;
    } catch (error) {
      this.logger.error(`Failed to get all busy times: ${error.message}`);
      throw error;
    }
  }

  private buildRecurrenceRule(rule: RecurringEventRule): string {
    let rrule = 'RRULE:';

    // Frequency
    rrule += `FREQ=${rule.frequency.toUpperCase()}`;

    // Interval
    if (rule.interval && rule.interval > 1) {
      rrule += `;INTERVAL=${rule.interval}`;
    }

    // End date or count
    if (rule.until) {
      const until = new Date(rule.until).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      rrule += `;UNTIL=${until}`;
    } else if (rule.count) {
      rrule += `;COUNT=${rule.count}`;
    }

    // Days of week (for weekly frequency)
    if (rule.byWeekDay && rule.byWeekDay.length > 0) {
      const days = rule.byWeekDay.map((day) => {
        const dayMap: { [key: string]: string } = {
          monday: 'MO',
          tuesday: 'TU',
          wednesday: 'WE',
          thursday: 'TH',
          friday: 'FR',
          saturday: 'SA',
          sunday: 'SU',
        };
        return dayMap[day.toLowerCase()] || day.toUpperCase().substring(0, 2);
      });
      rrule += `;BYDAY=${days.join(',')}`;
    }

    // Month days (for monthly frequency)
    if (rule.byMonthDay && rule.byMonthDay.length > 0) {
      rrule += `;BYMONTHDAY=${rule.byMonthDay.join(',')}`;
    }

    return rrule;
  }

  private async storeEventLocally(
    userId: string,
    event: calendar_v3.Schema$Event,
    calendarId: string,
  ): Promise<void> {
    try {
      if (!event.id) return;

      const eventData = {
        userId,
        googleEventId: event.id,
        calendarId,
        title: event.summary || '',
        description: event.description,
        location: event.location,
        startTime: new Date(event.start?.dateTime || event.start?.date || ''),
        endTime: new Date(event.end?.dateTime || event.end?.date || ''),
        isAllDay: !!(event.start?.date && event.end?.date),
        status: event.status || 'confirmed',
        created: event.created ? new Date(event.created) : new Date(),
        updated: event.updated ? new Date(event.updated) : new Date(),
        recurring: !!(event.recurrence && event.recurrence.length > 0),
        recurringEventId: event.recurringEventId,
        extendedProperties: event.extendedProperties
          ? JSON.stringify(event.extendedProperties)
          : null,
        etag: event.etag,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Check if event already exists
      const existingEvent = await this.db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.userId, userId),
            eq(calendarEvents.googleEventId, event.id),
            eq(calendarEvents.calendarId, calendarId),
          ),
        )
        .limit(1);

      if (existingEvent.length > 0) {
        await this.db
          .update(calendarEvents)
          .set({ ...eventData, updatedAt: new Date() })
          .where(
            and(
              eq(calendarEvents.userId, userId),
              eq(calendarEvents.googleEventId, event.id),
              eq(calendarEvents.calendarId, calendarId),
            ),
          );
      } else {
        await this.db.insert(calendarEvents).values(eventData);
      }
    } catch (error) {
      this.logger.error(`Failed to store event locally: ${error.message}`);
    }
  }

  private async updateEventLocally(
    userId: string,
    event: calendar_v3.Schema$Event,
    calendarId: string,
  ): Promise<void> {
    if (!event.id) return;
    await this.storeEventLocally(userId, event, calendarId);
  }

  private async deleteEventLocally(
    userId: string,
    eventId: string,
    calendarId: string,
  ): Promise<void> {
    try {
      await this.db
        .delete(calendarEvents)
        .where(
          and(
            eq(calendarEvents.userId, userId),
            eq(calendarEvents.googleEventId, eventId),
            eq(calendarEvents.calendarId, calendarId),
          ),
        );
    } catch (error) {
      this.logger.error(`Failed to delete event locally: ${error.message}`);
    }
  }

  private async getLocalEvents(userId: string, calendarId: string, since: Date): Promise<any[]> {
    try {
      return await this.db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.userId, userId),
            eq(calendarEvents.calendarId, calendarId),
            gte(calendarEvents.updatedAt, since),
          ),
        )
        .orderBy(desc(calendarEvents.updatedAt));
    } catch (error) {
      this.logger.error(`Failed to get local events: ${error.message}`);
      return [];
    }
  }

  private async logSyncOperation(
    userId: string,
    calendarId: string,
    result: CalendarSyncResult,
  ): Promise<void> {
    try {
      await this.db.insert(calendarSyncLogs).values({
        userId,
        calendarId,
        syncTime: result.syncTime,
        eventsAdded: result.eventsAdded,
        eventsUpdated: result.eventsUpdated,
        eventsDeleted: result.eventsDeleted,
        conflictsCount: result.conflicts.length,
        errorsCount: result.errors.length,
        details: JSON.stringify({
          conflicts: result.conflicts,
          errors: result.errors,
        }),
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to log sync operation: ${error.message}`);
    }
  }

  private async storeNotificationSettings(
    userId: string,
    channel: CalendarWatchChannel,
  ): Promise<void> {
    try {
      await this.db.insert(calendarNotifications).values({
        userId,
        channelId: channel.id,
        resourceId: channel.resourceId,
        calendarId: channel.calendarId,
        webhookUrl: channel.webhookUrl,
        expiration: channel.expiration,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to store notification settings: ${error.message}`);
    }
  }

  private async getNotificationSettings(
    channelId: string,
  ): Promise<{ userId: string; calendarId: string } | null> {
    try {
      const notification = await this.db
        .select()
        .from(calendarNotifications)
        .where(eq(calendarNotifications.channelId, channelId))
        .limit(1);

      return notification.length > 0
        ? {
            userId: notification[0].userId,
            calendarId: notification[0].calendarId,
          }
        : null;
    } catch (error) {
      this.logger.error(`Failed to get notification settings: ${error.message}`);
      return null;
    }
  }
}
