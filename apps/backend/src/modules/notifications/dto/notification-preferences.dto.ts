import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from '../types/notification.types';

export class CategoryPreferencesDto {
  @ApiProperty({
    description: 'Whether this category is enabled',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Preferred channels for this category',
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  })
  @IsString({ each: true })
  channels: NotificationChannel[];

  @ApiProperty({
    description: 'Priority level for this category',
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM,
  })
  @IsString()
  priority: NotificationPriority;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable in-app notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable SMS notifications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable quiet hours',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Quiet hours start time (HH:mm format)',
    example: '22:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursStart must be in HH:mm format',
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours end time (HH:mm format)',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'quietHoursEnd must be in HH:mm format',
  })
  quietHoursEnd?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Category-specific preferences',
    example: {
      study: {
        enabled: true,
        channels: ['in_app', 'email'],
        priority: 'medium',
      },
      task: {
        enabled: true,
        channels: ['in_app', 'email', 'push'],
        priority: 'high',
      },
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => CategoryPreferencesDto)
  categories?: Record<NotificationCategory, CategoryPreferencesDto>;
}
