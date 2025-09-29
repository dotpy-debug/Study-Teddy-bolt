import {
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportCalendarEventsDto {
  @ApiProperty({
    description: 'Start date for import (ISO 8601)',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for import (ISO 8601)',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Keywords to filter events for import',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'Auto-detect subject from event title',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoDetectSubject?: boolean;

  @ApiPropertyOptional({
    description: 'Import as tasks (true) or focus sessions (false)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  importAsTasks?: boolean;

  @ApiPropertyOptional({
    description: 'Set default priority for imported tasks',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  @IsOptional()
  @IsString()
  defaultPriority?: string;

  @ApiPropertyOptional({
    description: 'Skip events shorter than X minutes',
    default: 15,
  })
  @IsOptional()
  minDuration?: number;

  @ApiPropertyOptional({
    description: 'Exclude all-day events',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  excludeAllDay?: boolean;
}
