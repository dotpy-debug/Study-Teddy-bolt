import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PredefinedRange {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  ALL_TIME = 'all_time',
}

export class TimeRangeDto {
  @ApiPropertyOptional({
    description: 'Predefined time range',
    enum: PredefinedRange,
  })
  @IsOptional()
  @IsEnum(PredefinedRange)
  range?: PredefinedRange;

  @ApiPropertyOptional({
    description: 'Custom start date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
