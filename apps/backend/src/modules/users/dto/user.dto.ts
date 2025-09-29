import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  Length,
  MaxLength,
  Matches,
  IsUrl,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsStrongPassword,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Sanitize } from '../../../common/transforms/sanitize.transform';
import { ApiProperty } from '@nestjs/swagger';

export enum AuthProviderEnum {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum NotificationPreferenceEnum {
  ALL = 'all',
  IMPORTANT_ONLY = 'important_only',
  NONE = 'none',
}

export enum ThemePreferenceEnum {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(2, 100, { message: 'Name must be between 2 and 100 characters' })
  @Matches(/^[a-zA-Z\s\-']+$/, {
    message: 'Name can only contain letters, spaces, hyphens and apostrophes',
  })
  @Sanitize
  name?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false,
    format: 'email',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(254, { message: 'Email must not exceed 254 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiProperty({
    description: 'Profile avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  @MaxLength(2048, { message: 'Avatar URL too long' })
  @Matches(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i, {
    message: 'Avatar URL must point to an image file',
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'User bio or description',
    example: 'Computer Science student passionate about learning',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  @Sanitize
  bio?: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'America/New_York',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  @Matches(/^[a-zA-Z_]+\/[a-zA-Z_]+$/, { message: 'Invalid timezone format' })
  timezone?: string;
}

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description: 'Email notification preferences',
    example: 'important_only',
    enum: NotificationPreferenceEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationPreferenceEnum, {
    message:
      'Notification preference must be one of: all, important_only, none',
  })
  emailNotifications?: NotificationPreferenceEnum;

  @ApiProperty({
    description: 'Push notification preferences',
    example: 'all',
    enum: NotificationPreferenceEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(NotificationPreferenceEnum, {
    message:
      'Push notification preference must be one of: all, important_only, none',
  })
  pushNotifications?: NotificationPreferenceEnum;

  @ApiProperty({
    description: 'Theme preference',
    example: 'dark',
    enum: ThemePreferenceEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(ThemePreferenceEnum, {
    message: 'Theme preference must be one of: light, dark, system',
  })
  theme?: ThemePreferenceEnum;

  @ApiProperty({
    description: 'Enable study reminders',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Study reminders must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  studyReminders?: boolean;

  @ApiProperty({
    description: 'Default study session duration in minutes',
    example: 25,
    required: false,
    minimum: 5,
    maximum: 180,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Matches(/^\d+$/, { message: 'Study session duration must be a number' })
  defaultStudyDuration?: number;
}

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPass123!',
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  @MaxLength(128, { message: 'Password too long' })
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (minimum 8 characters, must contain uppercase, lowercase, number and special character)',
    example: 'NewSecurePass123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @Length(8, 128, { message: 'Password must be between 8 and 128 characters' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
    },
  )
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewSecurePass123!',
  })
  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmPassword: string;
}

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Current password for account deletion confirmation',
    example: 'CurrentPass123!',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required for account deletion' })
  @MaxLength(128, { message: 'Password too long' })
  password: string;

  @ApiProperty({
    description: 'Confirmation text (must be "DELETE")',
    example: 'DELETE',
  })
  @IsString({ message: 'Confirmation must be a string' })
  @IsNotEmpty({ message: 'Confirmation is required' })
  @Matches(/^DELETE$/, {
    message: 'You must type "DELETE" to confirm account deletion',
  })
  confirmation: string;
}

export class UserPrivacySettingsDto {
  @ApiProperty({
    description: 'Make profile public',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Public profile must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  publicProfile?: boolean;

  @ApiProperty({
    description: 'Show activity status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Show activity must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  showActivity?: boolean;

  @ApiProperty({
    description: 'Allow data analytics',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Analytics consent must be a boolean' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  analyticsConsent?: boolean;
}
