import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsDecimal,
  ArrayMinSize,
  ArrayMaxSize,
  IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Sanitize } from '../../../common/transforms/sanitize.transform';

// Enums
export enum GoalTypeEnum {
  STUDY_TIME = 'study_time',
  TASKS_COMPLETED = 'tasks_completed',
  SESSIONS_COUNT = 'sessions_count',
  FOCUS_SCORE = 'focus_score',
  STREAK = 'streak',
  GRADE = 'grade',
}

export enum GoalCategoryEnum {
  ACADEMIC = 'academic',
  PERSONAL = 'personal',
  PRODUCTIVITY = 'productivity',
  HEALTH = 'health',
}

export enum GoalTimeframeEnum {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum GoalStatusEnum {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum GoalPriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum GoalSharingTypeEnum {
  PRIVATE = 'private',
  FRIENDS = 'friends',
  PUBLIC = 'public',
  STUDY_GROUP = 'study_group',
}

export enum GoalDifficultyEnum {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum GoalPermissionEnum {
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit',
}

// Nested DTOs
export class RecurrencePatternDto {
  @ApiProperty({
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Frequency of recurrence',
    example: 'weekly',
  })
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @ApiProperty({
    description: 'Interval between recurrences',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  interval: number;

  @ApiPropertyOptional({
    description: 'Days of the week for weekly goals (0=Sunday, 6=Saturday)',
    example: [1, 3, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Day of the month for monthly goals',
    example: 15,
    minimum: 1,
    maximum: 31,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'End date for recurrence or "never"',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  endRecurrence?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of occurrences',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOccurrences?: number;
}

export class GoalMilestoneDto {
  @ApiProperty({
    description: 'Milestone title',
    example: 'Complete 25% of study hours',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @Sanitize
  title: string;

  @ApiPropertyOptional({
    description: 'Milestone description',
    example: 'Reach the first quarter of your study time goal',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Sanitize
  description?: string;

  @ApiProperty({
    description: 'Target value for this milestone',
    example: 25.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetValue: number;

  @ApiProperty({
    description: 'Order of this milestone',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiPropertyOptional({
    description: 'Reward points for completing this milestone',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardPoints?: number;
}

export class GoalMetadataDto {
  @ApiPropertyOptional({
    enum: GoalDifficultyEnum,
    description: 'Estimated difficulty level',
    example: GoalDifficultyEnum.MEDIUM,
  })
  @IsOptional()
  @IsEnum(GoalDifficultyEnum)
  estimatedDifficulty?: GoalDifficultyEnum;

  @ApiPropertyOptional({
    description: 'Related subjects',
    example: ['Mathematics', 'Physics'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  relatedSubjects?: string[];

  @ApiPropertyOptional({
    description: 'Motivational message',
    example: 'You can do this! Stay focused on your goals.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Sanitize
  motivationalMessage?: string;

  @ApiPropertyOptional({
    description: 'Rewards for completing the goal',
    example: ['Certificate', 'Badge', 'Extra break time'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  rewards?: string[];

  @ApiPropertyOptional({
    description: 'AI-generated insights',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  aiInsights?: {
    feasibilityScore: number;
    timeEstimate: string;
    tips: string[];
  };
}

// Main DTOs
export class CreateGoalDto {
  @ApiProperty({
    description: 'Goal title',
    example: 'Study 40 hours this month',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @Sanitize
  title: string;

  @ApiPropertyOptional({
    description: 'Goal description',
    example: 'Focus on mathematics and physics to improve understanding',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Sanitize
  description?: string;

  @ApiProperty({
    enum: GoalTypeEnum,
    description: 'Type of the goal',
    example: GoalTypeEnum.STUDY_TIME,
  })
  @IsEnum(GoalTypeEnum)
  type: GoalTypeEnum;

  @ApiProperty({
    enum: GoalCategoryEnum,
    description: 'Category of the goal',
    example: GoalCategoryEnum.ACADEMIC,
  })
  @IsEnum(GoalCategoryEnum)
  category: GoalCategoryEnum;

  @ApiProperty({
    enum: GoalTimeframeEnum,
    description: 'Timeframe for the goal',
    example: GoalTimeframeEnum.MONTHLY,
  })
  @IsEnum(GoalTimeframeEnum)
  timeframe: GoalTimeframeEnum;

  @ApiProperty({
    description: 'Target value to achieve',
    example: 40.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetValue: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'hours',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  unit: string;

  @ApiProperty({
    description: 'Start date for the goal',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'End date for the goal (required for custom timeframe)',
    example: '2024-01-31',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date for custom timeframes',
    example: '2024-06-15',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  customEndDate?: string;

  @ApiPropertyOptional({
    enum: GoalPriorityEnum,
    description: 'Priority level of the goal',
    example: GoalPriorityEnum.HIGH,
  })
  @IsOptional()
  @IsEnum(GoalPriorityEnum)
  priority?: GoalPriorityEnum;

  @ApiPropertyOptional({
    description: 'Whether this is a recurring goal',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern for recurring goals',
    type: RecurrencePatternDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  recurrencePattern?: RecurrencePatternDto;

  @ApiPropertyOptional({
    enum: GoalSharingTypeEnum,
    description: 'Sharing type for the goal',
    example: GoalSharingTypeEnum.PRIVATE,
  })
  @IsOptional()
  @IsEnum(GoalSharingTypeEnum)
  sharingType?: GoalSharingTypeEnum;

  @ApiPropertyOptional({
    description: 'Whether this is a collaborative goal',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCollaborative?: boolean;

  @ApiPropertyOptional({
    description: 'User IDs of collaborators',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMaxSize(10)
  collaboratorIds?: string[];

  @ApiPropertyOptional({
    description: 'Template ID if created from template',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID(4)
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Tags for the goal',
    example: ['mathematics', 'exam-prep', 'important'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Goal milestones',
    type: [GoalMilestoneDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalMilestoneDto)
  @ArrayMaxSize(10)
  milestones?: GoalMilestoneDto[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: GoalMetadataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GoalMetadataDto)
  metadata?: GoalMetadataDto;
}

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @ApiPropertyOptional({
    enum: GoalStatusEnum,
    description: 'Status of the goal',
    example: GoalStatusEnum.ACTIVE,
  })
  @IsOptional()
  @IsEnum(GoalStatusEnum)
  status?: GoalStatusEnum;
}

export class GoalProgressDto {
  @ApiProperty({
    description: 'Progress value to add',
    example: 2.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value: number;

  @ApiPropertyOptional({
    description: 'Note about this progress entry',
    example: 'Completed calculus homework',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Sanitize
  note?: string;

  @ApiPropertyOptional({
    description: 'Source of the progress',
    example: 'manual',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    sessionId?: string;
    taskId?: string;
    activityType?: string;
    confidence?: number;
  };
}

export class ShareGoalDto {
  @ApiProperty({
    description: 'User ID to share the goal with',
    example: 'uuid',
  })
  @IsUUID(4)
  sharedWithUserId: string;

  @ApiProperty({
    enum: GoalPermissionEnum,
    description: 'Permission level for the shared user',
    example: GoalPermissionEnum.VIEW,
  })
  @IsEnum(GoalPermissionEnum)
  permission: GoalPermissionEnum;

  @ApiPropertyOptional({
    description: 'Invitation message',
    example: 'Join me in achieving this goal!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Sanitize
  inviteMessage?: string;
}

export class GoalCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Great progress on this goal!',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  @Sanitize
  content: string;

  @ApiPropertyOptional({
    description: 'Parent comment ID for replies',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID(4)
  parentCommentId?: string;
}

export class GoalReminderDto {
  @ApiProperty({
    description: 'Type of reminder',
    example: 'deadline',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Reminder title',
    example: 'Goal deadline approaching',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @Sanitize
  title: string;

  @ApiPropertyOptional({
    description: 'Reminder message',
    example: 'Your study goal deadline is in 3 days',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Sanitize
  message?: string;

  @ApiProperty({
    description: 'When to send the reminder',
    example: '2024-01-28T09:00:00Z',
  })
  @IsDateString()
  scheduledFor: string;

  @ApiPropertyOptional({
    description: 'Whether this is a recurring reminder',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern for recurring reminders',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
  };
}

export class CreateGoalTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Monthly Study Hours',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  @Sanitize
  name: string;

  @ApiPropertyOptional({
    description: 'Template description',
    example: 'Template for setting monthly study hour goals',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Sanitize
  description?: string;

  @ApiProperty({
    enum: GoalTypeEnum,
    description: 'Goal type',
    example: GoalTypeEnum.STUDY_TIME,
  })
  @IsEnum(GoalTypeEnum)
  type: GoalTypeEnum;

  @ApiProperty({
    enum: GoalCategoryEnum,
    description: 'Goal category',
    example: GoalCategoryEnum.ACADEMIC,
  })
  @IsEnum(GoalCategoryEnum)
  category: GoalCategoryEnum;

  @ApiProperty({
    enum: GoalTimeframeEnum,
    description: 'Default timeframe',
    example: GoalTimeframeEnum.MONTHLY,
  })
  @IsEnum(GoalTimeframeEnum)
  defaultTimeframe: GoalTimeframeEnum;

  @ApiProperty({
    description: 'Default target value',
    example: 40,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultTargetValue: number;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'hours',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  unit: string;

  @ApiProperty({
    enum: GoalDifficultyEnum,
    description: 'Difficulty level',
    example: GoalDifficultyEnum.MEDIUM,
  })
  @IsEnum(GoalDifficultyEnum)
  difficulty: GoalDifficultyEnum;

  @ApiPropertyOptional({
    description: 'Whether this template is public',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Tags for the template',
    example: ['study', 'academic', 'monthly'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Template milestones',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  milestones?: Array<{
    title: string;
    description?: string;
    targetPercentage: number;
    order: number;
  }>;
}

// Query DTOs
export class GoalQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: GoalTypeEnum,
    description: 'Filter by goal type',
  })
  @IsOptional()
  @IsEnum(GoalTypeEnum)
  type?: GoalTypeEnum;

  @ApiPropertyOptional({
    enum: GoalCategoryEnum,
    description: 'Filter by goal category',
  })
  @IsOptional()
  @IsEnum(GoalCategoryEnum)
  category?: GoalCategoryEnum;

  @ApiPropertyOptional({
    enum: GoalStatusEnum,
    description: 'Filter by goal status',
  })
  @IsOptional()
  @IsEnum(GoalStatusEnum)
  status?: GoalStatusEnum;

  @ApiPropertyOptional({
    enum: GoalTimeframeEnum,
    description: 'Filter by timeframe',
  })
  @IsOptional()
  @IsEnum(GoalTimeframeEnum)
  timeframe?: GoalTimeframeEnum;

  @ApiPropertyOptional({
    description: 'Search in title and description',
    example: 'study',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
    example: 'mathematics,important',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Include completed goals',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeCompleted?: boolean = false;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class GoalAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: GoalTypeEnum,
    description: 'Filter analytics by goal type',
  })
  @IsOptional()
  @IsEnum(GoalTypeEnum)
  type?: GoalTypeEnum;

  @ApiPropertyOptional({
    enum: GoalCategoryEnum,
    description: 'Filter analytics by goal category',
  })
  @IsOptional()
  @IsEnum(GoalCategoryEnum)
  category?: GoalCategoryEnum;
}

export class GoalSuggestionDto {
  @ApiPropertyOptional({
    description: 'User preferences for suggestions',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  preferences?: {
    preferredCategories?: GoalCategoryEnum[];
    studyTimeAvailable?: number;
    difficultyLevel?: GoalDifficultyEnum;
    focusAreas?: string[];
  };

  @ApiPropertyOptional({
    description: 'Number of suggestions to return',
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  count?: number = 5;
}
