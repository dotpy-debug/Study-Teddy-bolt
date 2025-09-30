import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FocusType {
  POMODORO = 'pomodoro',
  DEEP_WORK = 'deep_work',
  CUSTOM = 'custom',
}

export class StartFocusSessionDto {
  @ApiProperty({ description: 'Task ID to focus on' })
  @IsUUID()
  taskId: string;

  @ApiPropertyOptional({ description: 'Subject ID for the session' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'Session duration in minutes',
    minimum: 5,
    maximum: 240,
    default: 25,
  })
  @IsNumber()
  @Min(5)
  @Max(240)
  duration: number;

  @ApiProperty({
    enum: FocusType,
    default: FocusType.POMODORO,
    description: 'Type of focus session',
  })
  @IsEnum(FocusType)
  type: FocusType;

  @ApiPropertyOptional({
    description: 'Break duration in minutes for Pomodoro',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  breakDuration?: number;

  @ApiPropertyOptional({ description: 'Session goals or notes' })
  @IsOptional()
  @IsString()
  goals?: string;

  @ApiPropertyOptional({
    description: 'Enable distraction blocking',
    default: true,
  })
  @IsOptional()
  distractionBlocking?: boolean;

  @ApiPropertyOptional({
    description: 'Enable background music/sounds',
    default: false,
  })
  @IsOptional()
  backgroundSound?: boolean;

  @ApiPropertyOptional({
    description: 'Type of background sound',
    enum: ['white_noise', 'nature', 'lofi', 'classical', 'custom'],
  })
  @IsOptional()
  @IsString()
  soundType?: string;
}
