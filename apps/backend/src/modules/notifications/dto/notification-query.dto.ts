import { IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum NotificationType {
  TASK_REMINDER = 'task_reminder',
  TASK_DUE = 'task_due',
  TASK_OVERDUE = 'task_overdue',
  SESSION_REMINDER = 'session_reminder',
  SESSION_COMPLETE = 'session_complete',
  ACHIEVEMENT = 'achievement',
  STREAK = 'streak',
  SYSTEM = 'system',
  AI_SUGGESTION = 'ai_suggestion',
}

export class NotificationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by read status',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
