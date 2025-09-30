import { IsOptional, IsDateString, IsEnum, IsNumber, Min, Max, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum TimeRangeEnum {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum MetricEnum {
  TASKS_COMPLETED = 'tasks_completed',
  STUDY_TIME = 'study_time',
  STREAK = 'streak',
  PRODUCTIVITY = 'productivity',
}

export class DashboardStatsQueryDto {
  @ApiProperty({
    description: 'Time range for statistics',
    example: 'week',
    enum: TimeRangeEnum,
    default: 'week',
    required: false,
  })
  @IsOptional()
  @IsEnum(TimeRangeEnum, {
    message: 'Time range must be one of: day, week, month, year',
  })
  timeRange?: TimeRangeEnum;

  @ApiProperty({
    description: 'Start date for custom range (ISO format)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  startDate?: string;

  @ApiProperty({
    description: 'End date for custom range (ISO format)',
    example: '2024-12-31T23:59:59.000Z',
    required: false,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @Transform(({ value, obj }) => {
    if (value && obj.startDate && typeof value === 'string' && typeof obj.startDate === 'string') {
      const endDate = new Date(value);
      const startDate = new Date(obj.startDate);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
    }
    return value;
  })
  endDate?: string;

  @ApiProperty({
    description: 'Include detailed breakdown',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  detailed?: boolean;
}

export class StreakQueryDto {
  @ApiProperty({
    description: 'Type of streak to calculate',
    example: 'tasks_completed',
    enum: MetricEnum,
    default: 'tasks_completed',
    required: false,
  })
  @IsOptional()
  @IsEnum(MetricEnum, {
    message: 'Metric must be one of: tasks_completed, study_time, streak, productivity',
  })
  metric?: MetricEnum;

  @ApiProperty({
    description: 'Minimum threshold for streak counting',
    example: 1,
    minimum: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Threshold must be a number' })
  @Min(1, { message: 'Threshold must be at least 1' })
  @Max(100, { message: 'Threshold cannot exceed 100' })
  @Transform(({ value }) => parseInt(value, 10))
  threshold?: number;
}

export class WeeklyOverviewQueryDto {
  @ApiProperty({
    description: 'Week offset from current week (0 = current week, -1 = last week)',
    example: 0,
    minimum: -52,
    maximum: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Week offset must be a number' })
  @Min(-52, { message: 'Cannot go back more than 52 weeks' })
  @Max(0, { message: 'Cannot view future weeks' })
  @Transform(({ value }) => parseInt(value, 10))
  weekOffset?: number;

  @ApiProperty({
    description: 'Include task details in the overview',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeTasks?: boolean;

  @ApiProperty({
    description: 'Include AI chat statistics',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeAiStats?: boolean;
}

export class ActivityQueryDto {
  @ApiProperty({
    description: 'Number of days to include in activity data',
    example: 30,
    minimum: 1,
    maximum: 365,
    required: false,
    default: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Days must be a number' })
  @Min(1, { message: 'Must include at least 1 day' })
  @Max(365, { message: 'Cannot exceed 365 days' })
  @Transform(({ value }) => parseInt(value, 10))
  days?: number;

  @ApiProperty({
    description: 'Activity type to filter by',
    example: 'tasks_completed',
    enum: MetricEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(MetricEnum, {
    message: 'Activity type must be one of: tasks_completed, study_time, streak, productivity',
  })
  activityType?: MetricEnum;
}
