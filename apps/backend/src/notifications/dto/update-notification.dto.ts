import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiProperty({
    description: 'Mark notification as read',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Read must be a boolean value' })
  read?: boolean;

  @ApiProperty({
    description: 'Mark notification as dismissed',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Dismissed must be a boolean value' })
  dismissed?: boolean;
}
