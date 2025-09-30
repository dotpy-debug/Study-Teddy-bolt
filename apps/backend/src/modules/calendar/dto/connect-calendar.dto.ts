import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type CalendarProvider = 'google';

export class ConnectCalendarDto {
  @ApiProperty({
    description: 'OAuth authorization code from Google',
    example: '4/0AdQqwerty...',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class DisconnectCalendarDto {
  @ApiProperty({
    description: 'Calendar account ID to disconnect',
    example: 'uuid-here',
  })
  @IsString()
  @IsNotEmpty()
  calendarAccountId: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Calendar account ID to refresh token for',
    example: 'uuid-here',
  })
  @IsString()
  @IsNotEmpty()
  calendarAccountId: string;
}

export class GetCalendarAuthUrlResponseDto {
  @ApiProperty({
    description: 'OAuth URL to redirect user to for Google Calendar authorization',
    example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  })
  authUrl: string;
}

export class CalendarAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  provider: 'google';

  @ApiProperty()
  accountEmail: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  syncEnabled: boolean;

  @ApiPropertyOptional()
  lastSyncAt?: Date;

  @ApiPropertyOptional()
  calendarIds?: string[];

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
