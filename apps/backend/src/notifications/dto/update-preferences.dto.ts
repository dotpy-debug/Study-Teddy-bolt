import {
  IsBoolean,
  IsOptional,
  IsString,
  IsEnum,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SoundVolume {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  OFF = 'off',
}

export class UpdatePreferencesDto {
  // Email preferences
  @ApiProperty({
    description: 'Enable email notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Email enabled must be a boolean' })
  emailEnabled?: boolean;

  @ApiProperty({
    description: 'Enable email task reminders',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Email task reminders must be a boolean' })
  emailTaskReminders?: boolean;

  @ApiProperty({
    description: 'Enable email achievement notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Email achievements must be a boolean' })
  emailAchievements?: boolean;

  @ApiProperty({
    description: 'Enable email system alerts',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Email system alerts must be a boolean' })
  emailSystemAlerts?: boolean;

  // Push preferences
  @ApiProperty({
    description: 'Enable push notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Push enabled must be a boolean' })
  pushEnabled?: boolean;

  @ApiProperty({
    description: 'Enable push task reminders',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Push task reminders must be a boolean' })
  pushTaskReminders?: boolean;

  @ApiProperty({
    description: 'Enable push achievement notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Push achievements must be a boolean' })
  pushAchievements?: boolean;

  @ApiProperty({
    description: 'Enable push system alerts',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Push system alerts must be a boolean' })
  pushSystemAlerts?: boolean;

  // In-app preferences
  @ApiProperty({
    description: 'Enable in-app notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'In-app enabled must be a boolean' })
  inAppEnabled?: boolean;

  @ApiProperty({
    description: 'Enable in-app task reminders',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'In-app task reminders must be a boolean' })
  inAppTaskReminders?: boolean;

  @ApiProperty({
    description: 'Enable in-app achievement notifications',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'In-app achievements must be a boolean' })
  inAppAchievements?: boolean;

  @ApiProperty({
    description: 'Enable in-app system alerts',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'In-app system alerts must be a boolean' })
  inAppSystemAlerts?: boolean;

  // Sound preferences
  @ApiProperty({
    description: 'Enable notification sounds',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Sound enabled must be a boolean' })
  soundEnabled?: boolean;

  @ApiProperty({
    description: 'Notification sound volume',
    example: 'medium',
    enum: SoundVolume,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sound volume must be a string' })
  @IsEnum(SoundVolume, {
    message: 'Sound volume must be one of: low, medium, high, off',
  })
  soundVolume?: string;

  // Quiet hours
  @ApiProperty({
    description: 'Enable quiet hours',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Quiet hours enabled must be a boolean' })
  quietHoursEnabled?: boolean;

  @ApiProperty({
    description: 'Quiet hours start time (HH:MM format)',
    example: '22:00',
    required: false,
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString({ message: 'Quiet hours start must be a string' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours start must be in HH:MM format',
  })
  @ValidateIf((o) => o.quietHoursEnabled === true)
  quietHoursStart?: string;

  @ApiProperty({
    description: 'Quiet hours end time (HH:MM format)',
    example: '07:00',
    required: false,
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString({ message: 'Quiet hours end must be a string' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Quiet hours end must be in HH:MM format',
  })
  @ValidateIf((o) => o.quietHoursEnabled === true)
  quietHoursEnd?: string;
}
