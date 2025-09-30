import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  CalendarEvent,
  CalendarTokens,
  FreeBusyRequest,
  FreeBusyResponse,
  StudyTeddyCalendar,
  CalendarListEntry,
} from '../interfaces/calendar.interfaces';
import { GoogleOAuthService } from './google-oauth.service';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly STUDY_TEDDY_CALENDAR_NAME = 'Study Teddy';
  private readonly STUDY_TEDDY_CALENDAR_COLOR = '#4285f4'; // Google Blue

  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  /**
   * Get calendar API client
   */
  private getCalendarClient(authClient: OAuth2Client): calendar_v3.Calendar {
    return google.calendar({ version: 'v3', auth: authClient });
  }

  /**
   * List all calendars for the user
   */
  async listCalendars(tokens: CalendarTokens): Promise<CalendarListEntry[]> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

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
      }));
    } catch (error) {
      this.logger.error(`Failed to list calendars: ${error.message}`);
      throw new HttpException(
        `Failed to list calendars: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create or get Study Teddy calendar (idempotent)
   */
  async ensureStudyTeddyCalendar(tokens: CalendarTokens): Promise<StudyTeddyCalendar> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

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
    } catch (error) {
      this.logger.error(`Failed to ensure Study Teddy calendar: ${error.message}`);
      throw new HttpException(
        `Failed to create Study Teddy calendar: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get Study Teddy calendar ID
   */
  async getStudyTeddyCalendarId(tokens: CalendarTokens): Promise<string> {
    const calendar = await this.ensureStudyTeddyCalendar(tokens);
    return calendar.id;
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    tokens: CalendarTokens,
    event: CalendarEvent,
    calendarId?: string,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

      // Use Study Teddy calendar if no calendar ID provided
      const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(tokens));

      const response = await calendar.events.insert({
        calendarId: targetCalendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          reminders: event.reminders,
          attendees: event.attendees,
          extendedProperties: {
            ...event.extendedProperties,
            private: {
              ...event.extendedProperties?.private,
              createdByStudyTeddy: 'true',
            },
          },
        },
      });

      this.logger.debug(`Created event: ${response.data.id} in calendar ${targetCalendarId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`);
      throw new HttpException(
        `Failed to create calendar event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    tokens: CalendarTokens,
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId?: string,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

      const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(tokens));

      // First get the existing event
      const existingEvent = await calendar.events.get({
        calendarId: targetCalendarId,
        eventId,
      });

      // Merge with updates
      const updatedEvent = {
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

      const response = await calendar.events.update({
        calendarId: targetCalendarId,
        eventId,
        requestBody: updatedEvent,
      });

      this.logger.debug(`Updated event: ${eventId} in calendar ${targetCalendarId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update event: ${error.message}`);
      throw new HttpException(
        `Failed to update calendar event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    tokens: CalendarTokens,
    eventId: string,
    calendarId?: string,
    sendUpdates?: boolean,
  ): Promise<void> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

      const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(tokens));

      await calendar.events.delete({
        calendarId: targetCalendarId,
        eventId,
        sendUpdates: sendUpdates ? 'all' : 'none',
      });

      this.logger.debug(`Deleted event: ${eventId} from calendar ${targetCalendarId}`);
    } catch (error) {
      this.logger.error(`Failed to delete event: ${error.message}`);
      throw new HttpException(
        `Failed to delete calendar event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a calendar event
   */
  async getEvent(
    tokens: CalendarTokens,
    eventId: string,
    calendarId?: string,
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

      const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(tokens));

      const response = await calendar.events.get({
        calendarId: targetCalendarId,
        eventId,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get event: ${error.message}`);
      throw new HttpException(
        `Failed to get calendar event: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * List events in a time range
   */
  async listEvents(
    tokens: CalendarTokens,
    timeMin: string,
    timeMax: string,
    calendarId?: string,
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

      const targetCalendarId = calendarId || (await this.getStudyTeddyCalendarId(tokens));

      const response = await calendar.events.list({
        calendarId: targetCalendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      this.logger.error(`Failed to list events: ${error.message}`);
      throw new HttpException(
        `Failed to list calendar events: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get free/busy information for multiple calendars
   */
  async getFreeBusy(
    tokens: CalendarTokens,
    timeMin: string,
    timeMax: string,
    calendarIds?: string[],
  ): Promise<FreeBusyResponse> {
    try {
      const authClient = this.googleOAuthService.getAuthenticatedClient(tokens);
      const calendar = this.getCalendarClient(authClient);

      // If no calendar IDs provided, get all user's calendars
      let targetCalendarIds = calendarIds;
      if (!targetCalendarIds || targetCalendarIds.length === 0) {
        const calendars = await this.listCalendars(tokens);
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
    } catch (error) {
      this.logger.error(`Failed to get free/busy information: ${error.message}`);
      throw new HttpException(
        `Failed to get availability: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all busy times across all calendars
   */
  async getAllBusyTimes(
    tokens: CalendarTokens,
    timeMin: string,
    timeMax: string,
  ): Promise<Array<{ start: string; end: string; calendarId?: string }>> {
    try {
      const freeBusy = await this.getFreeBusy(tokens, timeMin, timeMax);
      const busyTimes: Array<{
        start: string;
        end: string;
        calendarId?: string;
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

  /**
   * Check if a specific time slot is available
   */
  async isTimeSlotAvailable(
    tokens: CalendarTokens,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    try {
      const busyTimes = await this.getAllBusyTimes(tokens, startTime, endTime);

      const requestedStart = new Date(startTime).getTime();
      const requestedEnd = new Date(endTime).getTime();

      // Check for conflicts
      for (const busy of busyTimes) {
        const busyStart = new Date(busy.start).getTime();
        const busyEnd = new Date(busy.end).getTime();

        // Check for overlap
        if (
          (requestedStart >= busyStart && requestedStart < busyEnd) ||
          (requestedEnd > busyStart && requestedEnd <= busyEnd) ||
          (requestedStart <= busyStart && requestedEnd >= busyEnd)
        ) {
          return false; // Conflict found
        }
      }

      return true; // No conflicts
    } catch (error) {
      this.logger.error(`Failed to check time slot availability: ${error.message}`);
      throw error;
    }
  }
}
