import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsDateString,
  IsObject,
  ValidateNested,
  ArrayNotEmpty,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from '../types/notification.types';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'Task Due Soon',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your assignment "Mathematics Chapter 5" is due in 2 hours.',
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
    example: NotificationCategory.TASK,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH,
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Delivery channels',
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: {
      actionUrl: '/tasks/123',
      actionText: 'View Task',
      icon: 'task',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Schedule delivery for a specific time',
    example: '2024-01-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Notification expiration time',
    example: '2024-01-20T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Template ID to use for this notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Variables to substitute in template',
    example: {
      userName: 'John Doe',
      taskName: 'Mathematics Assignment',
    },
  })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;
}
