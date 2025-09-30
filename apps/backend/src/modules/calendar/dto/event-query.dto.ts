import { IsOptional, IsDateString, IsNumber, IsBoolean, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EventQueryDto {
  @ApiPropertyOptional({ description: 'Start time filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  timeMin?: string;

  @ApiPropertyOptional({ description: 'End time filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  timeMax?: string;

  @ApiPropertyOptional({ description: 'Maximum number of results' })
  @IsOptional()
  @IsNumber()
  maxResults?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['startTime', 'updated'],
  })
  @IsOptional()
  @IsEnum(['startTime', 'updated'])
  orderBy?: 'startTime' | 'updated';

  @ApiPropertyOptional({ description: 'Include deleted events' })
  @IsOptional()
  @IsBoolean()
  showDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Expand recurring events into instances',
  })
  @IsOptional()
  @IsBoolean()
  singleEvents?: boolean;

  @ApiPropertyOptional({
    description: 'Only return events modified after this time (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  updatedMin?: string;

  @ApiPropertyOptional({ description: 'Text search query' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Calendar ID to query' })
  @IsOptional()
  @IsString()
  calendarId?: string;
}
