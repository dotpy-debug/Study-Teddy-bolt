import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DrizzleService } from '@/db/drizzle.service';
import { calendarAccounts, tasks, focusSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { GoogleOAuthService } from './services/google-oauth.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { CalendarSchedulingService } from './services/calendar-scheduling.service';
import {
  ConnectCalendarDto,
  DisconnectCalendarDto,
  ScheduleSessionDto,
  UpdateScheduledSessionDto,
  DeleteScheduledSessionDto,
  CheckAvailabilityDto,
  AvailabilityResponseDto,
  CalendarEventDto,
  CalendarAccountResponseDto,
} from './dto';
import {
  CalendarTokens,
  CalendarEvent,
  TimeSlot,
} from './interfaces/calendar.interfaces';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly schedulingService: CalendarSchedulingService,
  ) {}

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(userId: string): Promise<string> {
    // Use userId as state for security
    return this.googleOAuthService.generateAuthUrl(userId);
  }

  /**
   * Connect calendar account
   */
  async connectCalendar(
    userId: string,
    dto: ConnectCalendarDto,
  ): Promise<CalendarAccountResponseDto> {
    try {
      // Exchange code for tokens
      const tokens = await this.googleOAuthService.getTokensFromCode(dto.code);

      // Get user info
      const userInfo = await this.googleOAuthService.getUserInfo(
        tokens.accessToken,
      );

      // Check if account already exists
      const existingAccount = await this.drizzle.db
        .select()
        .from(calendarAccounts)
        .where(
          and(
            eq(calendarAccounts.userId, userId),
            eq(calendarAccounts.accountEmail, userInfo.email),
          ),
        )
        .limit(1);

      if (existingAccount.length > 0) {
        // Update existing account
        const [updated] = await this.drizzle.db
          .update(calendarAccounts)
          .set({
            accessToken: tokens.accessToken,
            refreshToken:
              tokens.refreshToken || existingAccount[0].refreshToken,
            tokenExpiresAt: tokens.expiryDate
              ? new Date(tokens.expiryDate)
              : null,
            syncEnabled: true,
            syncError: null,
            updatedAt: new Date(),
          })
          .where(eq(calendarAccounts.id, existingAccount[0].id))
          .returning();

        // Ensure Study Teddy calendar exists
        await this.googleCalendarService.ensureStudyTeddyCalendar(tokens);

        return this.mapToResponseDto(updated);
      }

      // Create new calendar account
      const [newAccount] = await this.drizzle.db
        .insert(calendarAccounts)
        .values({
          userId,
          provider: 'google',
          accountEmail: userInfo.email,
          accountName: userInfo.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiryDate
            ? new Date(tokens.expiryDate)
            : null,
          syncEnabled: true,
          isPrimary: false, // Will be set to true if it's the first account
        })
        .returning();

      // Set as primary if it's the first account
      const accountCount = await this.drizzle.db
        .select()
        .from(calendarAccounts)
        .where(eq(calendarAccounts.userId, userId));

      if (accountCount.length === 1) {
        await this.drizzle.db
          .update(calendarAccounts)
          .set({ isPrimary: true })
          .where(eq(calendarAccounts.id, newAccount.id));
        newAccount.isPrimary = true;
      }

      // Ensure Study Teddy calendar exists
      await this.googleCalendarService.ensureStudyTeddyCalendar(tokens);

      // Get list of calendars and store their IDs
      const calendars = await this.googleCalendarService.listCalendars(tokens);
      await this.drizzle.db
        .update(calendarAccounts)
        .set({
          calendarIds: calendars.map((cal) => cal.id),
        })
        .where(eq(calendarAccounts.id, newAccount.id));

      return this.mapToResponseDto(newAccount);
    } catch (error) {
      this.logger.error(`Failed to connect calendar: ${error.message}`);
      throw new BadRequestException(
        `Failed to connect calendar: ${error.message}`,
      );
    }
  }

  /**
   * Disconnect calendar account
   */
  async disconnectCalendar(
    userId: string,
    dto: DisconnectCalendarDto,
  ): Promise<void> {
    const account = await this.getCalendarAccount(
      userId,
      dto.calendarAccountId,
    );

    // Revoke tokens
    try {
      await this.googleOAuthService.revokeToken(account.accessToken);
    } catch (error) {
      this.logger.warn(`Failed to revoke token: ${error.message}`);
    }

    // Delete account
    await this.drizzle.db
      .delete(calendarAccounts)
      .where(eq(calendarAccounts.id, dto.calendarAccountId));

    this.logger.debug(
      `Disconnected calendar account ${dto.calendarAccountId} for user ${userId}`,
    );
  }

  /**
   * Get user's calendar accounts
   */
  async getCalendarAccounts(
    userId: string,
  ): Promise<CalendarAccountResponseDto[]> {
    const accounts = await this.drizzle.db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.userId, userId));

    return accounts.map((account) => this.mapToResponseDto(account));
  }

  /**
   * Schedule a study session
   */
  async scheduleSession(
    userId: string,
    dto: ScheduleSessionDto,
  ): Promise<CalendarEventDto> {
    // Get task
    const [task] = await this.drizzle.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, dto.taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get primary calendar account
    const account = await this.getPrimaryCalendarAccount(userId);
    const tokens = await this.getValidTokens(account);

    // Check for conflicts
    const conflicts = await this.schedulingService.checkConflicts(
      tokens,
      new Date(dto.startTime),
      new Date(dto.endTime),
    );

    if (conflicts.hasConflict) {
      // Suggest alternatives
      const alternatives = await this.schedulingService.suggestAlternativeSlots(
        tokens,
        new Date(dto.startTime),
        Math.ceil(
          (new Date(dto.endTime).getTime() -
            new Date(dto.startTime).getTime()) /
            (60 * 1000),
        ),
      );

      throw new BadRequestException({
        message: 'Time slot has conflicts',
        conflicts: conflicts.conflictingEvents,
        alternatives: alternatives.map((slot) => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        })),
      });
    }

    // Create calendar event
    const event: CalendarEvent = {
      summary: dto.title || task.title,
      description: dto.description || task.description || '',
      location: dto.location,
      start: {
        dateTime: dto.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: dto.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders:
        dto.sendReminders !== false
          ? {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: dto.reminderMinutes || 15 },
                { method: 'email', minutes: dto.reminderMinutes || 15 },
              ],
            }
          : {
              useDefault: false,
            },
      extendedProperties: {
        private: {
          taskId: dto.taskId,
          createdByStudyTeddy: 'true',
        },
      },
    };

    const createdEvent = await this.googleCalendarService.createEvent(
      tokens,
      event,
    );

    // Create focus session record
    const [focusSession] = await this.drizzle.db
      .insert(focusSessions)
      .values({
        userId,
        taskId: dto.taskId,
        subjectId: task.subjectId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        durationMinutes: Math.ceil(
          (new Date(dto.endTime).getTime() -
            new Date(dto.startTime).getTime()) /
            (60 * 1000),
        ),
      })
      .returning();

    return this.mapEventToDto(createdEvent, dto.taskId, focusSession.id);
  }

  /**
   * Update scheduled session
   */
  async updateScheduledSession(
    userId: string,
    dto: UpdateScheduledSessionDto,
  ): Promise<CalendarEventDto> {
    const account = await this.getPrimaryCalendarAccount(userId);
    const tokens = await this.getValidTokens(account);

    // Check for conflicts if time is being changed
    if (dto.startTime || dto.endTime) {
      const existingEvent = await this.googleCalendarService.getEvent(
        tokens,
        dto.eventId,
      );

      const newStart =
        dto.startTime ||
        existingEvent.start?.dateTime ||
        existingEvent.start?.date;
      const newEnd =
        dto.endTime || existingEvent.end?.dateTime || existingEvent.end?.date;

      const conflicts = await this.schedulingService.checkConflicts(
        tokens,
        new Date(newStart!),
        new Date(newEnd!),
      );

      if (conflicts.hasConflict) {
        throw new BadRequestException({
          message: 'Updated time slot has conflicts',
          conflicts: conflicts.conflictingEvents,
        });
      }
    }

    const updateData: Partial<CalendarEvent> = {};

    if (dto.title) updateData.summary = dto.title;
    if (dto.description) updateData.description = dto.description;
    if (dto.location) updateData.location = dto.location;
    if (dto.startTime) {
      updateData.start = {
        dateTime: dto.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (dto.endTime) {
      updateData.end = {
        dateTime: dto.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    const updatedEvent = await this.googleCalendarService.updateEvent(
      tokens,
      dto.eventId,
      updateData,
    );

    return this.mapEventToDto(updatedEvent);
  }

  /**
   * Delete scheduled session
   */
  async deleteScheduledSession(
    userId: string,
    dto: DeleteScheduledSessionDto,
  ): Promise<void> {
    const account = await this.getPrimaryCalendarAccount(userId);
    const tokens = await this.getValidTokens(account);

    await this.googleCalendarService.deleteEvent(
      tokens,
      dto.eventId,
      undefined,
      dto.sendCancellation,
    );
  }

  /**
   * Check availability
   */
  async checkAvailability(
    userId: string,
    dto: CheckAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    const account = await this.getPrimaryCalendarAccount(userId);
    const tokens = await this.getValidTokens(account);

    // Get busy times
    const busyTimes = await this.googleCalendarService.getAllBusyTimes(
      tokens,
      dto.startTime,
      dto.endTime,
    );

    // Find available slots
    const availableSlots = await this.schedulingService.findAvailableSlots(
      tokens,
      new Date(dto.startTime),
      new Date(dto.endTime),
      dto.durationMinutes,
      {
        breakMinutes: dto.breakMinutes || 15,
      },
    );

    // Find next available slot
    const nextSlot = await this.schedulingService.findNextFreeSlot(tokens, {
      startSearchFrom: new Date(dto.startTime),
      endSearchAt: new Date(dto.endTime),
      durationMinutes: dto.durationMinutes,
      breakMinutes: dto.breakMinutes,
    });

    return {
      busySlots: busyTimes.map((slot) => ({
        start: slot.start,
        end: slot.end,
      })),
      availableSlots: availableSlots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        durationMinutes: slot.durationMinutes,
      })),
      nextAvailableSlot: nextSlot
        ? {
            start: nextSlot.start.toISOString(),
            end: nextSlot.end.toISOString(),
            durationMinutes: nextSlot.durationMinutes,
          }
        : undefined,
    };
  }

  /**
   * Get calendar events for a time range
   */
  async getEvents(
    userId: string,
    startTime: string,
    endTime: string,
  ): Promise<CalendarEventDto[]> {
    const account = await this.getPrimaryCalendarAccount(userId);
    const tokens = await this.getValidTokens(account);

    const events = await this.googleCalendarService.listEvents(
      tokens,
      startTime,
      endTime,
    );

    return events.map((event) => this.mapEventToDto(event));
  }

  /**
   * Helper: Get calendar account
   */
  private async getCalendarAccount(userId: string, accountId: string) {
    const [account] = await this.drizzle.db
      .select()
      .from(calendarAccounts)
      .where(
        and(
          eq(calendarAccounts.id, accountId),
          eq(calendarAccounts.userId, userId),
        ),
      )
      .limit(1);

    if (!account) {
      throw new NotFoundException('Calendar account not found');
    }

    return account;
  }

  /**
   * Helper: Get primary calendar account
   */
  private async getPrimaryCalendarAccount(userId: string) {
    const [account] = await this.drizzle.db
      .select()
      .from(calendarAccounts)
      .where(
        and(
          eq(calendarAccounts.userId, userId),
          eq(calendarAccounts.isPrimary, true),
        ),
      )
      .limit(1);

    if (!account) {
      // Try to get any account
      const [anyAccount] = await this.drizzle.db
        .select()
        .from(calendarAccounts)
        .where(eq(calendarAccounts.userId, userId))
        .limit(1);

      if (!anyAccount) {
        throw new NotFoundException(
          'No calendar account connected. Please connect a Google Calendar first.',
        );
      }

      return anyAccount;
    }

    return account;
  }

  /**
   * Helper: Get valid tokens (refresh if needed)
   */
  private async getValidTokens(account: any): Promise<CalendarTokens> {
    const tokens: CalendarTokens = {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      expiryDate: account.tokenExpiresAt?.getTime(),
    };

    // Check if token is expired
    if (this.googleOAuthService.isTokenExpired(tokens.expiryDate)) {
      if (!tokens.refreshToken) {
        throw new BadRequestException(
          'Calendar access expired. Please reconnect your calendar.',
        );
      }

      // Refresh token
      const newTokens = await this.googleOAuthService.refreshAccessToken(
        tokens.refreshToken,
      );

      // Update in database
      await this.drizzle.db
        .update(calendarAccounts)
        .set({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken || account.refreshToken,
          tokenExpiresAt: newTokens.expiryDate
            ? new Date(newTokens.expiryDate)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(calendarAccounts.id, account.id));

      return newTokens;
    }

    return tokens;
  }

  /**
   * Helper: Map calendar account to response DTO
   */
  private mapToResponseDto(account: any): CalendarAccountResponseDto {
    return {
      id: account.id,
      userId: account.userId,
      provider: account.provider,
      accountEmail: account.accountEmail,
      accountName: account.accountName,
      syncEnabled: account.syncEnabled,
      lastSyncAt: account.lastSyncAt,
      calendarIds: account.calendarIds,
      isPrimary: account.isPrimary,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Helper: Map Google Calendar event to DTO
   */
  private mapEventToDto(
    event: any,
    taskId?: string,
    focusSessionId?: string,
  ): CalendarEventDto {
    return {
      id: event.id || '',
      title: event.summary || '',
      description: event.description,
      startTime: event.start?.dateTime || event.start?.date || '',
      endTime: event.end?.dateTime || event.end?.date || '',
      location: event.location,
      taskId: taskId || event.extendedProperties?.private?.taskId,
      focusSessionId:
        focusSessionId || event.extendedProperties?.private?.focusSessionId,
      calendarId: event.organizer?.email || '',
      htmlLink: event.htmlLink || '',
      createdAt: new Date(event.created || Date.now()),
      updatedAt: new Date(event.updated || Date.now()),
    };
  }
}
