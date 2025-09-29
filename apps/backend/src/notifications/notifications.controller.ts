import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
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
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  UpdatePreferencesDto,
  QueryNotificationsDto,
} from './dto';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new notification',
    description: 'Create a new notification for the authenticated user',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['success', 'error', 'warning', 'info'] },
        title: { type: 'string' },
        message: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        read: { type: 'boolean' },
        dismissed: { type: 'boolean' },
        actionUrl: { type: 'string' },
        actionLabel: { type: 'string' },
        metadata: { type: 'object' },
        channel: { type: 'string', enum: ['in_app', 'email', 'push'] },
        expiresAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid notification data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(user.userId, createNotificationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description:
      'Retrieve all notifications for the authenticated user with optional filtering',
  })
  @ApiQuery({ type: QueryNotificationsDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              type: { type: 'string' },
              title: { type: 'string' },
              message: { type: 'string' },
              priority: { type: 'string' },
              read: { type: 'boolean' },
              readAt: { type: 'string', format: 'date-time' },
              dismissed: { type: 'boolean' },
              dismissedAt: { type: 'string', format: 'date-time' },
              actionUrl: { type: 'string' },
              actionLabel: { type: 'string' },
              metadata: { type: 'object' },
              channel: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findAll(user.userId, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Get the count of unread notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notificationsService.getUnreadCount(user.userId);
    return { count };
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Get notification preferences for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        emailEnabled: { type: 'boolean' },
        emailTaskReminders: { type: 'boolean' },
        emailAchievements: { type: 'boolean' },
        emailSystemAlerts: { type: 'boolean' },
        pushEnabled: { type: 'boolean' },
        pushTaskReminders: { type: 'boolean' },
        pushAchievements: { type: 'boolean' },
        pushSystemAlerts: { type: 'boolean' },
        inAppEnabled: { type: 'boolean' },
        inAppTaskReminders: { type: 'boolean' },
        inAppAchievements: { type: 'boolean' },
        inAppSystemAlerts: { type: 'boolean' },
        soundEnabled: { type: 'boolean' },
        soundVolume: { type: 'string' },
        quietHoursEnabled: { type: 'boolean' },
        quietHoursStart: { type: 'string' },
        quietHoursEnd: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.userId);
  }

  @Put('preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Update notification preferences for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid preferences data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(
      user.userId,
      updatePreferencesDto,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get notification by ID',
    description: 'Retrieve a specific notification by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update notification',
    description: 'Update a notification (mark as read/dismissed)',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(
      id,
      user.userId,
      updateNotificationDto,
    );
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post('mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Mark all unread notifications as read for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of notifications marked as read',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Patch(':id/dismiss')
  @ApiOperation({
    summary: 'Dismiss notification',
    description: 'Mark a specific notification as dismissed',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification dismissed',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  async dismiss(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.dismiss(id, user.userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Delete a specific notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiNoContentResponse({ description: 'Notification deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationsService.delete(id, user.userId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete all notifications',
    description: 'Delete all notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications deleted',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of notifications deleted',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async deleteAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.deleteAll(user.userId);
  }
}
