import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
  IsEmail,
  IsTimeZone,
  IsIn,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmailFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NEVER = 'never',
}

export enum EmailFormat {
  HTML = 'html',
  TEXT = 'text',
  BOTH = 'both',
}

export enum QuietHoursDay {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export class QuietHoursDto {
  @ApiProperty({
    description: 'Start time of quiet hours (24-hour format)',
    example: '22:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  startTime: string;

  @ApiProperty({
    description: 'End time of quiet hours (24-hour format)',
    example: '08:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  endTime: string;

  @ApiPropertyOptional({
    description: 'Days of the week when quiet hours apply',
    enum: QuietHoursDay,
    isArray: true,
    example: [QuietHoursDay.SATURDAY, QuietHoursDay.SUNDAY],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(QuietHoursDay, { each: true })
  days?: QuietHoursDay[];

  @ApiPropertyOptional({
    description: 'Whether quiet hours are enabled',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class EmailCategoryPreferencesDto {
  @ApiPropertyOptional({
    description: 'Study reminders and notifications',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  studyReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Task and assignment notifications',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  taskNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Achievement and progress updates',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  achievements?: boolean;

  @ApiPropertyOptional({
    description: 'Weekly progress reports',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  weeklyReports?: boolean;

  @ApiPropertyOptional({
    description: 'System updates and announcements',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;

  @ApiPropertyOptional({
    description: 'Marketing and promotional emails',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @ApiPropertyOptional({
    description: 'Security and account notifications',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  security?: boolean;
}

export class UpdateEmailPreferencesDto {
  @ApiPropertyOptional({
    description: 'Whether to receive emails at all',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred email format',
    enum: EmailFormat,
    example: EmailFormat.HTML,
  })
  @IsOptional()
  @IsEnum(EmailFormat)
  emailFormat?: EmailFormat;

  @ApiPropertyOptional({
    description: 'General email frequency preference',
    enum: EmailFrequency,
    example: EmailFrequency.DAILY,
  })
  @IsOptional()
  @IsEnum(EmailFrequency)
  frequency?: EmailFrequency;

  @ApiPropertyOptional({
    description: 'User timezone for scheduling emails',
    example: 'America/New_York',
  })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Preferred language for emails',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
  language?: string;

  @ApiPropertyOptional({
    description: 'Quiet hours configuration',
    type: QuietHoursDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;

  @ApiPropertyOptional({
    description: 'Category-specific email preferences',
    type: EmailCategoryPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailCategoryPreferencesDto)
  categories?: EmailCategoryPreferencesDto;

  @ApiPropertyOptional({
    description: 'Alternative email addresses for specific notifications',
    example: ['work@example.com', 'personal@example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @Transform(({ value }) =>
    value?.map((email: string) => email.toLowerCase().trim()),
  )
  alternativeEmails?: string[];

  @ApiPropertyOptional({
    description: 'Custom email signature',
    example: 'Best regards,\nJohn Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signature?: string;

  @ApiPropertyOptional({
    description: 'Enable digest mode (consolidate multiple emails)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  digestMode?: boolean;

  @ApiPropertyOptional({
    description: 'Digest frequency when digest mode is enabled',
    enum: EmailFrequency,
    example: EmailFrequency.DAILY,
  })
  @IsOptional()
  @IsEnum(EmailFrequency)
  digestFrequency?: EmailFrequency;

  @ApiPropertyOptional({
    description: 'Additional metadata for preferences',
    example: { source: 'mobile_app', version: '2.1.0' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
