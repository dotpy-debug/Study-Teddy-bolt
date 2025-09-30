import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PushSubscriptionKeysDto {
  @ApiProperty({
    description: 'P256DH key for push subscription',
    example: 'BKxIJXW7...',
  })
  @IsString()
  p256dh: string;

  @ApiProperty({
    description: 'Auth key for push subscription',
    example: 'GdG2rqvF16...',
  })
  @IsString()
  auth: string;
}

export class CreatePushSubscriptionDto {
  @ApiProperty({
    description: 'Push subscription endpoint',
    example: 'https://fcm.googleapis.com/fcm/send/...',
  })
  @IsString()
  endpoint: string;

  @ApiProperty({
    description: 'Push subscription keys',
    type: PushSubscriptionKeysDto,
  })
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;

  @ApiPropertyOptional({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class SendTestPushDto {
  @ApiProperty({
    description: 'Test notification title',
    example: 'Test Push Notification',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Test notification message',
    example: 'This is a test push notification to verify your settings.',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional data for the push notification',
    example: { url: '/dashboard' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
