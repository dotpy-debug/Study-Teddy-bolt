import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  EnhancedNotificationQueryDto,
  BulkOperationDto,
  MarkAsReadDto,
  ArchiveNotificationsDto,
  UpdateNotificationPreferencesDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  CreatePushSubscriptionDto,
  SendTestPushDto,
  CreateScheduledNotificationDto,
  UpdateScheduledNotificationDto,
  CreateBatchNotificationDto,
  BatchStatusDto,
} from './dto/enhanced-index';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Enhanced Notifications')
@ApiBearerAuth()
@Controller('notifications/enhanced')
@UseGuards(JwtAuthGuard)
export class EnhancedNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // CORE NOTIFICATION OPERATIONS
  @Post()
  @ApiOperation({
    summary: 'Create a new notification',
    description:
      'Create a notification with enhanced features including scheduling, templates, and multi-channel delivery',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @ApiBody({ type: CreateNotificationDto })
  async createNotification(
    @CurrentUser() userId: string,
    @Body() createDto: CreateNotificationDto,
  ) {
    const notificationData = {
      ...createDto,
      scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : undefined,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : undefined,
    };

    return this.notificationsService.createNotification(userId, notificationData);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Retrieve notifications with advanced filtering, sorting, and pagination',
  })
  @ApiQuery({ type: EnhancedNotificationQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(
    @CurrentUser() userId: string,
    @Query() query: EnhancedNotificationQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(userId, query);
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
  async getNotificationById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() userId: string) {
    return this.notificationsService.getNotificationById(id, userId);
  }

  @Get('statistics/overview')
  @ApiOperation({
    summary: 'Get notification statistics',
    description: 'Get comprehensive statistics about user notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getNotificationStats(@CurrentUser() userId: string) {
    return this.notificationsService.getNotificationStats(userId);
  }

  @Get('count/unread')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Get the count of unread notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@CurrentUser() userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  // BULK OPERATIONS
  @Post('bulk-operation')
  @ApiOperation({
    summary: 'Perform bulk operations on notifications',
    description: 'Mark multiple notifications as read, archive, delete, or update priority',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed successfully',
  })
  @ApiBody({ type: BulkOperationDto })
  async bulkOperation(@CurrentUser() userId: string, @Body() bulkDto: BulkOperationDto) {
    return this.notificationsService.bulkOperation({
      ...bulkDto,
      userId,
    });
  }

  @Post('mark-read')
  @ApiOperation({
    summary: 'Mark notifications as read',
    description: 'Mark one or more notifications as read',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications marked as read successfully',
  })
  @ApiBody({ type: MarkAsReadDto })
  async markAsRead(@CurrentUser() userId: string, @Body() markAsReadDto: MarkAsReadDto) {
    return this.notificationsService.markAsRead(userId, markAsReadDto);
  }

  @Post('mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all user notifications as read',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
  })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Post('archive')
  @ApiOperation({
    summary: 'Archive notifications',
    description: 'Archive one or more notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications archived successfully',
  })
  @ApiBody({ type: ArchiveNotificationsDto })
  async archiveNotifications(
    @CurrentUser() userId: string,
    @Body() archiveDto: ArchiveNotificationsDto,
  ) {
    return this.notificationsService.archiveNotifications(userId, archiveDto.notificationIds);
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

  // PREFERENCES
  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Get user notification preferences including channel settings and quiet hours',
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
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  async updatePreferences(
    @CurrentUser() userId: string,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(userId, updateDto);
  }

  // TEMPLATES
  @Get('templates')
  @ApiOperation({
    summary: 'Get notification templates',
    description: 'Get all available notification templates',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  async getTemplates() {
    return this.notificationsService.getTemplates();
  }

  @Post('templates')
  @ApiOperation({
    summary: 'Create notification template',
    description: 'Create a new notification template',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
  })
  @ApiBody({ type: CreateNotificationTemplateDto })
  async createTemplate(@Body() createDto: CreateNotificationTemplateDto) {
    return this.notificationsService.createTemplate(createDto);
  }

  @Get('templates/:id')
  @ApiOperation({
    summary: 'Get template by ID',
    description: 'Retrieve a specific notification template',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  async getTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.getTemplateById(id);
  }

  @Put('templates/:id')
  @ApiOperation({
    summary: 'Update notification template',
    description: 'Update an existing notification template',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiBody({ type: UpdateNotificationTemplateDto })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(id, updateDto);
  }

  @Delete('templates/:id')
  @ApiOperation({
    summary: 'Delete notification template',
    description: 'Delete a notification template',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Template deleted successfully',
  })
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  // PUSH NOTIFICATIONS
  @Get('push/subscription')
  @ApiOperation({
    summary: 'Get push notification subscription',
    description: 'Get current push notification subscription status',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
  })
  async getPushSubscription(@CurrentUser() userId: string) {
    return this.notificationsService.getPushSubscription(userId);
  }

  @Post('push/subscribe')
  @ApiOperation({
    summary: 'Subscribe to push notifications',
    description: 'Subscribe to web push notifications',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscribed successfully',
  })
  @ApiBody({ type: CreatePushSubscriptionDto })
  async subscribeToPush(
    @CurrentUser() userId: string,
    @Body() subscriptionDto: CreatePushSubscriptionDto,
  ) {
    return this.notificationsService.subscribeToPush(userId, subscriptionDto);
  }

  @Delete('push/subscription')
  @ApiOperation({
    summary: 'Unsubscribe from push notifications',
    description: 'Remove push notification subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Unsubscribed successfully',
  })
  async unsubscribeFromPush(@CurrentUser() userId: string) {
    return this.notificationsService.unsubscribeFromPush(userId);
  }

  @Post('push/test')
  @ApiOperation({
    summary: 'Send test push notification',
    description: 'Send a test push notification to verify settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Test push notification sent successfully',
  })
  @ApiBody({ type: SendTestPushDto })
  async sendTestPush(@CurrentUser() userId: string, @Body() testDto: SendTestPushDto) {
    return this.notificationsService.sendTestNotification(userId, {
      type: 'info',
      channel: 'push',
    });
  }

  // SCHEDULED NOTIFICATIONS
  @Get('scheduled')
  @ApiOperation({
    summary: 'Get user scheduled notifications',
    description: 'Get all scheduled notifications for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled notifications retrieved successfully',
  })
  async getScheduledNotifications(@CurrentUser() userId: string) {
    // This would need to be implemented in the service
    return {
      message: 'Scheduled notifications endpoint - implementation needed',
    };
  }

  @Post('scheduled')
  @ApiOperation({
    summary: 'Schedule a notification',
    description: 'Create a scheduled notification with optional recurring settings',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification scheduled successfully',
  })
  @ApiBody({ type: CreateScheduledNotificationDto })
  async scheduleNotification(
    @CurrentUser() userId: string,
    @Body() scheduleDto: CreateScheduledNotificationDto,
  ) {
    const scheduledData = {
      ...scheduleDto,
      scheduledAt: new Date(scheduleDto.scheduledAt),
      recurring: scheduleDto.recurring
        ? {
            ...scheduleDto.recurring,
            endDate: scheduleDto.recurring.endDate ? scheduleDto.recurring.endDate : undefined,
          }
        : undefined,
    };

    return this.notificationsService.scheduleNotification(userId, scheduledData);
  }

  @Put('scheduled/:id')
  @ApiOperation({
    summary: 'Update scheduled notification',
    description: 'Update an existing scheduled notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled notification updated successfully',
  })
  @ApiBody({ type: UpdateScheduledNotificationDto })
  async updateScheduledNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateScheduledNotificationDto,
  ) {
    // This would need to be implemented in the service
    return {
      message: 'Update scheduled notification endpoint - implementation needed',
    };
  }

  @Delete('scheduled/:id')
  @ApiOperation({
    summary: 'Cancel scheduled notification',
    description: 'Cancel a scheduled notification',
  })
  @ApiParam({
    name: 'id',
    description: 'Scheduled notification ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Scheduled notification cancelled successfully',
  })
  async cancelScheduledNotification(@Param('id', ParseUUIDPipe) id: string) {
    // This would need to be implemented in the service
    return {
      message: 'Cancel scheduled notification endpoint - implementation needed',
    };
  }

  // BATCH NOTIFICATIONS
  @Post('batch')
  @ApiOperation({
    summary: 'Send batch notifications',
    description: 'Send notifications to multiple users using a template or custom content',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch notification job created successfully',
  })
  @ApiBody({ type: CreateBatchNotificationDto })
  async sendBatchNotifications(@Body() batchDto: CreateBatchNotificationDto) {
    return this.notificationsService.sendBatchNotifications(batchDto);
  }

  @Get('batch/:id/status')
  @ApiOperation({
    summary: 'Get batch notification status',
    description: 'Get the status of a batch notification job',
  })
  @ApiParam({
    name: 'id',
    description: 'Batch ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch status retrieved successfully',
  })
  async getBatchStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.getBatchStatus(id);
  }

  // TEST NOTIFICATION
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
}
