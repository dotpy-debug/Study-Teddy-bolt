import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
  IsBoolean,
  IsNumber,
  ArrayMinSize,
  ValidateNested,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class EmailAttachmentDto {
  @ApiProperty({
    description: 'Attachment filename',
    example: 'document.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({
    description: 'Attachment content (base64 encoded)',
    example:
      'JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMK',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Content type of the attachment',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class SendEmailDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  to: string;

  @ApiPropertyOptional({
    description: 'CC email addresses',
    example: ['cc1@example.com', 'cc2@example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true, message: 'All CC addresses must be valid emails' })
  @Transform(({ value }) =>
    value?.map((email: string) => email.toLowerCase().trim()),
  )
  cc?: string[];

  @ApiPropertyOptional({
    description: 'BCC email addresses',
    example: ['bcc1@example.com', 'bcc2@example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsEmail(
    {},
    { each: true, message: 'All BCC addresses must be valid emails' },
  )
  @Transform(({ value }) =>
    value?.map((email: string) => email.toLowerCase().trim()),
  )
  bcc?: string[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Important Study Reminder',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(998) // RFC 5322 limit
  subject: string;

  @ApiPropertyOptional({
    description: 'Plain text email content',
    example: 'This is a plain text email message.',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'HTML email content',
    example: '<h1>Hello</h1><p>This is an HTML email.</p>',
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    description: 'Email template name to use',
    example: 'welcome-email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @ApiPropertyOptional({
    description: 'Template context variables',
    example: {
      name: 'John Doe',
      verificationLink: 'https://example.com/verify',
    },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Email priority',
    enum: EmailPriority,
    example: EmailPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiPropertyOptional({
    description: 'Email attachments',
    type: [EmailAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  attachments?: EmailAttachmentDto[];

  @ApiPropertyOptional({
    description: 'Custom email headers',
    example: { 'X-Custom-Header': 'custom-value' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Track email opens',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trackOpens?: boolean;

  @ApiPropertyOptional({
    description: 'Track email clicks',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trackClicks?: boolean;

  @ApiPropertyOptional({
    description: 'Reply-to email address',
    example: 'noreply@example.com',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  replyTo?: string;

  @ApiPropertyOptional({
    description: 'Email tags for categorization',
    example: ['notification', 'reminder'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
