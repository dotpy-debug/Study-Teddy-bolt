import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  NotificationQueryDto,
  MarkAsReadDto,
  UpdateNotificationPreferencesDto,
  CreateNotificationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Retrieve all notifications for the authenticated user',
  })
  @ApiQuery({ type: NotificationQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(@CurrentUser() userId: string, @Query() query: NotificationQueryDto) {
    return this.notificationsService.getUserNotifications(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Get the count of unread notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        hasUnread: { type: 'boolean' },
      },
    },
  })
  async getUnreadCount(@CurrentUser() userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post('read')
  @ApiOperation({
    summary: 'Mark notifications as read',
    description: 'Mark one or more notifications as read',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read successfully',
  })
  async markAsRead(@CurrentUser() userId: string, @Body() markAsReadDto: MarkAsReadDto) {
    return this.notificationsService.markAsRead(userId, markAsReadDto);
  }

  @Post('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all user notifications as read',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
  })
  async markAllAsRead(@CurrentUser() userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Delete a specific notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  async deleteNotification(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() userId: string) {
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Clear all notifications',
    description: 'Delete all notifications for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications cleared successfully',
  })
  async clearNotifications(@CurrentUser() userId: string) {
    return this.notificationsService.clearAllNotifications(userId);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Get user notification preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  async getPreferences(@CurrentUser() userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Update user notification preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
  })
  async updatePreferences(
    @CurrentUser() userId: string,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, updateDto);
  }

  @Post('test')
  @ApiOperation({
    summary: 'Send test notification',
    description: 'Send a test notification to verify settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Test notification sent successfully',
  })
  async sendTestNotification(
    @CurrentUser() userId: string,
    @Body() testDto: { type: string; channel?: string },
  ) {
    return this.notificationsService.sendTestNotification(userId, testDto);
  }

  @Get('subscription')
  @ApiOperation({
    summary: 'Get push notification subscription',
    description: 'Get current push notification subscription status',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
  })
  async getSubscription(@CurrentUser() userId: string) {
    return this.notificationsService.getPushSubscription(userId);
  }

  @Post('subscription')
  @ApiOperation({
    summary: 'Subscribe to push notifications',
    description: 'Subscribe to web push notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscribed successfully',
  })
  async subscribe(@CurrentUser() userId: string, @Body() subscriptionDto: any) {
    return this.notificationsService.subscribeToPush(userId, subscriptionDto);
  }

  @Delete('subscription')
  @ApiOperation({
    summary: 'Unsubscribe from push notifications',
    description: 'Remove push notification subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Unsubscribed successfully',
  })
  async unsubscribe(@CurrentUser() userId: string) {
    return this.notificationsService.unsubscribeFromPush(userId);
  }
}
