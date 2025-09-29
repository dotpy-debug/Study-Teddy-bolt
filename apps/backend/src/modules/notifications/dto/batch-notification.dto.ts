import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsUUID,
  ArrayNotEmpty,
  IsObject,
} from 'class-validator';

export class CreateBatchNotificationDto {
  @ApiProperty({
    description: 'Batch name',
    example: 'Weekly Study Reminders - Week 1',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Batch description',
    example: 'Sending weekly study reminders to all active users',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Template ID to use for all notifications in this batch',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({
    description: 'Array of user IDs to send notifications to',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d1-b567-987654321000',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiPropertyOptional({
    description: 'Template variables to use if templateId is provided',
    example: {
      companyName: 'Study Teddy',
      weekNumber: '1',
    },
  })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Custom notification data if no template is used',
    example: {
      title: 'Weekly Update',
      message: "Here's your weekly study progress update!",
      type: 'info',
      category: 'system',
      priority: 'medium',
      channels: ['in_app', 'email'],
    },
  })
  @IsOptional()
  @IsObject()
  notificationData?: {
    title: string;
    message: string;
    type: string;
    category: string;
    priority: string;
    channels: string[];
    metadata?: Record<string, any>;
  };
}

export class BatchStatusDto {
  @ApiProperty({
    description: 'Batch ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  batchId: string;
}
