import {
  IsOptional,
  IsBoolean,
  IsDateString,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SyncCalendarDto {
  @ApiPropertyOptional({
    description:
      'Calendar ID to sync (if not specified, syncs Study Teddy calendar)',
  })
  @IsOptional()
  @IsString()
  calendarId?: string;

  @ApiPropertyOptional({
    description: 'Perform full sync instead of incremental',
  })
  @IsOptional()
  @IsBoolean()
  fullSync?: boolean;

  @ApiPropertyOptional({ description: 'Last sync time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  lastSyncTime?: string;

  @ApiPropertyOptional({
    description: 'Conflict resolution strategy',
    enum: ['google_wins', 'local_wins', 'merge'],
  })
  @IsOptional()
  @IsEnum(['google_wins', 'local_wins', 'merge'])
  conflictResolution?: 'google_wins' | 'local_wins' | 'merge';
}
