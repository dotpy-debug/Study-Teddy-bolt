import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsObject,
  IsEmail,
  IsUrl,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WebhookEventType {
  EMAIL_SENT = 'email.sent',
  EMAIL_DELIVERED = 'email.delivered',
  EMAIL_OPENED = 'email.opened',
  EMAIL_CLICKED = 'email.clicked',
  EMAIL_BOUNCED = 'email.bounced',
  EMAIL_COMPLAINED = 'email.complained',
  EMAIL_UNSUBSCRIBED = 'email.unsubscribed',
  EMAIL_FAILED = 'email.failed',
  BATCH_COMPLETED = 'batch.completed',
  BATCH_FAILED = 'batch.failed',
}

export enum BounceType {
  HARD = 'hard',
  SOFT = 'soft',
  UNDETERMINED = 'undetermined',
}

export enum ComplaintType {
  ABUSE = 'abuse',
  FRAUD = 'fraud',
  VIRUS = 'virus',
  OTHER = 'other',
}

export class EmailClickDataDto {
  @ApiProperty({
    description: 'URL that was clicked',
    example: 'https://studyteddy.com/dashboard',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Link text or identifier',
    example: 'View Dashboard',
  })
  @IsOptional()
  @IsString()
  linkText?: string;

  @ApiPropertyOptional({
    description: 'User agent of the clicking device',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'IP address of the clicking device',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Geographic location',
    example: { country: 'US', state: 'CA', city: 'San Francisco' },
  })
  @IsOptional()
  @IsObject()
  location?: Record<string, any>;
}

export class EmailBounceDataDto {
  @ApiProperty({
    description: 'Type of bounce',
    enum: BounceType,
    example: BounceType.HARD,
  })
  @IsEnum(BounceType)
  bounceType: BounceType;

  @ApiPropertyOptional({
    description: 'Bounce sub-type',
    example: 'mailbox-full',
  })
  @IsOptional()
  @IsString()
  bounceSubType?: string;

  @ApiProperty({
    description: 'Bounce reason/message',
    example: 'Mailbox does not exist',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'SMTP response code',
    example: 550,
  })
  @IsOptional()
  @IsNumber()
  diagnosticCode?: number;

  @ApiPropertyOptional({
    description: 'Whether email should be retried',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canRetry?: boolean;
}

export class EmailComplaintDataDto {
  @ApiProperty({
    description: 'Type of complaint',
    enum: ComplaintType,
    example: ComplaintType.ABUSE,
  })
  @IsEnum(ComplaintType)
  complaintType: ComplaintType;

  @ApiPropertyOptional({
    description: 'Complaint feedback from ISP',
    example: 'User marked email as spam',
  })
  @IsOptional()
  @IsString()
  feedbackType?: string;

  @ApiPropertyOptional({
    description: 'Additional complaint details',
    example: 'Reported by user via Gmail spam button',
  })
  @IsOptional()
  @IsString()
  details?: string;
}

export class EmailOpenDataDto {
  @ApiPropertyOptional({
    description: 'User agent of the opening device',
    example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'IP address of the opening device',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Geographic location',
    example: { country: 'US', state: 'CA', city: 'San Francisco' },
  })
  @IsOptional()
  @IsObject()
  location?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Device type (mobile, desktop, tablet)',
    example: 'mobile',
  })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class WebhookEmailEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: WebhookEventType,
    example: WebhookEventType.EMAIL_OPENED,
  })
  @IsEnum(WebhookEventType)
  event: WebhookEventType;

  @ApiProperty({
    description: 'Event timestamp (ISO 8601)',
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
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  recipient: string;

  @ApiPropertyOptional({
    description: 'Email subject',
    example: 'Welcome to Study Teddy',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Message ID from email provider',
    example: 'msg_12345',
  })
  @IsOptional()
  @IsString()
  messageId?: string;

  @ApiPropertyOptional({
    description: 'Template used for this email',
    example: 'welcome-email',
  })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({
    description: 'Email tags',
    example: ['welcome', 'automated'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Click-specific data (for click events)',
    type: EmailClickDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailClickDataDto)
  clickData?: EmailClickDataDto;

  @ApiPropertyOptional({
    description: 'Bounce-specific data (for bounce events)',
    type: EmailBounceDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailBounceDataDto)
  bounceData?: EmailBounceDataDto;

  @ApiPropertyOptional({
    description: 'Complaint-specific data (for complaint events)',
    type: EmailComplaintDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailComplaintDataDto)
  complaintData?: EmailComplaintDataDto;

  @ApiPropertyOptional({
    description: 'Open-specific data (for open events)',
    type: EmailOpenDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailOpenDataDto)
  openData?: EmailOpenDataDto;

  @ApiPropertyOptional({
    description: 'Additional event metadata',
    example: { campaign: 'onboarding', version: 'v2' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class WebhookRequestDto {
  @ApiProperty({
    description: 'Webhook signature for verification',
    example: 'sha256=1234567890abcdef',
  })
  @IsString()
  signature: string;

  @ApiProperty({
    description: 'Webhook event data',
    type: [WebhookEmailEventDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEmailEventDto)
  events: WebhookEmailEventDto[];

  @ApiPropertyOptional({
    description: 'Webhook delivery attempt number',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  deliveryAttempt?: number;

  @ApiPropertyOptional({
    description: 'Webhook ID for tracking',
    example: 'webhook_123456789',
  })
  @IsOptional()
  @IsString()
  webhookId?: string;
}

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Processing status',
    example: 'success',
  })
  status: 'success' | 'error' | 'partial';

  @ApiProperty({
    description: 'Number of events processed',
    example: 5,
  })
  processed: number;

  @ApiPropertyOptional({
    description: 'Number of events that failed',
    example: 0,
  })
  failed?: number;

  @ApiPropertyOptional({
    description: 'Error details for failed events',
    example: [{ event: 'email_123', error: 'Invalid email ID' }],
  })
  errors?: Array<{ event: string; error: string }>;

  @ApiProperty({
    description: 'Processing timestamp',
    example: '2024-01-15T11:16:00Z',
  })
  processedAt: string;

  @ApiPropertyOptional({
    description: 'Additional processing metadata',
    example: { batchId: 'batch_123', processingTime: 250 },
  })
  metadata?: Record<string, any>;
}
