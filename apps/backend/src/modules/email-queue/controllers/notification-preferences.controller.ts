import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  NotificationPreferencesService,
  UpdateNotificationPreferencesDto,
} from '../services/notification-preferences.service';

class UpdateNotificationPreferencesRequestDto
  implements UpdateNotificationPreferencesDto
{
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;

  emailWelcomeEnabled?: boolean;
  emailVerificationEnabled?: boolean;
  emailPasswordResetEnabled?: boolean;
  emailTaskRemindersEnabled?: boolean;
  emailWeeklyDigestEnabled?: boolean;
  emailFocusSessionAlertsEnabled?: boolean;
  emailAchievementsEnabled?: boolean;

  taskReminders?: boolean;
  goalReminders?: boolean;
  achievements?: boolean;
  aiSuggestions?: boolean;
  systemAlerts?: boolean;

  reminderLeadTimeMinutes?: number;
  dailySummaryEnabled?: boolean;
  dailySummaryTime?: string;
  weeklyDigestEnabled?: boolean;
  weeklyDigestDay?: number;
  weeklyDigestTime?: string;

  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;

  reminderFrequency?: 'immediate' | 'daily' | 'weekly';
  digestFrequency?: 'daily' | 'weekly' | 'monthly';

  soundEnabled?: boolean;
  soundVolume?: number;
}

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private notificationPreferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get user notification preferences',
    description:
      'Retrieve the current notification preferences for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
  })
  async getPreferences(@Request() req: any) {
    const userId = req.user.id;
    const preferences =
      await this.notificationPreferencesService.getOrCreatePreferences(userId);

    return {
      success: true,
      data: preferences,
    };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user notification preferences',
    description: 'Update notification preferences for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid preference values provided',
  })
  async updatePreferences(
    @Request() req: any,
    @Body() updateDto: UpdateNotificationPreferencesRequestDto,
  ) {
    const userId = req.user.id;
    const updatedPreferences =
      await this.notificationPreferencesService.updatePreferences(
        userId,
        updateDto,
      );

    return {
      success: true,
      message: 'Notification preferences updated successfully',
      data: updatedPreferences,
    };
  }

  @Put('disable-all-emails')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable all email notifications',
    description: 'Disable all email notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'All email notifications disabled successfully',
  })
  async disableAllEmails(@Request() req: any) {
    const userId = req.user.id;
    await this.notificationPreferencesService.disableAllEmailNotifications(
      userId,
    );

    return {
      success: true,
      message: 'All email notifications have been disabled',
    };
  }

  @Put('enable-all-emails')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enable all email notifications',
    description: 'Enable all email notifications for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'All email notifications enabled successfully',
  })
  async enableAllEmails(@Request() req: any) {
    const userId = req.user.id;
    await this.notificationPreferencesService.enableAllEmailNotifications(
      userId,
    );

    return {
      success: true,
      message: 'All email notifications have been enabled',
    };
  }

  @Get('digest-settings')
  @ApiOperation({
    summary: 'Get weekly digest settings',
    description: 'Get the weekly digest settings for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Weekly digest settings retrieved successfully',
  })
  async getDigestSettings(@Request() req: any) {
    const userId = req.user.id;
    const digestSettings =
      await this.notificationPreferencesService.getUserDigestSettings(userId);

    return {
      success: true,
      data: digestSettings,
    };
  }
}
