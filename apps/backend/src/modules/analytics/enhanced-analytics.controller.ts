import { Controller, Get, Query, UseGuards, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EnhancedAnalyticsService } from './enhanced-analytics.service';
import { NextBestActionService } from './nba.service';
import { TimeRangeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics Dashboard')
@ApiBearerAuth()
@Controller('analytics/dashboard')
@UseGuards(JwtAuthGuard)
export class EnhancedAnalyticsController {
  constructor(
    private readonly enhancedAnalyticsService: EnhancedAnalyticsService,
    private readonly nbaService: NextBestActionService,
  ) {}

  @Get('tiles')
  @ApiOperation({
    summary: 'Get dashboard tiles data',
    description: 'Get data for the four main dashboard tiles',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Dashboard tiles data retrieved successfully',
  })
  async getDashboardTiles(@CurrentUser() userId: string, @Query() query: TimeRangeDto) {
    return this.enhancedAnalyticsService.getDashboardTiles(userId, query);
  }

  @Get('subject-mix')
  @ApiOperation({
    summary: 'Get subject mix analytics',
    description: 'Get subject time distribution for pie chart',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Subject mix data retrieved successfully',
  })
  async getSubjectMix(@CurrentUser() userId: string, @Query() query: TimeRangeDto) {
    return this.enhancedAnalyticsService.getSubjectMixAnalytics(userId, query);
  }

  @Get('trends/:metric')
  @ApiOperation({
    summary: 'Get trend data for a specific metric',
    description: 'Get historical trend data for sparklines and charts',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to include (default: 7)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trend data retrieved successfully',
  })
  async getTrendData(
    @CurrentUser() userId: string,
    @Param('metric') metric: 'studyTime' | 'tasksCompleted' | 'focusScore',
    @Query('days') days: number = 7,
  ) {
    return this.enhancedAnalyticsService.getTrendData(userId, metric, days);
  }

  @Get('advanced')
  @ApiOperation({
    summary: 'Get advanced analytics',
    description: 'Get comprehensive analytics with statistical analysis',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Advanced analytics retrieved successfully',
  })
  async getAdvancedAnalytics(@CurrentUser() userId: string, @Query() query: TimeRangeDto) {
    return this.enhancedAnalyticsService.getAdvancedAnalytics(userId, query);
  }

  @Get('next-best-action')
  @ApiOperation({
    summary: 'Get next best action recommendation',
    description: 'Get AI-powered recommendation for the next best action',
  })
  @ApiResponse({
    status: 200,
    description: 'Next best action retrieved successfully',
  })
  async getNextBestAction(@CurrentUser() userId: string) {
    return this.nbaService.getNextBestAction(userId);
  }

  @Get('action-recommendations')
  @ApiOperation({
    summary: 'Get multiple action recommendations',
    description: 'Get multiple AI-powered action recommendations',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recommendations (default: 3, max: 5)',
  })
  @ApiResponse({
    status: 200,
    description: 'Action recommendations retrieved successfully',
  })
  async getActionRecommendations(@CurrentUser() userId: string, @Query('limit') limit: number = 3) {
    const maxLimit = Math.min(limit, 5);
    return this.nbaService.getActionRecommendations(userId, maxLimit);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export analytics data',
    description: 'Export comprehensive analytics data',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv'],
    required: false,
    description: 'Export format (default: json)',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Analytics data exported successfully',
  })
  async exportAnalytics(
    @CurrentUser() userId: string,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query() query: TimeRangeDto,
  ) {
    return this.enhancedAnalyticsService.exportAnalyticsData(userId, format, query);
  }
}
