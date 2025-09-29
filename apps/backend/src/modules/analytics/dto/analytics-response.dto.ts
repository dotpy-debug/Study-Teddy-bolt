import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductivityMetric {
  @ApiProperty({ description: 'Date of the metric' })
  date: string;

  @ApiProperty({ description: 'Total focus time in minutes' })
  focusTime: number;

  @ApiProperty({ description: 'Number of tasks completed' })
  tasksCompleted: number;

  @ApiProperty({ description: 'Number of study sessions' })
  studySessions: number;

  @ApiProperty({ description: 'Average focus score (0-100)' })
  averageFocusScore: number;
}

export class SubjectAnalytic {
  @ApiProperty({ description: 'Subject ID' })
  subjectId: string;

  @ApiProperty({ description: 'Subject name' })
  subjectName: string;

  @ApiProperty({ description: 'Total study time in minutes' })
  totalStudyTime: number;

  @ApiProperty({ description: 'Number of tasks completed' })
  tasksCompleted: number;

  @ApiProperty({ description: 'Number of study sessions' })
  studySessions: number;

  @ApiProperty({ description: 'Average focus score' })
  averageFocusScore: number;

  @ApiProperty({ description: 'Progress percentage' })
  progressPercentage: number;
}

export class TimeDistribution {
  @ApiProperty({ description: 'Hour of day (0-23)' })
  hour: number;

  @ApiProperty({ description: 'Day of week (0-6, Sunday=0)' })
  dayOfWeek: number;

  @ApiProperty({ description: 'Total minutes studied' })
  totalMinutes: number;

  @ApiProperty({ description: 'Number of sessions' })
  sessionCount: number;

  @ApiProperty({ description: 'Average focus score' })
  averageFocusScore: number;
}

export class CompletionRate {
  @ApiProperty({ description: 'Date' })
  date: string;

  @ApiProperty({ description: 'Total tasks' })
  totalTasks: number;

  @ApiProperty({ description: 'Completed tasks' })
  completedTasks: number;

  @ApiProperty({ description: 'Completion percentage' })
  completionPercentage: number;
}

export class StreakAnalytic {
  @ApiProperty({ description: 'Current streak in days' })
  currentStreak: number;

  @ApiProperty({ description: 'Longest streak in days' })
  longestStreak: number;

  @ApiProperty({ description: 'Total study days' })
  totalStudyDays: number;

  @ApiProperty({ description: 'Streak start date' })
  streakStartDate: string | null;

  @ApiProperty({ description: 'Last study date' })
  lastStudyDate: string | null;
}

export class GoalAnalytic {
  @ApiProperty({ description: 'Goal ID' })
  goalId: string;

  @ApiProperty({ description: 'Goal title' })
  title: string;

  @ApiProperty({ description: 'Goal type' })
  type: string;

  @ApiProperty({ description: 'Target value' })
  targetValue: number;

  @ApiProperty({ description: 'Current value' })
  currentValue: number;

  @ApiProperty({ description: 'Progress percentage' })
  progressPercentage: number;

  @ApiProperty({ description: 'Goal status' })
  status: string;

  @ApiProperty({ description: 'Days until deadline' })
  daysUntilDeadline: number | null;
}

export class AIInsight {
  @ApiProperty({ description: 'Insight title' })
  title: string;

  @ApiProperty({ description: 'Insight description' })
  description: string;

  @ApiProperty({ description: 'Insight type' })
  type: 'suggestion' | 'achievement' | 'warning' | 'tip';

  @ApiProperty({ description: 'Priority level' })
  priority: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ description: 'Action URL' })
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action label' })
  actionLabel?: string;
}

export class AnalyticsOverview {
  @ApiProperty({ description: 'Total study time in minutes' })
  totalStudyTime: number;

  @ApiProperty({ description: 'Total tasks completed' })
  totalTasksCompleted: number;

  @ApiProperty({ description: 'Total study sessions' })
  totalStudySessions: number;

  @ApiProperty({ description: 'Average focus score' })
  averageFocusScore: number;

  @ApiProperty({ description: 'Current streak in days' })
  currentStreak: number;

  @ApiProperty({ description: 'Active goals count' })
  activeGoals: number;

  @ApiProperty({ description: 'Week over week change percentage' })
  weekOverWeekChange: number;
}

export class ComprehensiveAnalyticsResponse {
  @ApiProperty({ description: 'Analytics overview' })
  overview: AnalyticsOverview;

  @ApiProperty({
    description: 'Productivity metrics',
    type: [ProductivityMetric],
  })
  productivityMetrics: ProductivityMetric[];

  @ApiProperty({ description: 'Subject analytics', type: [SubjectAnalytic] })
  subjectAnalytics: SubjectAnalytic[];

  @ApiProperty({ description: 'Time distribution', type: [TimeDistribution] })
  timeDistribution: TimeDistribution[];

  @ApiProperty({ description: 'Completion rates', type: [CompletionRate] })
  completionRates: CompletionRate[];

  @ApiProperty({ description: 'Streak analytics' })
  streakAnalytics: StreakAnalytic;

  @ApiProperty({ description: 'Goal analytics', type: [GoalAnalytic] })
  goalAnalytics: GoalAnalytic[];

  @ApiProperty({ description: 'AI insights', type: [AIInsight] })
  insights: AIInsight[];
}

export class PeriodComparison {
  @ApiProperty({ description: 'Period 1 metrics' })
  period1: AnalyticsOverview;

  @ApiProperty({ description: 'Period 2 metrics' })
  period2: AnalyticsOverview;

  @ApiProperty({ description: 'Change percentages' })
  changes: {
    studyTime: number;
    tasksCompleted: number;
    studySessions: number;
    focusScore: number;
  };
}
