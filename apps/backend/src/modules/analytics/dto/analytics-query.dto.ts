import { IsOptional, IsDateString, IsEnum, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum MetricType {
  PRODUCTIVITY = 'productivity',
  FOCUS_TIME = 'focus_time',
  TASK_COMPLETION = 'task_completion',
  STUDY_SESSIONS = 'study_sessions',
  STREAKS = 'streaks',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Granularity of data points',
    enum: AnalyticsGranularity,
    default: AnalyticsGranularity.DAILY,
  })
  @IsOptional()
  @IsEnum(AnalyticsGranularity)
  granularity?: AnalyticsGranularity;

  @ApiPropertyOptional({
    description: 'Filter by subject ID',
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by metric type',
    enum: MetricType,
  })
  @IsOptional()
  @IsEnum(MetricType)
  metricType?: MetricType;

  @ApiPropertyOptional({
    description: 'Group results by field',
    enum: ['subject', 'priority', 'day_of_week', 'hour_of_day'],
  })
  @IsOptional()
  @IsString()
  groupBy?: string;
}
