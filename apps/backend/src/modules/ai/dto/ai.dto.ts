import {
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  Matches,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Sanitize } from '../../../common/transforms/sanitize.transform';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageTypeEnum {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum DifficultyEnum {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class ChatDto {
  @ApiProperty({
    description: 'Message content to send to Teddy AI',
    example: 'Can you help me understand quadratic equations?',
    minLength: 1,
    maxLength: 4000,
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message is required' })
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(4000, { message: 'Message must not exceed 4000 characters' })
  @Matches(/^(?!.*<script).*$/i, {
    message: 'Message contains potentially harmful content',
  })
  @Sanitize
  message: string;

  @ApiProperty({
    description: 'Optional context or subject for the conversation',
    example: 'Mathematics',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Context must be a string' })
  @MaxLength(100, { message: 'Context must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_&]*$/, {
    message: 'Context contains invalid characters',
  })
  @Sanitize
  context?: string;

  @ApiProperty({
    description: 'Type of message',
    example: 'user',
    enum: MessageTypeEnum,
    default: 'user',
    required: false,
  })
  @IsOptional()
  @IsEnum(MessageTypeEnum, {
    message: 'Message type must be one of: user, assistant, system',
  })
  messageType?: MessageTypeEnum;
}

export class GeneratePracticeQuestionsDto {
  @ApiProperty({
    description: 'Subject for practice questions',
    example: 'Mathematics',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(2, { message: 'Subject must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_&]+$/, {
    message: 'Subject contains invalid characters',
  })
  @Sanitize
  subject: string;

  @ApiProperty({
    description: 'Specific topic within the subject',
    example: 'Quadratic Equations',
    required: false,
    maxLength: 150,
  })
  @IsOptional()
  @IsString({ message: 'Topic must be a string' })
  @MaxLength(150, { message: 'Topic must not exceed 150 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_&(),]*$/, {
    message: 'Topic contains invalid characters',
  })
  @Sanitize
  topic?: string;

  @ApiProperty({
    description: 'Difficulty level of questions',
    example: 'intermediate',
    enum: DifficultyEnum,
    default: 'intermediate',
    required: false,
  })
  @IsOptional()
  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be one of: beginner, intermediate, advanced',
  })
  difficulty?: DifficultyEnum;

  @ApiProperty({
    description: 'Number of questions to generate',
    example: 5,
    minimum: 1,
    maximum: 10,
    default: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Question count must be a number' })
  @Min(1, { message: 'Must generate at least 1 question' })
  @Max(10, { message: 'Cannot generate more than 10 questions at once' })
  @Transform(({ value }) => parseInt(value, 10))
  questionCount?: number;
}

export class ChatHistoryParamsDto {
  @ApiProperty({
    description: 'Chat message ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString({ message: 'Chat ID must be a string' })
  @IsNotEmpty({ message: 'Chat ID is required' })
  @IsUUID(4, { message: 'Chat ID must be a valid UUID' })
  id: string;
}

export class ChatHistoryQueryDto {
  @ApiProperty({
    description: 'Limit number of messages returned',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @ApiProperty({
    description: 'Filter by context or subject',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Context filter must be a string' })
  @MaxLength(100, { message: 'Context filter too long' })
  @Matches(/^[a-zA-Z0-9\s\-_&]*$/, {
    message: 'Context filter contains invalid characters',
  })
  context?: string;

  @ApiProperty({
    description: 'Search for specific text in messages',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  @MaxLength(200, { message: 'Search query too long' })
  @Sanitize
  search?: string;
}

export class StudyPlanDto {
  @ApiProperty({
    description: 'Subject for study plan',
    example: 'Computer Science',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(2, { message: 'Subject must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_&]+$/, {
    message: 'Subject contains invalid characters',
  })
  @Sanitize
  subject: string;

  @ApiProperty({
    description: 'Total weeks for the study plan',
    example: 8,
    minimum: 1,
    maximum: 52,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Total weeks must be a number' })
  @Min(1, { message: 'Must have at least 1 week' })
  @Max(52, { message: 'Cannot exceed 52 weeks' })
  @Transform(({ value }) => parseInt(value, 10))
  totalWeeks?: number;

  @ApiProperty({
    description: 'Available study hours per week',
    example: 10,
    minimum: 1,
    maximum: 40,
  })
  @IsNumber({}, { message: 'Study hours must be a number' })
  @Min(1, { message: 'Must have at least 1 hour per week' })
  @Max(40, { message: 'Cannot exceed 40 hours per week' })
  @Transform(({ value }) => parseInt(value, 10))
  hoursPerWeek: number;

  @ApiProperty({
    description: 'Current skill level',
    example: 'beginner',
    enum: DifficultyEnum,
  })
  @IsEnum(DifficultyEnum, {
    message: 'Skill level must be one of: beginner, intermediate, advanced',
  })
  skillLevel: DifficultyEnum;

  @ApiProperty({
    description: 'Specific goals or learning objectives',
    example: 'Prepare for final exam',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Goals must be a string' })
  @MaxLength(500, { message: 'Goals must not exceed 500 characters' })
  @Sanitize
  goals?: string;
}

// ============================================
// New AI Pattern DTOs
// ============================================

export enum TaskPriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum LearningStyleEnum {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING = 'reading',
}

export enum PreferredStyleEnum {
  DETAILED = 'detailed',
  CONCISE = 'concise',
  VISUAL = 'visual',
  EXAMPLE_HEAVY = 'example-heavy',
}

// Taskify DTOs
export class TaskifyDto {
  @ApiProperty({
    description: 'Free text to convert into structured tasks',
    example: 'I need to study for my calculus exam next week and finish my chemistry lab report',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString({ message: 'Text must be a string' })
  @IsNotEmpty({ message: 'Text is required' })
  @MinLength(10, { message: 'Text must be at least 10 characters' })
  @MaxLength(2000, { message: 'Text must not exceed 2000 characters' })
  @Sanitize
  text: string;

  @ApiProperty({
    description: 'Default subject if not specified in text',
    example: 'Mathematics',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Default subject must be a string' })
  @MaxLength(100, { message: 'Default subject must not exceed 100 characters' })
  @Sanitize
  defaultSubject?: string;

  @ApiProperty({
    description: 'Timeframe context for task planning',
    example: 'This week',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Timeframe must be a string' })
  @MaxLength(100, { message: 'Timeframe must not exceed 100 characters' })
  @Sanitize
  timeframe?: string;

  @ApiProperty({
    description: 'Default priority level for generated tasks',
    example: 'medium',
    enum: TaskPriorityEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriorityEnum, {
    message: 'Priority must be one of: low, medium, high',
  })
  priorityLevel?: TaskPriorityEnum;

  @ApiProperty({
    description: 'Study goals to consider when generating tasks',
    example: ['Pass final exam', 'Improve problem-solving skills'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Study goals must be an array' })
  @IsString({ each: true, message: 'Each study goal must be a string' })
  @MaxLength(100, {
    each: true,
    message: 'Each goal must not exceed 100 characters',
  })
  studyGoals?: string[];
}

// Breakdown DTOs
export class BreakdownDto {
  @ApiProperty({
    description: 'Title of the task to break down',
    example: 'Learn Linear Algebra',
    minLength: 3,
    maxLength: 200,
  })
  @IsString({ message: 'Task title must be a string' })
  @IsNotEmpty({ message: 'Task title is required' })
  @MinLength(3, { message: 'Task title must be at least 3 characters' })
  @MaxLength(200, { message: 'Task title must not exceed 200 characters' })
  @Sanitize
  taskTitle: string;

  @ApiProperty({
    description: 'Detailed description of the task',
    example: 'Comprehensive understanding of linear algebra concepts for engineering applications',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Task description must be a string' })
  @MaxLength(1000, {
    message: 'Task description must not exceed 1000 characters',
  })
  @Sanitize
  taskDescription?: string;

  @ApiProperty({
    description: 'Subject area of the task',
    example: 'Mathematics',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(2, { message: 'Subject must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject must not exceed 100 characters' })
  @Sanitize
  subject: string;

  @ApiProperty({
    description: 'Total estimated hours for the task',
    example: 20,
    minimum: 1,
    maximum: 200,
  })
  @IsNumber({}, { message: 'Total estimated hours must be a number' })
  @Min(1, { message: 'Must have at least 1 hour' })
  @Max(200, { message: 'Cannot exceed 200 hours' })
  @Transform(({ value }) => parseFloat(value))
  totalEstimatedHours: number;

  @ApiProperty({
    description: 'Difficulty level of the task',
    example: 'intermediate',
    enum: DifficultyEnum,
  })
  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be one of: beginner, intermediate, advanced',
  })
  difficulty: DifficultyEnum;

  @ApiProperty({
    description: 'Available resources for learning',
    example: ['Textbook', 'Online videos', 'Practice problems'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Available resources must be an array' })
  @IsString({ each: true, message: 'Each resource must be a string' })
  @MaxLength(100, {
    each: true,
    message: 'Each resource must not exceed 100 characters',
  })
  availableResources?: string[];

  @ApiProperty({
    description: 'Preferred learning style',
    example: 'visual',
    enum: LearningStyleEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(LearningStyleEnum, {
    message: 'Learning style must be one of: visual, auditory, kinesthetic, reading',
  })
  learningStyle?: LearningStyleEnum;

  @ApiProperty({
    description: 'Time constraints or deadlines',
    example: 'Need to complete in 2 weeks',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Time constraints must be a string' })
  @MaxLength(200, {
    message: 'Time constraints must not exceed 200 characters',
  })
  @Sanitize
  timeConstraints?: string;

  @ApiProperty({
    description: 'Prior knowledge or experience',
    example: 'Basic algebra and trigonometry',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Prior knowledge must be a string' })
  @MaxLength(500, { message: 'Prior knowledge must not exceed 500 characters' })
  @Sanitize
  priorKnowledge?: string;
}

// Tutor DTOs
export class TutorExplainDto {
  @ApiProperty({
    description: 'Concept to explain',
    example: 'Quadratic equations',
    minLength: 2,
    maxLength: 200,
  })
  @IsString({ message: 'Concept must be a string' })
  @IsNotEmpty({ message: 'Concept is required' })
  @MinLength(2, { message: 'Concept must be at least 2 characters' })
  @MaxLength(200, { message: 'Concept must not exceed 200 characters' })
  @Sanitize
  concept: string;

  @ApiProperty({
    description: 'Subject area',
    example: 'Mathematics',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(2, { message: 'Subject must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject must not exceed 100 characters' })
  @Sanitize
  subject: string;

  @ApiProperty({
    description: 'Difficulty level',
    example: 'intermediate',
    enum: DifficultyEnum,
  })
  @IsEnum(DifficultyEnum, {
    message: 'Difficulty must be one of: beginner, intermediate, advanced',
  })
  difficulty: DifficultyEnum;

  @ApiProperty({
    description: 'Specific learning goals',
    example: ['Understand the formula', 'Solve real-world problems'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Learning goals must be an array' })
  @IsString({ each: true, message: 'Each learning goal must be a string' })
  @MaxLength(200, {
    each: true,
    message: 'Each goal must not exceed 200 characters',
  })
  learningGoals?: string[];

  @ApiProperty({
    description: 'Prior knowledge about the topic',
    example: 'Familiar with basic algebra',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Prior knowledge must be a string' })
  @MaxLength(500, { message: 'Prior knowledge must not exceed 500 characters' })
  @Sanitize
  priorKnowledge?: string;

  @ApiProperty({
    description: 'Preferred explanation style',
    example: 'detailed',
    enum: PreferredStyleEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(PreferredStyleEnum, {
    message: 'Preferred style must be one of: detailed, concise, visual, example-heavy',
  })
  preferredStyle?: PreferredStyleEnum;

  @ApiProperty({
    description: 'Available time for study in minutes',
    example: 30,
    minimum: 5,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Time available must be a number' })
  @Min(5, { message: 'Must have at least 5 minutes' })
  @Max(180, { message: 'Cannot exceed 180 minutes' })
  @Transform(({ value }) => parseInt(value, 10))
  timeAvailable?: number;
}

export class CheckAnswerDto {
  @ApiProperty({
    description: 'The question that was asked',
    example: 'What is the solution to x² + 5x + 6 = 0?',
    minLength: 5,
    maxLength: 1000,
  })
  @IsString({ message: 'Question must be a string' })
  @IsNotEmpty({ message: 'Question is required' })
  @MinLength(5, { message: 'Question must be at least 5 characters' })
  @MaxLength(1000, { message: 'Question must not exceed 1000 characters' })
  @Sanitize
  question: string;

  @ApiProperty({
    description: "The student's answer to check",
    example: 'x = -2 and x = -3',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString({ message: 'Student answer must be a string' })
  @IsNotEmpty({ message: 'Student answer is required' })
  @MinLength(1, { message: 'Student answer cannot be empty' })
  @MaxLength(2000, {
    message: 'Student answer must not exceed 2000 characters',
  })
  @Sanitize
  studentAnswer: string;

  @ApiProperty({
    description: 'Subject area',
    example: 'Mathematics',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Subject must be a string' })
  @IsNotEmpty({ message: 'Subject is required' })
  @MinLength(2, { message: 'Subject must be at least 2 characters' })
  @MaxLength(100, { message: 'Subject must not exceed 100 characters' })
  @Sanitize
  subject: string;

  @ApiProperty({
    description: 'The correct answer (optional, for better assessment)',
    example: 'x = -2 and x = -3',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Correct answer must be a string' })
  @MaxLength(1000, {
    message: 'Correct answer must not exceed 1000 characters',
  })
  @Sanitize
  correctAnswer?: string;

  @ApiProperty({
    description: 'Additional explanation or context',
    example: 'This is a quadratic equation that can be solved by factoring',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Explanation must be a string' })
  @MaxLength(1000, { message: 'Explanation must not exceed 1000 characters' })
  @Sanitize
  explanation?: string;

  @ApiProperty({
    description: 'Available hints for the question',
    example: ['Try factoring the equation', 'Look for two numbers that multiply to 6 and add to 5'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Hints must be an array' })
  @IsString({ each: true, message: 'Each hint must be a string' })
  @MaxLength(200, {
    each: true,
    message: 'Each hint must not exceed 200 characters',
  })
  hints?: string[];
}
