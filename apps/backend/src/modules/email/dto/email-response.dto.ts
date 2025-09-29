import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsDateString,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export enum EmailStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SCHEDULED = 'scheduled',
}

export enum EmailEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  UNSUBSCRIBED = 'unsubscribed',
  FAILED = 'failed',
}

export class EmailStatusResponseDto {
  @ApiProperty({
    description: 'Unique email identifier',
    example: 'email_123456789',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Current email status',
    enum: EmailStatus,
    example: EmailStatus.DELIVERED,
  })
  @IsEnum(EmailStatus)
  status: EmailStatus;

  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsString()
  to: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Welcome to Study Teddy',
  })
  @IsString()
  subject: string;

  @ApiPropertyOptional({
    description: 'Template used for this email',
    example: 'welcome-email',
  })
  @IsString()
  template?: string;

  @ApiProperty({
    description: 'Email creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Email sent timestamp',
    example: '2024-01-15T10:30:05Z',
  })
  @IsDateString()
  sentAt?: string;

  @ApiPropertyOptional({
    description: 'Email delivered timestamp',
    example: '2024-01-15T10:30:10Z',
  })
  @IsDateString()
  deliveredAt?: string;

  @ApiPropertyOptional({
    description: 'Email opened timestamp',
    example: '2024-01-15T11:15:30Z',
  })
  @IsDateString()
  openedAt?: string;

  @ApiPropertyOptional({
    description: 'First click timestamp',
    example: '2024-01-15T11:16:45Z',
  })
  @IsDateString()
  clickedAt?: string;

  @ApiPropertyOptional({
    description: 'Number of times email was opened',
    example: 3,
  })
  @IsNumber()
  openCount?: number;

  @ApiPropertyOptional({
    description: 'Number of clicks in email',
    example: 2,
  })
  @IsNumber()
  clickCount?: number;

  @ApiPropertyOptional({
    description: 'Error message if email failed',
    example: 'Invalid email address',
  })
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { campaign: 'onboarding', version: 'v2' },
  })
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Email tags',
    example: ['welcome', 'automated'],
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class SendEmailResponseDto {
  @ApiProperty({
    description: 'Unique email identifier',
    example: 'email_123456789',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Initial email status',
    enum: EmailStatus,
    example: EmailStatus.QUEUED,
  })
  @IsEnum(EmailStatus)
  status: EmailStatus;

  @ApiProperty({
    description: 'Success message',
    example: 'Email queued successfully',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Scheduled send time (for scheduled emails)',
    example: '2024-01-15T09:00:00Z',
  })
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery time',
    example: '2024-01-15T10:30:05Z',
  })
  @IsDateString()
  estimatedDelivery?: string;
}

export class BatchEmailResponseDto {
  @ApiProperty({
    description: 'Batch identifier',
    example: 'batch_123456789',
  })
  @IsString()
  batchId: string;

  @ApiProperty({
    description: 'Total number of emails in batch',
    example: 150,
  })
  @IsNumber()
  totalEmails: number;

  @ApiProperty({
    description: 'Number of emails queued successfully',
    example: 148,
  })
  @IsNumber()
  queued: number;

  @ApiProperty({
    description: 'Number of emails that failed to queue',
    example: 2,
  })
  @IsNumber()
  failed: number;

  @ApiPropertyOptional({
    description: 'Failed email details',
    example: [
      { email: 'invalid@email', reason: 'Invalid email format' },
      { email: 'bounce@example.com', reason: 'Previously bounced' },
    ],
  })
  @IsArray()
  failedEmails?: Array<{ email: string; reason: string }>;

  @ApiProperty({
    description: 'Batch status',
    example: 'processing',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Estimated completion time',
    example: '2024-01-15T10:45:00Z',
  })
  @IsDateString()
  estimatedCompletion: string;
}

export class EmailTemplateResponseDto {
  @ApiProperty({
    description: 'Template identifier',
    example: 'welcome-email',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Welcome Email',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Welcome email for new users',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Template subject',
    example: 'Welcome to {{appName}}!',
  })
  @IsString()
  subject: string;

  @ApiPropertyOptional({
    description: 'Template HTML content',
    example: '<h1>Welcome {{name}}!</h1><p>Thank you for joining us.</p>',
  })
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({
    description: 'Template text content',
    example: 'Welcome {{name}}! Thank you for joining us.',
  })
  @IsString()
  textContent?: string;

  @ApiProperty({
    description: 'Required template variables',
    example: ['name', 'email', 'verificationLink'],
  })
  @IsArray()
  @IsString({ each: true })
  requiredVariables: string[];

  @ApiPropertyOptional({
    description: 'Optional template variables',
    example: ['companyName', 'supportEmail'],
  })
  @IsArray()
  @IsString({ each: true })
  optionalVariables?: string[];

  @ApiProperty({
    description: 'Template category',
    example: 'authentication',
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Whether template is active',
    example: true,
  })
  @IsBoolean()
  active: boolean;

  @ApiProperty({
    description: 'Template creation date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    description: 'Template last updated date',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  updatedAt: string;
}

export class EmailEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: EmailEventType,
    example: EmailEventType.OPENED,
  })
  @IsEnum(EmailEventType)
  type: EmailEventType;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-01-15T11:15:30Z',
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'Email identifier',
    example: 'email_123456789',
  })
  @IsString()
  emailId: string;

  @ApiProperty({
    description: 'Recipient email address',
    example: 'user@example.com',
  })
  @IsString()
  recipient: string;

  @ApiPropertyOptional({
    description: 'Additional event data',
    example: { userAgent: 'Mozilla/5.0...', ip: '192.168.1.1' },
  })
  @IsObject()
  data?: Record<string, any>;
}
