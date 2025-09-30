import { Controller, Get, Query, UseGuards, ValidationPipe, UsePipes } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import {
  DashboardStatsQueryDto,
  StreakQueryDto,
  WeeklyOverviewQueryDto,
  ActivityQueryDto,
} from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Retrieve comprehensive dashboard statistics for the authenticated user',
  })
  @ApiQuery({ type: DashboardStatsQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        tasksCompleted: { type: 'number' },
        totalTasks: { type: 'number' },
        completionRate: { type: 'number' },
        studyTimeToday: { type: 'number' },
        studyTimeThisWeek: { type: 'number' },
        currentStreak: { type: 'number' },
        longestStreak: { type: 'number' },
        aiMessagesCount: { type: 'number' },
        aiTokensUsed: { type: 'number' },
        productivity: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            trend: { type: 'string', enum: ['up', 'down', 'stable'] },
            factors: { type: 'array', items: { type: 'string' } },
          },
        },
        timeRange: { type: 'string' },
        generatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getStats(@CurrentUser() user: AuthenticatedUser, @Query() query: DashboardStatsQueryDto) {
    return this.dashboardService.getStats(user.userId, query);
  }

  @Get('streak')
  @ApiOperation({
    summary: 'Get user streak information',
    description: 'Retrieve streak information and statistics for the authenticated user',
  })
  @ApiQuery({ type: StreakQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Streak information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        currentStreak: { type: 'number' },
        longestStreak: { type: 'number' },
        streakType: { type: 'string' },
        threshold: { type: 'number' },
        todayCount: { type: 'number' },
        streakHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              count: { type: 'number' },
              metThreshold: { type: 'boolean' },
            },
          },
        },
        nextMilestone: { type: 'number' },
        streakStart: { type: 'string', format: 'date' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getStreak(@CurrentUser() user: AuthenticatedUser, @Query() query: StreakQueryDto) {
    return this.dashboardService.getStreak(user.userId, query);
  }

  @Get('weekly')
  @ApiOperation({
    summary: 'Get weekly overview',
    description: 'Retrieve weekly overview of tasks, study time, and activities',
  })
  @ApiQuery({ type: WeeklyOverviewQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Weekly overview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        weekStartDate: { type: 'string', format: 'date' },
        weekEndDate: { type: 'string', format: 'date' },
        totalTasksCompleted: { type: 'number' },
        totalStudyTime: { type: 'number' },
        dailyBreakdown: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              tasksCompleted: { type: 'number' },
              studyTime: { type: 'number' },
              aiMessages: { type: 'number' },
              productivity: { type: 'number' },
            },
          },
        },
        weeklyGoals: {
          type: 'object',
          properties: {
            tasksTarget: { type: 'number' },
            studyTimeTarget: { type: 'number' },
            tasksProgress: { type: 'number' },
            studyTimeProgress: { type: 'number' },
          },
        },
        comparison: {
          type: 'object',
          properties: {
            previousWeek: {
              type: 'object',
              properties: {
                tasksCompleted: { type: 'number' },
                studyTime: { type: 'number' },
                productivity: { type: 'number' },
              },
            },
            improvement: {
              type: 'object',
              properties: {
                tasks: { type: 'number' },
                studyTime: { type: 'number' },
                productivity: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getWeeklyOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WeeklyOverviewQueryDto,
  ) {
    return this.dashboardService.getWeeklyOverview(user.userId, query);
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Get activity heatmap data',
    description: 'Retrieve activity data for generating heatmap visualizations',
  })
  @ApiQuery({ type: ActivityQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Activity data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        activities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              value: { type: 'number' },
              activityType: { type: 'string' },
              details: {
                type: 'object',
                properties: {
                  tasksCompleted: { type: 'number' },
                  studyTime: { type: 'number' },
                  aiMessages: { type: 'number' },
                  streakDay: { type: 'boolean' },
                },
              },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalDays: { type: 'number' },
            activeDays: { type: 'number' },
            averageActivity: { type: 'number' },
            peakActivity: { type: 'number' },
            mostActiveDay: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getActivity(@CurrentUser() user: AuthenticatedUser, @Query() query: ActivityQueryDto) {
    return this.dashboardService.getActivity(user.userId, query);
  }

  @Get('goals')
  @ApiOperation({
    summary: 'Get user goals and progress',
    description: 'Retrieve user goals and their progress tracking',
  })
  @ApiResponse({
    status: 200,
    description: 'Goals and progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dailyGoals: {
          type: 'object',
          properties: {
            tasks: { type: 'number' },
            studyTime: { type: 'number' },
            aiInteractions: { type: 'number' },
          },
        },
        weeklyGoals: {
          type: 'object',
          properties: {
            tasks: { type: 'number' },
            studyTime: { type: 'number' },
            subjectsStudied: { type: 'number' },
          },
        },
        progress: {
          type: 'object',
          properties: {
            daily: {
              type: 'object',
              properties: {
                tasks: { type: 'number' },
                studyTime: { type: 'number' },
                aiInteractions: { type: 'number' },
              },
            },
            weekly: {
              type: 'object',
              properties: {
                tasks: { type: 'number' },
                studyTime: { type: 'number' },
                subjectsStudied: { type: 'number' },
              },
            },
          },
        },
        achievements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              achieved: { type: 'boolean' },
              achievedAt: { type: 'string', format: 'date-time' },
              progress: { type: 'number' },
              target: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getGoals(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getGoals(user.userId);
  }
}
