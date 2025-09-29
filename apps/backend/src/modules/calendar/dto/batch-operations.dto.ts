import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { UpdateEventDto } from './update-event.dto';

export class BatchCreateEventsDto {
  @ApiProperty({
    description: 'Array of events to create',
    type: [CreateEventDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventDto)
  events: CreateEventDto[];

  @ApiPropertyOptional({
    description: 'Calendar ID (if not specified, uses Study Teddy calendar)',
  })
  @IsOptional()
  @IsString()
  calendarId?: string;
}

export class BatchUpdateEventDto {
  @ApiProperty({ description: 'Event ID to update' })
  @IsString()
  eventId: string;

  @ApiProperty({
    description: 'Event update data',
    type: UpdateEventDto,
  })
  @ValidateNested()
  @Type(() => UpdateEventDto)
  event: UpdateEventDto;
}

export class BatchUpdateEventsDto {
  @ApiProperty({
    description: 'Array of event updates',
    type: [BatchUpdateEventDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateEventDto)
  updates: BatchUpdateEventDto[];

  @ApiPropertyOptional({
    description: 'Calendar ID (if not specified, uses Study Teddy calendar)',
  })
  @IsOptional()
  @IsString()
  calendarId?: string;
}

export class BatchDeleteEventsDto {
  @ApiProperty({
    description: 'Array of event IDs to delete',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  eventIds: string[];

  @ApiPropertyOptional({
    description: 'Calendar ID (if not specified, uses Study Teddy calendar)',
  })
  @IsOptional()
  @IsString()
  calendarId?: string;
}
