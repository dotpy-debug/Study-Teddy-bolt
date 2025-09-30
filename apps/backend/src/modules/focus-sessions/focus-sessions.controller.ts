import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FocusSessionsService } from './focus-sessions.service';
import {
  StartFocusSessionDto,
  StopFocusSessionDto,
  ScheduleFocusSessionDto,
  UpdateFocusSessionDto,
  FocusSessionQueryDto,
} from './dto';

@ApiTags('Focus Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('focus')
export class FocusSessionsController {
  constructor(private readonly focusSessionsService: FocusSessionsService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new focus session' })
  async startSession(@CurrentUser() userId: string, @Body() dto: StartFocusSessionDto) {
    return this.focusSessionsService.startSession(userId, dto);
  }

  @Post('stop')
  @ApiOperation({ summary: 'Stop the current focus session' })
  async stopSession(@CurrentUser() userId: string, @Body() dto: StopFocusSessionDto) {
    return this.focusSessionsService.stopSession(userId, dto);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a future focus session' })
  async scheduleSession(@CurrentUser() userId: string, @Body() dto: ScheduleFocusSessionDto) {
    return this.focusSessionsService.scheduleSession(userId, dto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current active focus session' })
  async getCurrentSession(@CurrentUser() userId: string) {
    return this.focusSessionsService.getCurrentSession(userId);
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Get all scheduled focus sessions' })
  async getScheduledSessions(@CurrentUser() userId: string, @Query() query: FocusSessionQueryDto) {
    return this.focusSessionsService.getScheduledSessions(userId, query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get focus session history' })
  async getSessionHistory(@CurrentUser() userId: string, @Query() query: FocusSessionQueryDto) {
    return this.focusSessionsService.getSessionHistory(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific focus session' })
  async getSession(@CurrentUser() userId: string, @Param('id') sessionId: string) {
    return this.focusSessionsService.getSession(userId, sessionId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scheduled focus session' })
  async updateSession(
    @CurrentUser() userId: string,
    @Param('id') sessionId: string,
    @Body() dto: UpdateFocusSessionDto,
  ) {
    return this.focusSessionsService.updateSession(userId, sessionId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a scheduled focus session' })
  async cancelSession(@CurrentUser() userId: string, @Param('id') sessionId: string) {
    return this.focusSessionsService.cancelSession(userId, sessionId);
  }

  @Post(':id/extend')
  @ApiOperation({ summary: 'Extend the current focus session' })
  async extendSession(
    @CurrentUser() userId: string,
    @Param('id') sessionId: string,
    @Body() dto: { minutes: number },
  ) {
    return this.focusSessionsService.extendSession(userId, sessionId, dto.minutes);
  }
}
