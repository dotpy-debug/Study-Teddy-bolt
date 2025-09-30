import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StopFocusSessionDto {
  @ApiPropertyOptional({
    description: 'Reason for stopping the session early',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Productivity rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  productivityRating?: number;

  @ApiPropertyOptional({
    description: 'Focus quality rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  focusRating?: number;

  @ApiPropertyOptional({
    description: 'Number of distractions encountered',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distractionCount?: number;

  @ApiPropertyOptional({
    description: 'Session notes or reflections',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Was the session completed successfully?',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({
    description: 'Progress made on the task (percentage)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taskProgress?: number;
}
