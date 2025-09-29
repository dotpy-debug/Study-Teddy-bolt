import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { QueryOptimizerService } from './query-optimizer.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Performance')
@Controller('performance')
@UseGuards(JwtAuthGuard)
export class PerformanceController {
  constructor(private readonly queryOptimizerService: QueryOptimizerService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get query performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getMetrics() {
    return this.queryOptimizerService.getPerformanceMetrics();
  }

  @Get('database-analysis')
  @ApiOperation({ summary: 'Analyze database performance' })
  @ApiResponse({ status: 200, description: 'Database analysis completed' })
  async analyzeDatabasePerformance() {
    return this.queryOptimizerService.analyzeDatabasePerformance();
  }

  @Get('query-analysis')
  @ApiOperation({ summary: 'Analyze common query patterns' })
  @ApiResponse({ status: 200, description: 'Query analysis completed' })
  async analyzeQueries() {
    return this.queryOptimizerService.optimizeCommonQueries();
  }

  @Post('optimize-indexes')
  @ApiOperation({ summary: 'Create recommended database indexes' })
  @ApiResponse({ status: 200, description: 'Index optimization completed' })
  async optimizeIndexes() {
    return this.queryOptimizerService.createRecommendedIndexes();
  }
}
