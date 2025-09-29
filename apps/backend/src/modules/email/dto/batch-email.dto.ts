import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SendEmailDto, EmailPriority } from './send-email.dto';

export class BatchEmailRecipientDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsString()
  to: string;

  @ApiPropertyOptional({
    description: 'Personalized subject for this recipient',
    example: 'Hello John, Important Study Reminder',
  })
  @IsOptional()
  @IsString()
  @MaxLength(998)
  subject?: string;

  @ApiPropertyOptional({
    description: 'Personalized template context for this recipient',
    example: { name: 'John Doe', score: 95 },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Recipient-specific tags',
    example: ['vip-customer', 'premium-user'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BatchEmailDto {
  @ApiProperty({
    description: 'List of email recipients with personalized content',
    type: [BatchEmailRecipientDto],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipient is required' })
  @ArrayMaxSize(1000, { message: 'Maximum 1000 recipients allowed per batch' })
  @ValidateNested({ each: true })
  @Type(() => BatchEmailRecipientDto)
  recipients: BatchEmailRecipientDto[];

  @ApiProperty({
    description: 'Default email subject (can be overridden per recipient)',
    example: 'Weekly Study Progress Report',
  })
  @IsString()
  @MaxLength(998)
  subject: string;

  @ApiPropertyOptional({
    description: 'Plain text email content',
    example: 'Hello {{name}}, here is your weekly progress report.',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'HTML email content',
    example: '<h1>Hello {{name}}</h1><p>Your weekly progress...</p>',
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    description: 'Email template name to use',
    example: 'weekly-progress',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @ApiPropertyOptional({
    description: 'Default template context (merged with recipient context)',
    example: { companyName: 'Study Teddy', year: 2024 },
  })
  @IsOptional()
  @IsObject()
  defaultContext?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Email priority',
    enum: EmailPriority,
    example: EmailPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiPropertyOptional({
    description: 'Track email opens for all recipients',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trackOpens?: boolean;

  @ApiPropertyOptional({
    description: 'Track email clicks for all recipients',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trackClicks?: boolean;

  @ApiPropertyOptional({
    description: 'Batch processing delay between emails (in milliseconds)',
    example: 1000,
    minimum: 0,
    maximum: 60000,
  })
  @IsOptional()
  @IsString()
  batchDelay?: number;

  @ApiPropertyOptional({
    description: 'Custom tags for the entire batch',
    example: ['weekly-digest', 'automated'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  batchTags?: string[];

  @ApiPropertyOptional({
    description: 'Send time optimization (best time for recipient timezone)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  optimizeSendTime?: boolean;
}
