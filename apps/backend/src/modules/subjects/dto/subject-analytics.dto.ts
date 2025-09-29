import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsIn } from 'class-validator';

export class SubjectAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start date for analytics (ISO date)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'End date for analytics (ISO date)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'week',
    description: 'Time window for analytics',
    enum: ['week', 'month', 'quarter', 'year'],
  })
  @IsOptional()
  @IsIn(['week', 'month', 'quarter', 'year'])
  window?: 'week' | 'month' | 'quarter' | 'year';
}

export class SubjectPerformanceMetrics {
  @ApiProperty({ example: 120, description: 'Total focused minutes' })
  totalFocusedMinutes: number;

  @ApiProperty({ example: 85, description: 'Task completion rate percentage' })
  completionRate: number;

  @ApiProperty({ example: 15, description: 'Number of completed tasks' })
  completedTasks: number;

  @ApiProperty({ example: 3, description: 'Number of pending tasks' })
  pendingTasks: number;

  @ApiProperty({ example: 8, description: 'Number of focus sessions' })
  sessionsCount: number;

  @ApiProperty({
    example: 15,
    description: 'Average session duration in minutes',
  })
  averageSessionDuration: number;

  @ApiProperty({
    example: '2024-01-20T10:30:00Z',
    description: 'Last study session date',
  })
  lastStudiedAt: string | null;

  @ApiProperty({ example: 3, description: 'Current study streak in days' })
  currentStreak: number;
}

export class SubjectAnalyticsResponse {
  @ApiProperty({
    type: SubjectPerformanceMetrics,
    description: 'Performance metrics',
  })
  metrics: SubjectPerformanceMetrics;

  @ApiProperty({
    example: [
      { date: '2024-01-15', minutes: 45 },
      { date: '2024-01-16', minutes: 30 },
    ],
    description: 'Daily focus time data',
  })
  dailyFocusTime: Array<{ date: string; minutes: number }>;

  @ApiProperty({
    example: [
      { week: '2024-W01', completed: 5, total: 7 },
      { week: '2024-W02', completed: 8, total: 10 },
    ],
    description: 'Weekly task completion data',
  })
  weeklyCompletion: Array<{ week: string; completed: number; total: number }>;

  @ApiProperty({
    example: {
      thisWeek: 120,
      lastWeek: 90,
      change: 33.3,
    },
    description: 'Week-over-week comparison',
  })
  weeklyComparison: {
    thisWeek: number;
    lastWeek: number;
    change: number; // percentage change
  };
}

export class SubjectDistributionData {
  @ApiProperty({ example: 'mathematics', description: 'Subject name' })
  subjectName: string;

  @ApiProperty({ example: '#4F46E5', description: 'Subject color' })
  color: string;

  @ApiProperty({ example: 120, description: 'Minutes studied' })
  minutes: number;

  @ApiProperty({ example: 35.5, description: 'Percentage of total study time' })
  percentage: number;
}
