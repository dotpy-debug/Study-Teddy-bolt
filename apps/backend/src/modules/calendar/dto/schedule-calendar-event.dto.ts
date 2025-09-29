import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EventType {
  TASK = 'task',
  FOCUS_SESSION = 'focus_session',
  DEADLINE = 'deadline',
  STUDY_BLOCK = 'study_block',
}

export class ScheduleCalendarEventDto {
  @ApiProperty({
    description: 'Type of event to schedule',
    enum: EventType,
  })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiPropertyOptional({
    description: 'Task ID to schedule',
  })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({
    description: 'Focus session ID to schedule',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({
    description: 'Event title',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Event description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Event start time (ISO 8601)',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Event end time (ISO 8601)',
  })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Event location',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Event color (hex or color name)',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Send reminders',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Reminder minutes before event',
    type: [Number],
    default: [15],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  reminderMinutes?: number[];

  @ApiPropertyOptional({
    description: 'Attendee emails',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];

  @ApiPropertyOptional({
    description: 'Recurring event pattern (RFC 5545 RRULE)',
  })
  @IsOptional()
  @IsString()
  recurrence?: string;

  @ApiPropertyOptional({
    description: 'Mark as busy/free time',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showAsBusy?: boolean;

  @ApiPropertyOptional({
    description: 'Add video conferencing link',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  addConferencing?: boolean;
}
