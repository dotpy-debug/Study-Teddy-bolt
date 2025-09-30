import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { BetterAuthGuard } from '../auth/guards/better-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BetterAuthUser } from '../auth/better-auth.service';
import { SessionsService } from './sessions.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryDto,
  SessionStatsQueryDto,
  CreateAnalyticsDto,
} from './dto/sessions.dto';

@ApiTags('Focus Sessions')
@Controller('focus-sessions')
@UseGuards(BetterAuthGuard)
@ApiBearerAuth('Better Auth')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all focus sessions for current user' })
  @ApiQuery({ type: SessionQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns focus sessions with optional filtering',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              type: {
                type: 'string',
                enum: ['pomodoro', 'free', 'goal_based'],
              },
              status: {
                type: 'string',
                enum: ['active', 'paused', 'completed', 'abandoned'],
              },
              startTime: { type: 'string', format: 'date-time' },
              endTime: { type: 'string', format: 'date-time' },
              totalDuration: { type: 'number' },
              focusScore: { type: 'number' },
              goals: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSessions(@CurrentUser() user: BetterAuthUser, @Query() query: SessionQueryDto) {
    const sessions = await this.sessionsService.getSessions(user.id, query);
    return {
      success: true,
      data: sessions,
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active focus session' })
  @ApiResponse({
    status: 200,
    description: 'Returns active session if exists',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            currentDuration: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async getActiveSession(@CurrentUser() user: BetterAuthUser) {
    const session = await this.sessionsService.getActiveSession(user.id);
    return {
      success: true,
      data: session,
    };
  }

  @Get('paused')
  @ApiOperation({ summary: 'Get paused focus sessions' })
  @ApiResponse({
    status: 200,
    description: 'Returns paused sessions',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async getPausedSessions(@CurrentUser() user: BetterAuthUser) {
    const sessions = await this.sessionsService.getPausedSessions(user.id);
    return {
      success: true,
      data: sessions,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get focus session statistics' })
  @ApiQuery({ type: SessionStatsQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns session statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            period: { type: 'string' },
            totalSessions: { type: 'number' },
            totalDuration: { type: 'number' },
            totalDurationFormatted: { type: 'string' },
            avgDuration: { type: 'number' },
            avgDurationFormatted: { type: 'string' },
            avgFocusScore: { type: 'number' },
            totalPomodoros: { type: 'number' },
            totalBreaks: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSessionStats(@CurrentUser() user: BetterAuthUser, @Query() query: SessionStatsQueryDto) {
    const stats = await this.sessionsService.getSessionStats(user.id, query);
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get focus session by ID' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns session details',
  })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async getSessionById(
    @CurrentUser() user: BetterAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const session = await this.sessionsService.getSessionById(user.id, id);
    return {
      success: true,
      data: session,
    };
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get real-time session status' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns real-time session status with current duration',
  })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async getSessionStatus(@Param('id', ParseUUIDPipe) id: string) {
    const status = await this.sessionsService.getSessionStatus(id);
    return {
      success: true,
      data: status,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Start a new focus session' })
  @ApiResponse({
    status: 201,
    description: 'Focus session started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' },
            startTime: { type: 'string', format: 'date-time' },
            goals: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid session data or active session exists',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async startSession(@CurrentUser() user: BetterAuthUser, @Body() createDto: CreateSessionDto) {
    const session = await this.sessionsService.startSession(user.id, createDto);
    return {
      success: true,
      data: session,
      message: `${createDto.type} session started successfully`,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Session updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateSession(
    @CurrentUser() user: BetterAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSessionDto,
  ) {
    const session = await this.sessionsService.updateSession(user.id, id, updateDto);
    return {
      success: true,
      data: session,
      message: 'Session updated successfully',
    };
  }

  @Put(':id/pause')
  @ApiOperation({ summary: 'Pause a focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Focus session paused successfully',
  })
  @ApiBadRequestResponse({ description: 'Session cannot be paused' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async pauseSession(@CurrentUser() user: BetterAuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const session = await this.sessionsService.pauseSession(user.id, id);
    return {
      success: true,
      data: session,
      message: 'Session paused successfully',
    };
  }

  @Put(':id/resume')
  @ApiOperation({ summary: 'Resume a focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Focus session resumed successfully',
  })
  @ApiBadRequestResponse({ description: 'Session cannot be resumed' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async resumeSession(@CurrentUser() user: BetterAuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const session = await this.sessionsService.resumeSession(user.id, id);
    return {
      success: true,
      data: session,
      message: 'Session resumed successfully',
    };
  }

  @Put(':id/end')
  @ApiOperation({ summary: 'End a focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Focus session ended successfully',
  })
  @ApiBadRequestResponse({ description: 'Session cannot be ended' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async endSession(@CurrentUser() user: BetterAuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const session = await this.sessionsService.endSession(user.id, id);
    return {
      success: true,
      data: session,
      message: 'Session ended successfully',
    };
  }

  @Put(':id/abandon')
  @ApiOperation({ summary: 'Abandon a focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Focus session abandoned successfully',
  })
  @ApiBadRequestResponse({ description: 'Session cannot be abandoned' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async abandonSession(
    @CurrentUser() user: BetterAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const session = await this.sessionsService.abandonSession(user.id, id);
    return {
      success: true,
      data: session,
      message: 'Session abandoned successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Session deleted successfully',
  })
  @ApiBadRequestResponse({ description: 'Cannot delete active session' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @HttpCode(HttpStatus.OK)
  async deleteSession(@CurrentUser() user: BetterAuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.sessionsService.deleteSession(user.id, id);
    return {
      success: true,
      message: 'Session deleted successfully',
    };
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get analytics for a focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns session analytics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            productivityScore: { type: 'number' },
            averageFocusTime: { type: 'number' },
            peakFocusTime: { type: 'string' },
            breakPattern: { type: 'array' },
            keyInsights: { type: 'array' },
            recommendations: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Session or analytics not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async getSessionAnalytics(
    @CurrentUser() user: BetterAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const analytics = await this.sessionsService.getSessionAnalytics(user.id, id);
    return {
      success: true,
      data: analytics,
    };
  }

  @Post(':id/analytics')
  @ApiOperation({ summary: 'Create analytics for a focus session' })
  @ApiParam({
    name: 'id',
    description: 'Session ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Analytics created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid analytics data or analytics already exist',
  })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createSessionAnalytics(
    @CurrentUser() user: BetterAuthUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() createDto: Omit<CreateAnalyticsDto, 'sessionId'>,
  ) {
    const analyticsDto: CreateAnalyticsDto = {
      ...createDto,
      sessionId,
    };

    const analytics = await this.sessionsService.createSessionAnalytics(user.id, analyticsDto);
    return {
      success: true,
      data: analytics,
      message: 'Analytics created successfully',
    };
  }
}
