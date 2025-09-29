import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleSessionDto {
  @ApiProperty({
    description: 'Task ID to create a study session for',
    example: 'uuid-here',
  })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({
    description: 'Start time for the study session (ISO 8601)',
    example: '2025-01-15T14:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'End time for the study session (ISO 8601)',
    example: '2025-01-15T15:30:00Z',
  })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Title for the calendar event (defaults to task title)',
    example: 'Study Math - Chapter 5',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description for the calendar event',
    example: 'Review trigonometry concepts and practice problems',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Send email reminders',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Reminder minutes before event (default: 15)',
    default: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reminderMinutes?: number;

  @ApiPropertyOptional({
    description: 'Location for the study session',
    example: 'Library Room 203',
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateScheduledSessionDto {
  @ApiProperty({
    description: 'Calendar event ID to update',
    example: 'event-id-here',
  })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({
    description: 'New start time (ISO 8601)',
    example: '2025-01-15T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'New end time (ISO 8601)',
    example: '2025-01-15T15:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'New title for the event',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'New description for the event',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'New location',
  })
  @IsOptional()
  @IsString()
  location?: string;
}

export class DeleteScheduledSessionDto {
  @ApiProperty({
    description: 'Calendar event ID to delete',
    example: 'event-id-here',
  })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({
    description: 'Send cancellation notification',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sendCancellation?: boolean;
}

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Start time of the time range to check (ISO 8601)',
    example: '2025-01-15T09:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'End time of the time range to check (ISO 8601)',
    example: '2025-01-15T18:00:00Z',
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Duration needed in minutes',
    example: 90,
  })
  @IsNumber()
  @Min(15)
  durationMinutes: number;

  @ApiPropertyOptional({
    description: 'Minimum break time between sessions in minutes',
    default: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  breakMinutes?: number;
}

export class BusyTimeSlot {
  @ApiProperty()
  start: string;

  @ApiProperty()
  end: string;

  @ApiPropertyOptional()
  eventTitle?: string;

  @ApiPropertyOptional()
  calendarName?: string;
}

export class AvailableTimeSlot {
  @ApiProperty()
  start: string;

  @ApiProperty()
  end: string;

  @ApiProperty()
  durationMinutes: number;
}

export class AvailabilityResponseDto {
  @ApiProperty({ type: [BusyTimeSlot] })
  busySlots: BusyTimeSlot[];

  @ApiProperty({ type: [AvailableTimeSlot] })
  availableSlots: AvailableTimeSlot[];

  @ApiPropertyOptional({
    description: 'Next available slot that fits the requested duration',
  })
  nextAvailableSlot?: AvailableTimeSlot;
}

export class CalendarEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  taskId?: string;

  @ApiPropertyOptional()
  focusSessionId?: string;

  @ApiProperty()
  calendarId: string;

  @ApiProperty()
  htmlLink: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
