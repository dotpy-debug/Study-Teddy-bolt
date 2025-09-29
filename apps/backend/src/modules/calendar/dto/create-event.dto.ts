import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventAttendeeDto {
  @ApiProperty({ description: 'Attendee email address' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ description: 'Attendee display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Response status',
    enum: ['needsAction', 'declined', 'tentative', 'accepted'],
  })
  @IsOptional()
  @IsEnum(['needsAction', 'declined', 'tentative', 'accepted'])
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

export class EventReminderDto {
  @ApiProperty({
    description: 'Reminder method',
    enum: ['email', 'popup'],
  })
  @IsEnum(['email', 'popup'])
  method: 'email' | 'popup';

  @ApiProperty({ description: 'Minutes before event to remind' })
  @IsString()
  minutes: number;
}

export class EventRemindersDto {
  @ApiPropertyOptional({ description: 'Use default reminders' })
  @IsOptional()
  @IsBoolean()
  useDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Custom reminder overrides',
    type: [EventReminderDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventReminderDto)
  overrides?: EventReminderDto[];
}

export class EventTimeDto {
  @ApiProperty({ description: 'Event date-time (ISO 8601)' })
  @IsDateString()
  dateTime: string;

  @ApiPropertyOptional({ description: 'Time zone' })
  @IsOptional()
  @IsString()
  timeZone?: string;
}

export class RecurringRuleDto {
  @ApiProperty({
    description: 'Recurrence frequency',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @ApiPropertyOptional({ description: 'Interval between recurrences' })
  @IsOptional()
  interval?: number;

  @ApiPropertyOptional({ description: 'End date for recurrence (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  until?: string;

  @ApiPropertyOptional({ description: 'Number of occurrences' })
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({
    description: 'Days of the week for weekly recurrence',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  byWeekDay?: string[];

  @ApiPropertyOptional({
    description: 'Days of the month for monthly recurrence',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  byMonthDay?: number[];
}

export class ExtendedPropertiesDto {
  @ApiPropertyOptional({ description: 'Private extended properties' })
  @IsOptional()
  private?: {
    taskId?: string;
    focusSessionId?: string;
    subjectId?: string;
    createdByStudyTeddy?: string;
    [key: string]: any;
  };

  @ApiPropertyOptional({ description: 'Shared extended properties' })
  @IsOptional()
  shared?: { [key: string]: any };
}

export class CreateEventDto {
  @ApiProperty({ description: 'Event title/summary' })
  @IsString()
  summary: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Event location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Event start time',
    type: EventTimeDto,
  })
  @ValidateNested()
  @Type(() => EventTimeDto)
  start: EventTimeDto;

  @ApiProperty({
    description: 'Event end time',
    type: EventTimeDto,
  })
  @ValidateNested()
  @Type(() => EventTimeDto)
  end: EventTimeDto;

  @ApiPropertyOptional({
    description: 'Event reminders',
    type: EventRemindersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventRemindersDto)
  reminders?: EventRemindersDto;

  @ApiPropertyOptional({
    description: 'Event attendees',
    type: [EventAttendeeDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventAttendeeDto)
  attendees?: EventAttendeeDto[];

  @ApiPropertyOptional({
    description: 'Recurring event rule',
    type: RecurringRuleDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringRuleDto)
  recurringRule?: RecurringRuleDto;

  @ApiPropertyOptional({
    description: 'Event visibility',
    enum: ['default', 'public', 'private', 'confidential'],
  })
  @IsOptional()
  @IsEnum(['default', 'public', 'private', 'confidential'])
  visibility?: 'default' | 'public' | 'private' | 'confidential';

  @ApiPropertyOptional({
    description: 'Event transparency',
    enum: ['opaque', 'transparent'],
  })
  @IsOptional()
  @IsEnum(['opaque', 'transparent'])
  transparency?: 'opaque' | 'transparent';

  @ApiPropertyOptional({ description: 'Send notifications to attendees' })
  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Calendar ID (if not specified, uses Study Teddy calendar)',
  })
  @IsOptional()
  @IsString()
  calendarId?: string;

  @ApiPropertyOptional({
    description: 'Extended properties',
    type: ExtendedPropertiesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExtendedPropertiesDto)
  extendedProperties?: ExtendedPropertiesDto;

  @ApiPropertyOptional({
    description: 'Recurrence rules (RFC 5545)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recurrence?: string[];
}
