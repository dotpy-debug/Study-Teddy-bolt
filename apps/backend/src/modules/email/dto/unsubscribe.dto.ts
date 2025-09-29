import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsEmail,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UnsubscribeType {
  ALL = 'all',
  CATEGORY = 'category',
  SPECIFIC = 'specific',
}

export enum UnsubscribeReason {
  TOO_FREQUENT = 'too_frequent',
  NOT_RELEVANT = 'not_relevant',
  NEVER_SIGNED_UP = 'never_signed_up',
  TEMPORARY = 'temporary',
  OTHER = 'other',
}

export class HandleUnsubscribeDto {
  @ApiProperty({
    description: 'Unsubscribe token or email ID',
    example: 'unsubscribe_token_123456789',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'Email address to unsubscribe',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiProperty({
    description: 'Type of unsubscribe',
    enum: UnsubscribeType,
    example: UnsubscribeType.CATEGORY,
  })
  @IsEnum(UnsubscribeType)
  type: UnsubscribeType;

  @ApiPropertyOptional({
    description: 'Specific email categories to unsubscribe from',
    example: ['marketing', 'newsletters'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Reason for unsubscribing',
    enum: UnsubscribeReason,
    example: UnsubscribeReason.TOO_FREQUENT,
  })
  @IsOptional()
  @IsEnum(UnsubscribeReason)
  reason?: UnsubscribeReason;

  @ApiPropertyOptional({
    description: 'Additional feedback from user',
    example: 'I receive too many emails per day',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @ApiPropertyOptional({
    description: 'Whether to keep security and account notifications',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  keepSecurity?: boolean;

  @ApiPropertyOptional({
    description: 'Alternative email frequency preference',
    example: 'weekly',
  })
  @IsOptional()
  @IsString()
  alternativeFrequency?: string;

  @ApiPropertyOptional({
    description: 'User ID for authenticated unsubscribe',
    example: 'user_123456789',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class GenerateUnsubscribeLinkDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({
    description: 'Specific email categories',
    example: ['marketing', 'newsletters'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Email campaign or template ID',
    example: 'welcome-series-email-3',
  })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Additional context for unsubscribe tracking',
    example: { source: 'email_footer', template: 'weekly_digest' },
  })
  @IsOptional()
  context?: Record<string, any>;
}

export class UnsubscribeResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Successfully unsubscribed from marketing emails',
  })
  message: string;

  @ApiProperty({
    description: 'Unsubscribe type that was processed',
    enum: UnsubscribeType,
    example: UnsubscribeType.CATEGORY,
  })
  type: UnsubscribeType;

  @ApiPropertyOptional({
    description: 'Categories that were unsubscribed',
    example: ['marketing', 'newsletters'],
  })
  categories?: string[];

  @ApiProperty({
    description: 'Whether user is still subscribed to any emails',
    example: true,
  })
  stillSubscribed: boolean;

  @ApiPropertyOptional({
    description: 'Alternative options for the user',
    example: {
      reduceFrequency: true,
      changeToDigest: true,
      pauseTemporarily: true,
    },
  })
  alternatives?: {
    reduceFrequency?: boolean;
    changeToDigest?: boolean;
    pauseTemporarily?: boolean;
  };

  @ApiProperty({
    description: 'Unsubscribe processing timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  processedAt: string;
}

export class ResubscribeDto {
  @ApiProperty({
    description: 'Email address to resubscribe',
    example: 'user@example.com',
  })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({
    description: 'Specific categories to resubscribe to',
    example: ['study_reminders', 'weekly_reports'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Resubscribe to all previously subscribed categories',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  resubscribeAll?: boolean;

  @ApiPropertyOptional({
    description: 'User ID for authenticated resubscribe',
    example: 'user_123456789',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
