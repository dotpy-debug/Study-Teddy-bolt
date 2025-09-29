import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FocusType } from './start-focus-session.dto';

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  WEEKDAYS = 'weekdays',
  CUSTOM = 'custom',
}

export class ScheduleFocusSessionDto {
  @ApiProperty({ description: 'Task ID to focus on' })
  @IsUUID()
  taskId: string;

  @ApiPropertyOptional({ description: 'Subject ID for the session' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({ description: 'Scheduled start time (ISO 8601)' })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    minimum: 5,
    maximum: 240,
  })
  @IsNumber()
  @Min(5)
  @Max(240)
  duration: number;

  @ApiProperty({
    enum: FocusType,
    default: FocusType.POMODORO,
    description: 'Type of focus session',
  })
  @IsEnum(FocusType)
  type: FocusType;

  @ApiPropertyOptional({
    description: 'Title for the session',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Session description or goals',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Break duration in minutes for Pomodoro',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  breakDuration?: number;

  @ApiPropertyOptional({
    description: 'Recurrence pattern',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @ApiPropertyOptional({
    description: 'End date for recurring sessions (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({
    description: 'Days of week for custom recurrence (0=Sunday, 6=Saturday)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  customDays?: number[];

  @ApiPropertyOptional({
    description: 'Send reminder before session starts (minutes)',
    default: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  reminderMinutes?: number;

  @ApiPropertyOptional({
    description: 'Enable distraction blocking',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  distractionBlocking?: boolean;

  @ApiPropertyOptional({
    description: 'Auto-start session at scheduled time',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @ApiPropertyOptional({
    description: 'Calendar event ID if synced',
  })
  @IsOptional()
  @IsString()
  calendarEventId?: string;
}
