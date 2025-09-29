import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationPriority,
} from './create-notification.dto';

export class QueryNotificationsDto {
  @ApiProperty({
    description: 'Filter by read status',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Read filter must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  read?: boolean;

  @ApiProperty({
    description: 'Filter by notification type',
    example: 'info',
    enum: NotificationType,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationType, {
    message: 'Type must be one of: success, error, warning, info',
  })
  type?: string;

  @ApiProperty({
    description: 'Filter by priority',
    example: 'high',
    enum: NotificationPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationPriority, {
    message: 'Priority must be one of: urgent, high, medium, low',
  })
  priority?: string;

  @ApiProperty({
    description: 'Limit number of results',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => value || 50)
  limit?: number;

  @ApiProperty({
    description: 'Offset for pagination',
    example: 0,
    minimum: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Offset must be a number' })
  @Min(0, { message: 'Offset cannot be negative' })
  @Transform(({ value }) => value || 0)
  offset?: number;
}
