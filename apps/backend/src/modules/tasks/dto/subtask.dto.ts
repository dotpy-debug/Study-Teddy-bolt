import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  Length,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Sanitize } from '../../../common/transforms/sanitize.transform';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubtaskDto {
  @ApiProperty({
    description: 'Parent task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString({ message: 'Task ID must be a string' })
  @IsNotEmpty({ message: 'Task ID is required' })
  @IsUUID(4, { message: 'Task ID must be a valid UUID' })
  taskId: string;

  @ApiProperty({
    description: 'Subtask title',
    example: 'Review chapter 3',
    minLength: 1,
    maxLength: 255,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @Length(1, 255, { message: 'Title must be between 1 and 255 characters' })
  @Sanitize
  title: string;

  @ApiProperty({
    description: 'Order position in the subtask list',
    example: 0,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Order must be a number' })
  @Min(0, { message: 'Order cannot be negative' })
  order?: number;
}

export class UpdateSubtaskDto {
  @ApiProperty({
    description: 'Subtask title',
    example: 'Review chapter 3',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @Length(1, 255, { message: 'Title must be between 1 and 255 characters' })
  @Sanitize
  title?: string;

  @ApiProperty({
    description: 'Completion status',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Completed must be a boolean value' })
  completed?: boolean;

  @ApiProperty({
    description: 'Order position in the subtask list',
    example: 1,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Order must be a number' })
  @Min(0, { message: 'Order cannot be negative' })
  order?: number;
}

export class SubtaskParamsDto {
  @ApiProperty({
    description: 'Subtask ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString({ message: 'Subtask ID must be a string' })
  @IsNotEmpty({ message: 'Subtask ID is required' })
  @IsUUID(4, { message: 'Subtask ID must be a valid UUID' })
  id: string;
}

export class ReorderSubtaskDto {
  @ApiProperty({
    description: 'New order position',
    example: 2,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Position must be a number' })
  @Min(0, { message: 'Position cannot be negative' })
  position: number;
}

export class BulkCreateSubtasksDto {
  @ApiProperty({
    description: 'Parent task ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString({ message: 'Task ID must be a string' })
  @IsNotEmpty({ message: 'Task ID is required' })
  @IsUUID(4, { message: 'Task ID must be a valid UUID' })
  taskId: string;

  @ApiProperty({
    description: 'Array of subtask titles',
    example: ['Review chapter 1', 'Complete exercises', 'Write summary'],
    type: [String],
  })
  @IsString({ each: true, message: 'Each title must be a string' })
  @Length(1, 255, {
    each: true,
    message: 'Each title must be between 1 and 255 characters',
  })
  titles: string[];
}
