import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreferredTimesDto {
  @ApiPropertyOptional({ description: 'Preferred start hour (0-23)' })
  @IsOptional()
  @IsNumber()
  startHour?: number;

  @ApiPropertyOptional({ description: 'Preferred end hour (0-23)' })
  @IsOptional()
  @IsNumber()
  endHour?: number;

  @ApiPropertyOptional({
    description: 'Preferred days of week (0=Sunday, 1=Monday, ...)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];
}

export class FindFreeSlotDto {
  @ApiProperty({
    description: 'Start searching from this date-time (ISO 8601)',
  })
  @IsDateString()
  startSearchFrom: string;

  @ApiProperty({ description: 'End search at this date-time (ISO 8601)' })
  @IsDateString()
  endSearchAt: string;

  @ApiProperty({ description: 'Required duration in minutes' })
  @IsNumber()
  durationMinutes: number;

  @ApiPropertyOptional({ description: 'Break time after event in minutes' })
  @IsOptional()
  @IsNumber()
  breakMinutes?: number;

  @ApiPropertyOptional({
    description: 'Preferred time constraints',
    type: PreferredTimesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferredTimesDto)
  preferredTimes?: PreferredTimesDto;

  @ApiPropertyOptional({ description: 'Maximum number of days to search' })
  @IsOptional()
  @IsNumber()
  maxSearchDays?: number;
}
