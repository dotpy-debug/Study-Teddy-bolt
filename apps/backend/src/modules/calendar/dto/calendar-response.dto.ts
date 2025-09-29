import { ApiProperty } from '@nestjs/swagger';
import { CalendarProvider } from './connect-calendar.dto';

export class CalendarConnectionResponseDto {
  @ApiProperty()
  connected: boolean;

  @ApiProperty({ enum: CalendarProvider, required: false })
  provider?: CalendarProvider;

  @ApiProperty({ required: false })
  calendarId?: string;

  @ApiProperty({ required: false })
  calendarName?: string;

  @ApiProperty({ required: false })
  userEmail?: string;

  @ApiProperty({ required: false })
  lastSyncedAt?: Date;

  @ApiProperty()
  twoWaySync: boolean;
}

export class CalendarEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty({ required: false })
  location?: string;

  @ApiProperty()
  isAllDay: boolean;

  @ApiProperty()
  isRecurring: boolean;

  @ApiProperty({ required: false })
  recurrence?: string;

  @ApiProperty({ type: [String] })
  attendees: string[];

  @ApiProperty({ required: false })
  taskId?: string;

  @ApiProperty({ required: false })
  sessionId?: string;

  @ApiProperty()
  source: 'studyteddy' | 'external';

  @ApiProperty({ required: false })
  externalId?: string;

  @ApiProperty({ required: false })
  color?: string;

  @ApiProperty()
  reminders: number[];
}

export class CalendarAvailabilityDto {
  @ApiProperty()
  date: string;

  @ApiProperty({
    type: () => TimeSlotDto,
    isArray: true,
  })
  availableSlots: TimeSlotDto[];

  @ApiProperty({
    type: () => TimeSlotDto,
    isArray: true,
  })
  busySlots: TimeSlotDto[];

  @ApiProperty()
  totalAvailableMinutes: number;
}

export class TimeSlotDto {
  @ApiProperty()
  start: string;

  @ApiProperty()
  end: string;

  @ApiProperty()
  duration: number;

  @ApiProperty({ required: false })
  title?: string;
}

export class OptimalTimeSlotDto {
  @ApiProperty()
  recommended: TimeSlotDto;

  @ApiProperty({
    type: () => TimeSlotDto,
    isArray: true,
  })
  alternatives: TimeSlotDto[];

  @ApiProperty()
  score: number;

  @ApiProperty({
    description: 'Reasons for recommendation',
    type: [String],
  })
  reasons: string[];
}
