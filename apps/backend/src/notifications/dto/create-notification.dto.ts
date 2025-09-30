import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  Length,
  MaxLength,
  IsObject,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  REMINDER = 'reminder',
  ACHIEVEMENT = 'achievement',
  SYSTEM = 'system',
  AI_SUGGESTION = 'ai_suggestion',
}

export enum NotificationPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    example: 'system',
    enum: NotificationType,
    default: 'system',
  })
  @IsEnum(NotificationType, {
    message: 'Type must be one of: reminder, achievement, system, ai_suggestion',
  })
  @Transform(({ value }) => value || NotificationType.SYSTEM)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Task Completed',
    minLength: 1,
    maxLength: 255,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @Length(1, 255, { message: 'Title must be between 1 and 255 characters' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'You have successfully completed your task',
    minLength: 1,
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message is required' })
  @Transform(({ value }) => value?.trim())
  message: string;

  @ApiProperty({
    description: 'Notification priority',
    example: 'medium',
    enum: NotificationPriority,
    default: 'medium',
  })
  @IsEnum(NotificationPriority, {
    message: 'Priority must be one of: urgent, high, medium, low',
  })
  @Transform(({ value }) => value || NotificationPriority.MEDIUM)
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Notification channel',
    example: 'in_app',
    enum: NotificationChannel,
    default: 'in_app',
  })
  @IsEnum(NotificationChannel, {
    message: 'Channel must be one of: in_app, email, push',
  })
  @Transform(({ value }) => value || NotificationChannel.IN_APP)
  channel: NotificationChannel;

  @ApiProperty({
    description: 'Action URL for notification',
    example: '/tasks/123',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Action URL must be a string' })
  @MaxLength(500, { message: 'Action URL must not exceed 500 characters' })
  @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
  actionUrl?: string;

  @ApiProperty({
    description: 'Action button label',
    example: 'View Task',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Action label must be a string' })
  @MaxLength(100, { message: 'Action label must not exceed 100 characters' })
  @ValidateIf((o, v) => v !== null && v !== undefined && v !== '')
  @Transform(({ value }) => value?.trim())
  actionLabel?: string;

  @ApiProperty({
    description: 'Additional metadata for the notification',
    example: { taskId: '123', category: 'homework' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Metadata must be an object' })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Notification expiry date in ISO format',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Expires at must be a valid ISO date string' })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @Transform(({ value }) => {
    if (value && typeof value === 'string') {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error('Expiry date must be in the future');
      }
      return value;
    }
    return value;
  })
  expiresAt?: string;
}
