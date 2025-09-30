import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import {
  CreateGoalDto,
  UpdateGoalDto,
  GoalProgressDto,
  ShareGoalDto,
  GoalCommentDto,
  GoalReminderDto,
  CreateGoalTemplateDto,
  GoalQueryDto,
  GoalAnalyticsQueryDto,
  GoalSuggestionDto,
} from './dto/goals.dto';
import { BetterAuthGuard } from '../auth/guards/better-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BetterAuthUser } from '../auth/better-auth.service';

@ApiTags('Goals')
@ApiBearerAuth('JWT')
@Controller('goals')
@UseGuards(BetterAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 goals per minute
  @ApiOperation({
    summary: 'Create a new goal',
    description: 'Create a new study goal with optional milestones and sharing settings',
  })
  @ApiCreatedResponse({
    description: 'Goal created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: {
          type: 'string',
          enum: [
            'study_time',
            'tasks_completed',
            'sessions_count',
            'focus_score',
            'streak',
            'grade',
          ],
        },
        category: {
          type: 'string',
          enum: ['academic', 'personal', 'productivity', 'health'],
        },
        timeframe: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
        },
        targetValue: { type: 'string' },
        currentValue: { type: 'string' },
        unit: { type: 'string' },
        status: {
          type: 'string',
          enum: ['active', 'paused', 'completed', 'cancelled', 'overdue'],
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        progressPercentage: { type: 'string' },
        isCompleted: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid goal data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async createGoal(@Body() createGoalDto: CreateGoalDto, @CurrentUser() user: BetterAuthUser) {
    return this.goalsService.createGoal(user.id, createGoalDto);
  }

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get user goals',
    description: 'Retrieve goals for the authenticated user with filtering and pagination',
  })
  @ApiQuery({ type: GoalQueryDto, required: false })
  @ApiOkResponse({
    description: 'Goals retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              description: { type: 'string' },
              type: { type: 'string' },
              category: { type: 'string' },
              timeframe: { type: 'string' },
              targetValue: { type: 'string' },
              currentValue: { type: 'string' },
              unit: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'string' },
              progressPercentage: { type: 'string' },
              isCompleted: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getGoals(@CurrentUser() user: BetterAuthUser, @Query() query: GoalQueryDto) {
    return this.goalsService.getGoals(user.id, query);
  }

  @Get('shared')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get shared goals',
    description: 'Retrieve goals that have been shared with the authenticated user',
  })
  @ApiOkResponse({
    description: 'Shared goals retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          goal: { type: 'object' },
          sharing: { type: 'object' },
          sharedBy: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getSharedGoals(@CurrentUser() user: BetterAuthUser) {
    return this.goalsService.getSharedGoals(user.id);
  }

  @Get('analytics')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get goal analytics',
    description: 'Retrieve comprehensive analytics and insights about user goals',
  })
  @ApiQuery({ type: GoalAnalyticsQueryDto, required: false })
  @ApiOkResponse({
    description: 'Goal analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalGoals: { type: 'number' },
            completedGoals: { type: 'number' },
            activeGoals: { type: 'number' },
            averageCompletionRate: { type: 'number' },
          },
        },
        categoryBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              count: { type: 'number' },
              completedCount: { type: 'number' },
            },
          },
        },
        typeBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              count: { type: 'number' },
              completedCount: { type: 'number' },
              averageProgress: { type: 'number' },
            },
          },
        },
        insights: {
          type: 'object',
          properties: {
            overdueGoals: { type: 'number' },
            currentStreak: { type: 'number' },
            longestStreak: { type: 'number' },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAnalytics(@CurrentUser() user: BetterAuthUser, @Query() query: GoalAnalyticsQueryDto) {
    return this.goalsService.getAnalytics(user.id, query);
  }

  @Post('suggestions')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Get AI-powered goal suggestions',
    description: 'Get personalized goal suggestions based on user history and preferences',
  })
  @ApiOkResponse({
    description: 'Goal suggestions generated successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string' },
          category: { type: 'string' },
          timeframe: { type: 'string' },
          targetValue: { type: 'number' },
          unit: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          reasoning: { type: 'string' },
          milestones: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                targetPercentage: { type: 'number' },
                order: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid suggestion request' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async getSuggestions(
    @Body() suggestionDto: GoalSuggestionDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.getSuggestions(user.id, suggestionDto);
  }

  @Get('templates')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @ApiOperation({
    summary: 'Get goal templates',
    description: 'Retrieve public goal templates or user-created templates',
  })
  @ApiQuery({
    name: 'isPublic',
    required: false,
    type: Boolean,
    description: 'Filter by public templates',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of templates to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of templates to skip',
  })
  @ApiOkResponse({
    description: 'Goal templates retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string' },
          category: { type: 'string' },
          defaultTimeframe: { type: 'string' },
          defaultTargetValue: { type: 'string' },
          unit: { type: 'string' },
          difficulty: { type: 'string' },
          usageCount: { type: 'number' },
          rating: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          milestones: { type: 'array' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getTemplates(
    @Query('isPublic') isPublic = true,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.getTemplates(isPublic, user.id, limit, offset);
  }

  @Post('templates')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 templates per minute
  @ApiOperation({
    summary: 'Create goal template',
    description: 'Create a new goal template that can be reused',
  })
  @ApiCreatedResponse({
    description: 'Goal template created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        defaultTimeframe: { type: 'string' },
        defaultTargetValue: { type: 'string' },
        unit: { type: 'string' },
        difficulty: { type: 'string' },
        isPublic: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        milestones: { type: 'array' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid template data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async createTemplate(
    @Body() templateDto: CreateGoalTemplateDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.createTemplate(user.id, templateDto);
  }

  @Get(':id')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get goal by ID',
    description: 'Retrieve a specific goal with all details including milestones and progress',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Goal retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        timeframe: { type: 'string' },
        targetValue: { type: 'string' },
        currentValue: { type: 'string' },
        unit: { type: 'string' },
        status: { type: 'string' },
        priority: { type: 'string' },
        progressPercentage: { type: 'string' },
        isCompleted: { type: 'boolean' },
        milestones: { type: 'array' },
        progress: { type: 'array' },
        comments: { type: 'array' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this goal' })
  async getGoalById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: BetterAuthUser) {
    return this.goalsService.getGoalById(id, user.id);
  }

  @Put(':id')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 updates per minute
  @ApiOperation({
    summary: 'Update goal',
    description: 'Update an existing goal with new data',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Goal updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string' },
        priority: { type: 'string' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid goal update data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  async updateGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGoalDto: UpdateGoalDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.updateGoal(id, user.id, updateGoalDto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 deletions per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete goal',
    description: 'Delete an existing goal and all related data',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Goal deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  async deleteGoal(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: BetterAuthUser) {
    return this.goalsService.deleteGoal(id, user.id);
  }

  @Post(':id/progress')
  @Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 progress updates per minute
  @ApiOperation({
    summary: 'Add progress to goal',
    description: 'Add a progress entry to a goal, updating the overall progress',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Progress added successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        goalId: { type: 'string', format: 'uuid' },
        value: { type: 'string' },
        note: { type: 'string' },
        source: { type: 'string' },
        recordedAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid progress data or goal is completed',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  async addProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() progressDto: GoalProgressDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.addProgress(id, user.id, progressDto);
  }

  @Post(':id/share')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 shares per minute
  @ApiOperation({
    summary: 'Share goal with another user',
    description: 'Share a goal with another user with specified permissions',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Goal shared successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        goalId: { type: 'string', format: 'uuid' },
        sharedWithUserId: { type: 'string', format: 'uuid' },
        sharedByUserId: { type: 'string', format: 'uuid' },
        permission: { type: 'string', enum: ['view', 'comment', 'edit'] },
        status: { type: 'string', enum: ['pending', 'accepted', 'declined'] },
        inviteMessage: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid sharing data or goal is private',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  async shareGoal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() shareDto: ShareGoalDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.shareGoal(id, user.id, shareDto);
  }

  @Post(':id/comments')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 comments per minute
  @ApiOperation({
    summary: 'Add comment to goal',
    description: 'Add a comment to a goal (requires access to the goal)',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Comment added successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        goalId: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        content: { type: 'string' },
        parentCommentId: { type: 'string', format: 'uuid' },
        isEdited: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid comment data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this goal' })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() commentDto: GoalCommentDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.addComment(id, user.id, commentDto);
  }

  @Get(':id/comments')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @ApiOperation({
    summary: 'Get goal comments',
    description: 'Retrieve comments for a goal (requires access to the goal)',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of comments to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of comments to skip',
  })
  @ApiOkResponse({
    description: 'Comments retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          comment: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              content: { type: 'string' },
              parentCommentId: { type: 'string', format: 'uuid' },
              isEdited: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              avatarUrl: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  @ApiForbiddenResponse({ description: 'Access denied to this goal' })
  async getComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.getComments(id, user.id, limit, offset);
  }

  @Post(':id/reminders')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 reminders per minute
  @ApiOperation({
    summary: 'Add reminder to goal',
    description: 'Add a custom reminder for a goal',
  })
  @ApiParam({
    name: 'id',
    description: 'Goal ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Reminder added successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        goalId: { type: 'string', format: 'uuid' },
        type: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
        scheduledFor: { type: 'string', format: 'date-time' },
        isRecurring: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid reminder data' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @ApiNotFoundResponse({ description: 'Goal not found' })
  async addReminder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reminderDto: GoalReminderDto,
    @CurrentUser() user: BetterAuthUser,
  ) {
    return this.goalsService.addReminder(id, user.id, reminderDto);
  }
}
