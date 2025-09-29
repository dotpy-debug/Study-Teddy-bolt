import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeckDto {
  @ApiProperty({
    description: 'Name of the flashcard deck',
    example: 'JavaScript Fundamentals',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the flashcard deck',
    example: 'Core JavaScript concepts and syntax',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Category of the flashcard deck',
    example: 'Programming',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;
}
