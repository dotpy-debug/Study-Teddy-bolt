import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, TimeRangeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get comprehensive analytics',
    description: 'Get overall analytics and insights for the user',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
  })
  async getAnalytics(
    @CurrentUser() userId: string,
    @Query() query: TimeRangeDto,
  ) {
    return this.analyticsService.getComprehensiveAnalytics(userId, query);
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get analytics overview',
    description: 'Get a high-level overview of user performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Overview retrieved successfully',
  })
  async getOverview(@CurrentUser() userId: string) {
    return this.analyticsService.getOverview(userId);
  }

  @Get('productivity')
  @ApiOperation({
    summary: 'Get productivity analytics',
    description: 'Get detailed productivity metrics and trends',
  })
  @ApiQuery({ type: AnalyticsQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Productivity analytics retrieved successfully',
  })
  async getProductivityAnalytics(
    @CurrentUser() userId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getProductivityAnalytics(userId, query);
  }

  @Get('subjects')
  @ApiOperation({
    summary: 'Get subject-wise analytics',
    description: 'Get analytics broken down by subject',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Subject analytics retrieved successfully',
  })
  async getSubjectAnalytics(
    @CurrentUser() userId: string,
    @Query() query: TimeRangeDto,
  ) {
    return this.analyticsService.getSubjectAnalytics(userId, query);
  }

  @Get('subjects/:subjectId')
  @ApiOperation({
    summary: 'Get specific subject analytics',
    description: 'Get detailed analytics for a specific subject',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Subject analytics retrieved successfully',
  })
  async getSpecificSubjectAnalytics(
    @CurrentUser() userId: string,
    @Param('subjectId') subjectId: string,
    @Query() query: TimeRangeDto,
  ) {
    return this.analyticsService.getSpecificSubjectAnalytics(
      userId,
      subjectId,
      query,
    );
  }

  @Get('time-distribution')
  @ApiOperation({
    summary: 'Get time distribution analytics',
    description: 'Analyze how time is distributed across tasks and subjects',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Time distribution retrieved successfully',
  })
  async getTimeDistribution(
    @CurrentUser() userId: string,
    @Query() query: TimeRangeDto,
  ) {
    return this.analyticsService.getTimeDistribution(userId, query);
  }

  @Get('focus-patterns')
  @ApiOperation({
    summary: 'Get focus pattern analytics',
    description: 'Analyze focus patterns and optimal study times',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Focus patterns retrieved successfully',
  })
  async getFocusPatterns(
    @CurrentUser() userId: string,
    @Query() query: TimeRangeDto,
  ) {
    return this.analyticsService.getFocusPatterns(userId, query);
  }

  @Get('completion-rates')
  @ApiOperation({
    summary: 'Get task completion rates',
    description: 'Analyze task completion rates and trends',
  })
  @ApiQuery({ type: AnalyticsQueryDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Completion rates retrieved successfully',
  })
  async getCompletionRates(
    @CurrentUser() userId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getCompletionRates(userId, query);
  }

  @Get('streaks')
  @ApiOperation({
    summary: 'Get streak analytics',
    description: 'Get study streak information and history',
  })
  @ApiResponse({
    status: 200,
    description: 'Streak analytics retrieved successfully',
  })
  async getStreakAnalytics(@CurrentUser() userId: string) {
    return this.analyticsService.getStreakAnalytics(userId);
  }

  @Get('goals')
  @ApiOperation({
    summary: 'Get goal completion analytics',
    description: 'Analyze goal setting and completion patterns',
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Goal analytics retrieved successfully',
  })
  async getGoalAnalytics(
    @CurrentUser() userId: string,
    @Query() query: TimeRangeDto,
  ) {
    return this.analyticsService.getGoalAnalytics(userId, query);
  }

  @Get('insights')
  @ApiOperation({
    summary: 'Get AI-powered insights',
    description: 'Get personalized AI-powered insights and recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Insights retrieved successfully',
  })
  async getInsights(@CurrentUser() userId: string) {
    return this.analyticsService.getAIInsights(userId);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export analytics data',
    description: 'Export analytics data in various formats',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv', 'pdf'],
    required: false,
  })
  @ApiQuery({ type: TimeRangeDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Analytics data exported successfully',
  })
  async exportAnalytics(
    @CurrentUser() userId: string,
    @Query('format') format: string = 'json',
    @Query() query: TimeRangeDto,
  ) {
    return this.analyticsService.exportAnalytics(userId, format, query);
  }

  @Get('comparisons')
  @ApiOperation({
    summary: 'Get comparative analytics',
    description: 'Compare performance across different time periods',
  })
  @ApiQuery({
    name: 'period1Start',
    required: true,
    type: String,
    description: 'Start date of first period (ISO 8601)',
  })
  @ApiQuery({
    name: 'period1End',
    required: true,
    type: String,
    description: 'End date of first period (ISO 8601)',
  })
  @ApiQuery({
    name: 'period2Start',
    required: true,
    type: String,
    description: 'Start date of second period (ISO 8601)',
  })
  @ApiQuery({
    name: 'period2End',
    required: true,
    type: String,
    description: 'End date of second period (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparative analytics retrieved successfully',
  })
  async getComparativeAnalytics(
    @CurrentUser() userId: string,
    @Query('period1Start') period1Start: string,
    @Query('period1End') period1End: string,
    @Query('period2Start') period2Start: string,
    @Query('period2End') period2End: string,
  ) {
    return this.analyticsService.comparePerformance(
      userId,
      { start: period1Start, end: period1End },
      { start: period2Start, end: period2End },
    );
  }
}
