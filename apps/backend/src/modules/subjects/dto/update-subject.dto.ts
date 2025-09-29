import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSubjectDto } from './create-subject.dto';

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {
  @ApiPropertyOptional({
    example: false,
    description: 'Archive/unarchive the subject',
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
