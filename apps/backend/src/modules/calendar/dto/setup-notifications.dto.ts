import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetupNotificationsDto {
  @ApiProperty({ description: 'Webhook URL to receive notifications' })
  @IsUrl()
  webhookUrl: string;

  @ApiPropertyOptional({
    description: 'Calendar ID (if not specified, uses Study Teddy calendar)',
  })
  @IsOptional()
  @IsString()
  calendarId?: string;
}
