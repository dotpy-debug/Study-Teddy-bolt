import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsObject,
  ArrayNotEmpty,
} from 'class-validator';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from '../types/notification.types';

export class CreateNotificationTemplateDto {
  @ApiProperty({
    description: 'Template name (must be unique)',
    example: 'task-due-reminder',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template title (supports variables with {{variableName}})',
    example: 'Task Due: {{taskName}}',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Template message (supports variables with {{variableName}})',
    example: 'Your task "{{taskName}}" is due on {{dueDate}}. Don\'t forget to complete it!',
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
    description: 'Default priority',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH,
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Default delivery channels',
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Default metadata',
    example: {
      icon: 'task',
      actionText: 'View Task',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'List of available variables for this template',
    type: [String],
    example: ['taskName', 'dueDate', 'userName'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Whether this template is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional({
    description: 'Template name (must be unique)',
    example: 'task-due-reminder-v2',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Template title (supports variables with {{variableName}})',
    example: 'Urgent: Task Due Soon - {{taskName}}',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Template message (supports variables with {{variableName}})',
    example:
      'Hi {{userName}}, your task "{{taskName}}" is due on {{dueDate}}. Please complete it soon!',
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
    description: 'Default priority',
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Default delivery channels',
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Default metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'List of available variables for this template',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Whether this template is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
