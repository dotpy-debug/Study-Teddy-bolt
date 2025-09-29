import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CalendarService } from './calendar.service';
import { GoogleCalendarService } from './google-calendar.service';
import {
  ConnectCalendarDto,
  DisconnectCalendarDto,
  ScheduleSessionDto,
  UpdateScheduledSessionDto,
  DeleteScheduledSessionDto,
  CheckAvailabilityDto,
  GetCalendarAuthUrlResponseDto,
  CalendarAccountResponseDto,
  CalendarEventDto,
  AvailabilityResponseDto,
  CreateEventDto,
  UpdateEventDto,
  BatchCreateEventsDto,
  BatchUpdateEventsDto,
  BatchDeleteEventsDto,
  SyncCalendarDto,
  FindFreeSlotDto,
  SetupNotificationsDto,
  EventQueryDto,
} from './dto';
import {
  CalendarEventExtended,
  CalendarListEntry,
  BatchOperationResult,
  CalendarSyncResult,
  ConflictCheckResult,
  TimeSlot,
  RateLimitStatus,
  CalendarWatchChannel,
} from './interfaces/calendar.interfaces';

@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get Google Calendar OAuth URL' })
  @ApiResponse({
    status: 200,
    description: 'OAuth URL generated successfully',
    type: GetCalendarAuthUrlResponseDto,
  })
  async getAuthUrl(@Request() req): Promise<GetCalendarAuthUrlResponseDto> {
    const authUrl = await this.calendarService.getAuthUrl(req.user.userId);
    return { authUrl };
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect Google Calendar account' })
  @ApiResponse({
    status: 201,
    description: 'Calendar connected successfully',
    type: CalendarAccountResponseDto,
  })
  async connectCalendar(
    @Request() req,
    @Body() dto: ConnectCalendarDto,
  ): Promise<CalendarAccountResponseDto> {
    return this.calendarService.connectCalendar(req.user.userId, dto);
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect calendar account' })
  @ApiResponse({
    status: 204,
    description: 'Calendar disconnected successfully',
  })
  async disconnectCalendar(
    @Request() req,
    @Body() dto: DisconnectCalendarDto,
  ): Promise<void> {
    return this.calendarService.disconnectCalendar(req.user.userId, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get connected calendar accounts' })
  @ApiResponse({
    status: 200,
    description: 'Calendar accounts retrieved successfully',
    type: [CalendarAccountResponseDto],
  })
  async getCalendarAccounts(
    @Request() req,
  ): Promise<CalendarAccountResponseDto[]> {
    return this.calendarService.getCalendarAccounts(req.user.userId);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a study session' })
  @ApiResponse({
    status: 201,
    description: 'Study session scheduled successfully',
    type: CalendarEventDto,
  })
  async scheduleSession(
    @Request() req,
    @Body() dto: ScheduleSessionDto,
  ): Promise<CalendarEventDto> {
    return this.calendarService.scheduleSession(req.user.userId, dto);
  }

  @Put('schedule')
  @ApiOperation({ summary: 'Update scheduled session' })
  @ApiResponse({
    status: 200,
    description: 'Study session updated successfully',
    type: CalendarEventDto,
  })
  async updateScheduledSession(
    @Request() req,
    @Body() dto: UpdateScheduledSessionDto,
  ): Promise<CalendarEventDto> {
    return this.calendarService.updateScheduledSession(req.user.userId, dto);
  }

  @Delete('schedule')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete scheduled session' })
  @ApiResponse({
    status: 204,
    description: 'Study session deleted successfully',
  })
  async deleteScheduledSession(
    @Request() req,
    @Body() dto: DeleteScheduledSessionDto,
  ): Promise<void> {
    return this.calendarService.deleteScheduledSession(req.user.userId, dto);
  }

  @Post('check-availability')
  @ApiOperation({ summary: 'Check calendar availability' })
  @ApiResponse({
    status: 200,
    description: 'Availability checked successfully',
    type: AvailabilityResponseDto,
  })
  async checkAvailability(
    @Request() req,
    @Body() dto: CheckAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    return this.calendarService.checkAvailability(req.user.userId, dto);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get calendar events for time range' })
  @ApiQuery({
    name: 'startTime',
    required: true,
    description: 'Start time (ISO 8601)',
    example: '2025-01-15T00:00:00Z',
  })
  @ApiQuery({
    name: 'endTime',
    required: true,
    description: 'End time (ISO 8601)',
    example: '2025-01-22T00:00:00Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    type: [CalendarEventDto],
  })
  async getEvents(
    @Request() req,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ): Promise<CalendarEventDto[]> {
    return this.calendarService.getEvents(req.user.userId, startTime, endTime);
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Google Calendar OAuth callback' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ): Promise<{ message: string }> {
    // This endpoint would typically be handled by the frontend
    // The frontend should capture the code and call POST /api/calendar/connect
    return {
      message:
        'Please use the authorization code to complete calendar connection',
    };
  }

  // ============================================================================
  // GOOGLE CALENDAR API ENDPOINTS
  // ============================================================================

  @Get('google/calendars')
  @ApiOperation({ summary: 'List all Google calendars for the user' })
  @ApiResponse({
    status: 200,
    description: 'Calendars retrieved successfully',
    type: [CalendarListEntry],
  })
  async listGoogleCalendars(@Request() req): Promise<CalendarListEntry[]> {
    return this.googleCalendarService.listCalendars(req.user.userId);
  }

  @Post('google/events')
  @ApiOperation({ summary: 'Create a new event in Google Calendar' })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
  })
  async createGoogleEvent(
    @Request() req,
    @Body() createEventDto: CreateEventDto,
  ): Promise<any> {
    return this.googleCalendarService.createEvent(
      req.user.userId,
      createEventDto,
      createEventDto.calendarId,
    );
  }

  @Get('google/events/:eventId')
  @ApiOperation({ summary: 'Get a specific event from Google Calendar' })
  @ApiParam({ name: 'eventId', description: 'Google Calendar event ID' })
  @ApiQuery({
    name: 'calendarId',
    required: false,
    description: 'Calendar ID (optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Event retrieved successfully',
  })
  async getGoogleEvent(
    @Request() req,
    @Param('eventId') eventId: string,
    @Query('calendarId') calendarId?: string,
  ): Promise<any> {
    return this.googleCalendarService.getEvent(
      req.user.userId,
      eventId,
      calendarId,
    );
  }

  @Put('google/events/:eventId')
  @ApiOperation({ summary: 'Update an event in Google Calendar' })
  @ApiParam({ name: 'eventId', description: 'Google Calendar event ID' })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
  })
  async updateGoogleEvent(
    @Request() req,
    @Param('eventId') eventId: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<any> {
    return this.googleCalendarService.updateEvent(
      req.user.userId,
      eventId,
      updateEventDto,
      updateEventDto.calendarId,
    );
  }

  @Delete('google/events/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event from Google Calendar' })
  @ApiParam({ name: 'eventId', description: 'Google Calendar event ID' })
  @ApiQuery({
    name: 'calendarId',
    required: false,
    description: 'Calendar ID (optional)',
  })
  @ApiQuery({
    name: 'sendUpdates',
    required: false,
    type: Boolean,
    description: 'Send notifications to attendees',
  })
  @ApiResponse({
    status: 204,
    description: 'Event deleted successfully',
  })
  async deleteGoogleEvent(
    @Request() req,
    @Param('eventId') eventId: string,
    @Query('calendarId') calendarId?: string,
    @Query('sendUpdates') sendUpdates?: boolean,
  ): Promise<void> {
    return this.googleCalendarService.deleteEvent(
      req.user.userId,
      eventId,
      calendarId,
      sendUpdates,
    );
  }

  @Get('google/events')
  @ApiOperation({ summary: 'List events from Google Calendar' })
  @ApiQuery({
    name: 'timeMin',
    required: true,
    description: 'Start time (ISO 8601)',
  })
  @ApiQuery({
    name: 'timeMax',
    required: true,
    description: 'End time (ISO 8601)',
  })
  @ApiQuery({
    name: 'calendarId',
    required: false,
    description: 'Calendar ID (optional)',
  })
  @ApiQuery({
    name: 'maxResults',
    required: false,
    type: Number,
    description: 'Maximum number of results',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['startTime', 'updated'],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'showDeleted',
    required: false,
    type: Boolean,
    description: 'Include deleted events',
  })
  @ApiQuery({
    name: 'singleEvents',
    required: false,
    type: Boolean,
    description: 'Expand recurring events',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
  })
  async listGoogleEvents(
    @Request() req,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax: string,
    @Query('calendarId') calendarId?: string,
    @Query('maxResults', new ParseIntPipe({ optional: true }))
    maxResults?: number,
    @Query('orderBy') orderBy?: 'startTime' | 'updated',
    @Query('showDeleted') showDeleted?: boolean,
    @Query('singleEvents') singleEvents?: boolean,
  ): Promise<any[]> {
    return this.googleCalendarService.listEvents(
      req.user.userId,
      timeMin,
      timeMax,
      calendarId,
      {
        maxResults,
        orderBy,
        showDeleted,
        singleEvents,
      },
    );
  }

  @Post('google/events/conflicts/check')
  @ApiOperation({ summary: 'Check for event conflicts' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        startTime: { type: 'string', format: 'date-time' },
        endTime: { type: 'string', format: 'date-time' },
        excludeEventId: { type: 'string' },
      },
      required: ['startTime', 'endTime'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Conflict check completed',
    type: ConflictCheckResult,
  })
  async checkEventConflicts(
    @Request() req,
    @Body()
    body: { startTime: string; endTime: string; excludeEventId?: string },
  ): Promise<ConflictCheckResult> {
    return this.googleCalendarService.checkEventConflicts(
      req.user.userId,
      body.startTime,
      body.endTime,
      body.excludeEventId,
    );
  }

  @Post('google/events/find-free-slot')
  @ApiOperation({ summary: 'Find next available time slot' })
  @ApiBody({ type: FindFreeSlotDto })
  @ApiResponse({
    status: 200,
    description: 'Free slot search completed',
    type: TimeSlot,
  })
  async findNextFreeSlot(
    @Request() req,
    @Body() findFreeSlotDto: FindFreeSlotDto,
  ): Promise<TimeSlot | null> {
    return this.googleCalendarService.findNextFreeSlot(req.user.userId, {
      startSearchFrom: new Date(findFreeSlotDto.startSearchFrom),
      endSearchAt: new Date(findFreeSlotDto.endSearchAt),
      durationMinutes: findFreeSlotDto.durationMinutes,
      breakMinutes: findFreeSlotDto.breakMinutes,
      preferredTimes: findFreeSlotDto.preferredTimes,
      maxSearchDays: findFreeSlotDto.maxSearchDays,
    });
  }

  @Get('google/freebusy')
  @ApiOperation({ summary: 'Get free/busy information for calendars' })
  @ApiQuery({
    name: 'timeMin',
    required: true,
    description: 'Start time (ISO 8601)',
  })
  @ApiQuery({
    name: 'timeMax',
    required: true,
    description: 'End time (ISO 8601)',
  })
  @ApiQuery({
    name: 'calendarIds',
    required: false,
    isArray: true,
    description: 'Calendar IDs (optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Free/busy information retrieved successfully',
  })
  async getFreeBusy(
    @Request() req,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax: string,
    @Query('calendarIds') calendarIds?: string[],
  ): Promise<any> {
    return this.googleCalendarService.getFreeBusy(
      req.user.userId,
      timeMin,
      timeMax,
      calendarIds,
    );
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  @Post('google/events/batch/create')
  @ApiOperation({ summary: 'Create multiple events in batch' })
  @ApiBody({ type: BatchCreateEventsDto })
  @ApiResponse({
    status: 200,
    description: 'Batch create operation completed',
    type: BatchOperationResult,
  })
  async batchCreateEvents(
    @Request() req,
    @Body() batchCreateDto: BatchCreateEventsDto,
  ): Promise<BatchOperationResult> {
    return this.googleCalendarService.batchCreateEvents(
      req.user.userId,
      batchCreateDto.events,
      batchCreateDto.calendarId,
    );
  }

  @Put('google/events/batch/update')
  @ApiOperation({ summary: 'Update multiple events in batch' })
  @ApiBody({ type: BatchUpdateEventsDto })
  @ApiResponse({
    status: 200,
    description: 'Batch update operation completed',
    type: BatchOperationResult,
  })
  async batchUpdateEvents(
    @Request() req,
    @Body() batchUpdateDto: BatchUpdateEventsDto,
  ): Promise<BatchOperationResult> {
    return this.googleCalendarService.batchUpdateEvents(
      req.user.userId,
      batchUpdateDto.updates,
      batchUpdateDto.calendarId,
    );
  }

  @Delete('google/events/batch/delete')
  @ApiOperation({ summary: 'Delete multiple events in batch' })
  @ApiBody({ type: BatchDeleteEventsDto })
  @ApiResponse({
    status: 200,
    description: 'Batch delete operation completed',
    type: BatchOperationResult,
  })
  async batchDeleteEvents(
    @Request() req,
    @Body() batchDeleteDto: BatchDeleteEventsDto,
  ): Promise<BatchOperationResult> {
    return this.googleCalendarService.batchDeleteEvents(
      req.user.userId,
      batchDeleteDto.eventIds,
      batchDeleteDto.calendarId,
    );
  }

  // ============================================================================
  // CALENDAR SYNC
  // ============================================================================

  @Post('google/sync')
  @ApiOperation({ summary: 'Synchronize calendar events bidirectionally' })
  @ApiBody({ type: SyncCalendarDto })
  @ApiResponse({
    status: 200,
    description: 'Calendar sync completed',
    type: CalendarSyncResult,
  })
  async syncCalendar(
    @Request() req,
    @Body() syncDto: SyncCalendarDto,
  ): Promise<CalendarSyncResult> {
    return this.googleCalendarService.syncCalendar(
      req.user.userId,
      syncDto.calendarId,
      {
        fullSync: syncDto.fullSync,
        lastSyncTime: syncDto.lastSyncTime
          ? new Date(syncDto.lastSyncTime)
          : undefined,
        conflictResolution: syncDto.conflictResolution,
      },
    );
  }

  @Get('google/sync/status')
  @ApiOperation({ summary: 'Get calendar sync status' })
  @ApiQuery({
    name: 'calendarId',
    required: false,
    description: 'Calendar ID (optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync status retrieved successfully',
  })
  async getSyncStatus(
    @Request() req,
    @Query('calendarId') calendarId?: string,
  ): Promise<any> {
    // This would typically get sync status from database
    // For now, return basic information
    return {
      lastSyncTime: new Date(),
      status: 'idle',
      calendarId: calendarId || 'default',
    };
  }

  // ============================================================================
  // NOTIFICATIONS & WEBHOOKS
  // ============================================================================

  @Post('google/notifications/setup')
  @ApiOperation({ summary: 'Setup calendar change notifications' })
  @ApiBody({ type: SetupNotificationsDto })
  @ApiResponse({
    status: 200,
    description: 'Notifications setup successfully',
    type: CalendarWatchChannel,
  })
  async setupNotifications(
    @Request() req,
    @Body() setupDto: SetupNotificationsDto,
  ): Promise<CalendarWatchChannel> {
    return this.googleCalendarService.setupCalendarNotifications(
      req.user.userId,
      setupDto.webhookUrl,
      setupDto.calendarId,
    );
  }

  @Post('google/notifications/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle calendar change notification webhook' })
  @ApiResponse({
    status: 200,
    description: 'Webhook handled successfully',
  })
  async handleWebhook(
    @Request() req,
    @Body() body: any,
  ): Promise<{ status: string }> {
    // Extract channel info from headers and body
    const channelId = req.headers['x-goog-channel-id'] as string;
    const resourceId = req.headers['x-goog-resource-id'] as string;
    const eventType = req.headers['x-goog-resource-state'] as string;

    if (channelId && resourceId && eventType) {
      await this.googleCalendarService.handleCalendarNotification(
        channelId,
        resourceId,
        eventType,
      );
    }

    return { status: 'ok' };
  }

  // ============================================================================
  // RATE LIMITING & STATUS
  // ============================================================================

  @Get('google/rate-limit')
  @ApiOperation({ summary: 'Get current rate limit status' })
  @ApiResponse({
    status: 200,
    description: 'Rate limit status retrieved successfully',
    type: RateLimitStatus,
  })
  async getRateLimitStatus(@Request() req): Promise<RateLimitStatus> {
    return this.googleCalendarService.getRateLimitStatus(req.user.userId);
  }

  // ============================================================================
  // CALENDAR MANAGEMENT
  // ============================================================================

  @Post('google/calendar/ensure-study-teddy')
  @ApiOperation({ summary: 'Ensure Study Teddy calendar exists' })
  @ApiResponse({
    status: 200,
    description: 'Study Teddy calendar ensured successfully',
  })
  async ensureStudyTeddyCalendar(@Request() req): Promise<any> {
    return this.googleCalendarService.ensureStudyTeddyCalendar(req.user.userId);
  }

  @Post('google/revoke-access')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke Google Calendar access' })
  @ApiResponse({
    status: 204,
    description: 'Access revoked successfully',
  })
  async revokeGoogleAccess(@Request() req): Promise<void> {
    return this.googleCalendarService.revokeAccess(req.user.userId);
  }

  @Post('google/token/refresh')
  @ApiOperation({ summary: 'Refresh Google Calendar access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  async refreshToken(@Request() req): Promise<any> {
    return this.googleCalendarService.refreshToken(req.user.userId);
  }

  @Post('google/oauth/exchange')
  @ApiOperation({ summary: 'Exchange authorization code for tokens' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
      },
      required: ['code'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens exchanged successfully',
  })
  async exchangeCodeForTokens(
    @Request() req,
    @Body() body: { code: string },
  ): Promise<any> {
    return this.googleCalendarService.exchangeCodeForTokens(
      req.user.userId,
      body.code,
    );
  }
}
