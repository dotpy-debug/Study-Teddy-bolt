import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  ArrayNotEmpty,
} from 'class-validator';
import { NotificationPriority } from '../types/notification.types';

export enum BulkActionType {
  MARK_AS_READ = 'markAsRead',
  MARK_AS_UNREAD = 'markAsUnread',
  ARCHIVE = 'archive',
  DELETE = 'delete',
  UPDATE_PRIORITY = 'updatePriority',
}

export class BulkOperationDto {
  @ApiProperty({
    description: 'Action to perform on notifications',
    enum: BulkActionType,
    example: BulkActionType.MARK_AS_READ,
  })
  @IsEnum(BulkActionType)
  action: BulkActionType;

  @ApiProperty({
    description: 'Array of notification IDs to operate on',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '987fcdeb-51a2-43d1-b567-987654321000',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  notificationIds: string[];

  @ApiProperty({
    description: 'Additional data for specific operations',
    required: false,
    example: { priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  data?: {
    priority?: NotificationPriority;
    [key: string]: any;
  };
}

export class MarkAsReadDto {
  @ApiProperty({
    description: 'Array of notification IDs to mark as read',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  notificationIds: string[];
}

export class ArchiveNotificationsDto {
  @ApiProperty({
    description: 'Array of notification IDs to archive',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(4, { each: true })
  notificationIds: string[];
}
