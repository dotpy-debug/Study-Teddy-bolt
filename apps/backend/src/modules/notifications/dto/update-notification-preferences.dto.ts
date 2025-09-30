import { IsOptional, IsBoolean, IsObject, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationChannelPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable in-app notifications' })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}

export class NotificationTypePreferencesDto {
  @ApiPropertyOptional({ description: 'Task reminders' })
  @IsOptional()
  @IsBoolean()
  taskReminders?: boolean;

  @ApiPropertyOptional({ description: 'Task due notifications' })
  @IsOptional()
  @IsBoolean()
  taskDue?: boolean;

  @ApiPropertyOptional({ description: 'Session reminders' })
  @IsOptional()
  @IsBoolean()
  sessionReminders?: boolean;

  @ApiPropertyOptional({ description: 'Achievement notifications' })
  @IsOptional()
  @IsBoolean()
  achievements?: boolean;

  @ApiPropertyOptional({ description: 'Streak notifications' })
  @IsOptional()
  @IsBoolean()
  streaks?: boolean;

  @ApiPropertyOptional({ description: 'AI suggestions' })
  @IsOptional()
  @IsBoolean()
  aiSuggestions?: boolean;

  @ApiPropertyOptional({ description: 'System notifications' })
  @IsOptional()
  @IsBoolean()
  system?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable all notifications',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Channel preferences',
    type: NotificationChannelPreferencesDto,
  })
  @IsOptional()
  @IsObject()
  channels?: NotificationChannelPreferencesDto;

  @ApiPropertyOptional({
    description: 'Notification type preferences',
    type: NotificationTypePreferencesDto,
  })
  @IsOptional()
  @IsObject()
  types?: NotificationTypePreferencesDto;

  @ApiPropertyOptional({
    description: 'Default reminder time before tasks (minutes)',
    minimum: 5,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  defaultReminderMinutes?: number;

  @ApiPropertyOptional({
    description: 'Quiet hours start (24-hour format, e.g., 22 for 10 PM)',
    minimum: 0,
    maximum: 23,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  quietHoursStart?: number;

  @ApiPropertyOptional({
    description: 'Quiet hours end (24-hour format, e.g., 8 for 8 AM)',
    minimum: 0,
    maximum: 23,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  quietHoursEnd?: number;

  @ApiPropertyOptional({
    description: 'Enable weekend notifications',
  })
  @IsOptional()
  @IsBoolean()
  weekendNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Bundle similar notifications',
  })
  @IsOptional()
  @IsBoolean()
  bundleNotifications?: boolean;
}
