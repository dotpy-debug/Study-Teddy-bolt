import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUrl,
  IsHexColor,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResourceLinkDto {
  @ApiProperty({
    example: 'Khan Academy - Calculus',
    description: 'Link title',
  })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    example: 'https://www.khanacademy.org/math/calculus',
    description: 'Resource URL',
  })
  @IsUrl()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({
    example: 'Comprehensive calculus tutorials',
    description: 'Link description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class SubjectResourcesDto {
  @ApiPropertyOptional({
    type: [ResourceLinkDto],
    description: 'Study resource links',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceLinkDto)
  links?: ResourceLinkDto[];

  @ApiPropertyOptional({
    example: 'Additional study notes and materials',
    description: 'General notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateSubjectDto {
  @ApiProperty({
    example: 'Mathematics',
    description: 'Subject name (must be unique per user)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: '#4F46E5',
    description: 'Subject color in hex format',
    default: '#6366F1',
  })
  @IsHexColor()
  color: string = '#6366F1';

  @ApiPropertyOptional({
    example: 'BookOpen',
    description: 'Subject icon identifier',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    example: 'Advanced calculus and linear algebra course',
    description: 'Subject description and goals',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: SubjectResourcesDto,
    description: 'Study resources and materials',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubjectResourcesDto)
  resources?: SubjectResourcesDto;
}
