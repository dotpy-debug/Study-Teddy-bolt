import {
  IsDateString,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SendEmailDto, EmailPriority } from './send-email.dto';

export enum ScheduleType {
  ONCE = 'once',
  RECURRING = 'recurring',
}

export enum RecurrencePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export class RecurrenceConfigDto {
  @ApiProperty({
    description: 'Recurrence pattern',
    enum: RecurrencePattern,
    example: RecurrencePattern.WEEKLY,
  })
  @IsEnum(RecurrencePattern)
  pattern: RecurrencePattern;

  @ApiPropertyOptional({
    description: 'Interval between recurrences (e.g., every 2 weeks)',
    example: 1,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Days of the week for weekly recurrence',
    enum: DayOfWeek,
    isArray: true,
    example: [DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  daysOfWeek?: DayOfWeek[];

  @ApiPropertyOptional({
    description: 'Day of the month for monthly recurrence (1-31)',
    example: 15,
    minimum: 1,
    maximum: 31,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'End date for recurrence (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of occurrences',
    example: 10,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxOccurrences?: number;
}

export class ScheduleEmailDto {
  @ApiProperty({
    description: 'Scheduled send time (ISO 8601 format)',
    example: '2024-01-15T09:00:00Z',
  })
  @IsDateString()
  @Transform(({ value }) => {
    const date = new Date(value);
    const now = new Date();
    if (date <= now) {
      throw new Error('Scheduled time must be in the future');
    }
    return value;
  })
  scheduledAt: string;

  @ApiProperty({
    description: 'Type of schedule',
    enum: ScheduleType,
    example: ScheduleType.ONCE,
  })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

  @ApiPropertyOptional({
    description: 'Recurrence configuration (required for recurring emails)',
    type: RecurrenceConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceConfigDto)
  recurrence?: RecurrenceConfigDto;

  @ApiProperty({
    description: 'Email content and settings',
    type: SendEmailDto,
  })
  @ValidateNested()
  @Type(() => SendEmailDto)
  email: SendEmailDto;

  @ApiPropertyOptional({
    description: 'Schedule name/description',
    example: 'Weekly study reminder for premium users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Timezone for scheduling (IANA timezone)',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Auto-cancel if recipient unsubscribes',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cancelOnUnsubscribe?: boolean;

  @ApiPropertyOptional({
    description: 'Skip send if recipient has unread emails',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipIfUnread?: boolean;

  @ApiPropertyOptional({
    description: 'Custom metadata for the scheduled email',
    example: { campaign: 'onboarding', version: 'v2' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Priority override for scheduled emails',
    enum: EmailPriority,
    example: EmailPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;
}
