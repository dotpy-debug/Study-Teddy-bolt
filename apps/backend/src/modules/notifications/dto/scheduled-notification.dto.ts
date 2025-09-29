import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsDateString,
  IsObject,
  IsBoolean,
  IsNumber,
  ValidateNested,
  ArrayNotEmpty,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from '../types/notification.types';

export enum RecurringInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class RecurringConfigDto {
  @ApiProperty({
    description: 'Recurrence interval',
    enum: RecurringInterval,
    example: RecurringInterval.WEEKLY,
  })
  @IsEnum(RecurringInterval)
  interval: RecurringInterval;

  @ApiPropertyOptional({
    description: 'Days of the week (0-6, Sunday = 0) for weekly recurrence',
    type: [Number],
    example: [1, 3, 5], // Monday, Wednesday, Friday
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Day of the month (1-31) for monthly recurrence',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'End date for recurrence',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of occurrences',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOccurrences?: number;
}

export class CreateScheduledNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'Weekly Study Reminder',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Time for your weekly study session!',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.REMINDER,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification category',
    enum: NotificationCategory,
    example: NotificationCategory.STUDY,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM,
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Delivery channels',
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiProperty({
    description: 'Scheduled delivery time',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({
    description: 'Timezone for scheduling',
    example: 'America/New_York',
  })
  @IsString()
  timezone: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: {
      actionUrl: '/study-sessions',
      actionText: 'Start Studying',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Template ID to use for this notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Recurring configuration',
    type: RecurringConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringConfigDto)
  recurring?: RecurringConfigDto;

  @ApiPropertyOptional({
    description: 'Whether this scheduled notification is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateScheduledNotificationDto {
  @ApiPropertyOptional({
    description: 'Notification title',
    example: 'Updated Study Reminder',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Notification message',
    example: 'Updated: Time for your study session!',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Notification category',
    enum: NotificationCategory,
  })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Delivery channels',
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Scheduled delivery time',
    example: '2024-01-15T11:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Timezone for scheduling',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Template ID to use for this notification',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Recurring configuration',
    type: RecurringConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringConfigDto)
  recurring?: RecurringConfigDto;

  @ApiPropertyOptional({
    description: 'Whether this scheduled notification is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
