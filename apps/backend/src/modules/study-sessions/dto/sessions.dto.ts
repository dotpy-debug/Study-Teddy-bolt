import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SessionType {
  POMODORO = 'pomodoro',
  FREE = 'free',
  GOAL_BASED = 'goal_based',
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export class CreateSessionDto {
  @ApiPropertyOptional({ description: 'Session title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    enum: SessionType,
    description: 'Type of study session',
    default: SessionType.FREE,
  })
  @IsEnum(SessionType)
  type: SessionType = SessionType.FREE;

  @ApiPropertyOptional({ description: 'Subject ID for the session' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Session goals', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ description: 'Session notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Planned duration in minutes for goal-based sessions',
    minimum: 1,
    maximum: 480,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  plannedDuration?: number;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Session title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Session notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Session goals', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({
    description: 'Focus score (0.00 to 1.00)',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  focusScore?: number;

  @ApiPropertyOptional({
    description: 'Number of distractions during session',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  distractions?: number;

  @ApiPropertyOptional({
    description: 'Number of breaks taken',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  breaksTaken?: number;

  @ApiPropertyOptional({
    description: 'Number of pomodoros completed',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  pomodorosCompleted?: number;
}

export class SessionQueryDto {
  @ApiPropertyOptional({ description: 'Limit number of results', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    enum: SessionType,
    description: 'Filter by session type',
  })
  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType;

  @ApiPropertyOptional({
    enum: SessionStatus,
    description: 'Filter by session status',
  })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Filter by subject ID' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Filter sessions from this date (ISO string)',
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter sessions to this date (ISO string)',
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;
}

export class SessionStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Period for stats',
    enum: ['today', 'week', 'month', 'custom'],
    default: 'week',
  })
  @IsOptional()
  @IsEnum(['today', 'week', 'month', 'custom'])
  period?: 'today' | 'week' | 'month' | 'custom' = 'week';

  @ApiPropertyOptional({
    description: 'Start date for custom period (ISO string)',
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for custom period (ISO string)',
    type: String,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @ApiPropertyOptional({ description: 'Filter by subject ID' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class PomodoroSettingsDto {
  @ApiProperty({
    description: 'Work duration in minutes',
    default: 25,
    minimum: 15,
    maximum: 60,
  })
  @IsInt()
  @Min(15)
  @Max(60)
  workDuration: number = 25;

  @ApiProperty({
    description: 'Short break duration in minutes',
    default: 5,
    minimum: 3,
    maximum: 15,
  })
  @IsInt()
  @Min(3)
  @Max(15)
  shortBreakDuration: number = 5;

  @ApiProperty({
    description: 'Long break duration in minutes',
    default: 15,
    minimum: 15,
    maximum: 30,
  })
  @IsInt()
  @Min(15)
  @Max(30)
  longBreakDuration: number = 15;

  @ApiProperty({
    description: 'Number of work sessions before long break',
    default: 4,
    minimum: 2,
    maximum: 8,
  })
  @IsInt()
  @Min(2)
  @Max(8)
  longBreakInterval: number = 4;

  @ApiPropertyOptional({
    description: 'Auto-start breaks',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoStartBreaks?: boolean = false;

  @ApiPropertyOptional({
    description: 'Auto-start work sessions',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoStartWork?: boolean = false;
}

export class CreateAnalyticsDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Productivity score (0.00 to 1.00)',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  productivityScore?: number;

  @ApiPropertyOptional({
    description: 'Average focus time in seconds',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  averageFocusTime?: number;

  @ApiPropertyOptional({
    description: 'Peak focus time (HH:MM format)',
    pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString()
  peakFocusTime?: string;

  @ApiPropertyOptional({
    description: 'Break pattern data',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        time: { type: 'string' },
        duration: { type: 'number' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  breakPattern?: { time: string; duration: number }[];

  @ApiPropertyOptional({
    description: 'Key insights from the session',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyInsights?: string[];

  @ApiPropertyOptional({
    description: 'Recommendations for improvement',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];
}
