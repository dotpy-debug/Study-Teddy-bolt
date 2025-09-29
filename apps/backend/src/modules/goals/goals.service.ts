import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoalsRepository } from './goals.repository';
import { CacheService } from '../../common/cache/cache.service';
import { AIService } from '../ai/ai.service';
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
  GoalTypeEnum,
  GoalCategoryEnum,
  GoalTimeframeEnum,
  GoalStatusEnum,
} from './dto/goals.dto';

interface GoalSuggestion {
  title: string;
  description: string;
  type: GoalTypeEnum;
  category: GoalCategoryEnum;
  timeframe: GoalTimeframeEnum;
  targetValue: number;
  unit: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reasoning: string;
  milestones?: Array<{
    title: string;
    description: string;
    targetPercentage: number;
    order: number;
  }>;
}

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    private readonly goalsRepository: GoalsRepository,
    private readonly cacheService: CacheService,
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
  ) {}

  async createGoal(userId: string, createGoalDto: CreateGoalDto) {
    try {
      // Validate timeframe and dates
      this.validateGoalDates(createGoalDto);

      // If created from template, increment usage
      if (createGoalDto.templateId) {
        await this.goalsRepository.incrementTemplateUsage(
          createGoalDto.templateId,
        );
      }

      // Create recurring goal instances if needed
      if (createGoalDto.isRecurring && createGoalDto.recurrencePattern) {
        return await this.createRecurringGoal(userId, createGoalDto);
      }

      const goal = await this.goalsRepository.create(userId, createGoalDto);

      // Invalidate cache
      await this.invalidateUserGoalsCache(userId);

      // Create automatic reminders
      await this.createAutoReminders(goal.id, createGoalDto);

      this.logger.log(`Goal created: ${goal.id} for user: ${userId}`);
      return goal;
    } catch (error) {
      this.logger.error('Error creating goal:', error);
      throw error;
    }
  }

  async getGoals(userId: string, query: GoalQueryDto) {
    const cacheKey = this.cacheService.generateKey(
      'user_goals',
      userId,
      JSON.stringify(query),
    );

    return await this.cacheService.warm(
      cacheKey,
      async () => {
        return await this.goalsRepository.findAll(userId, query);
      },
      300, // 5 minutes cache
    );
  }

  async getGoalById(id: string, userId: string) {
    const goal = await this.goalsRepository.findByIdWithDetails(id, userId);

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check if user has access to this goal
    if (goal.userId !== userId) {
      // Check if goal is shared with user
      const sharedGoals = await this.goalsRepository.getSharedGoals(userId);
      const hasAccess = sharedGoals.some((sg) => sg.goal.id === id);

      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this goal');
      }
    }

    return goal;
  }

  async updateGoal(id: string, userId: string, updateGoalDto: UpdateGoalDto) {
    const existingGoal = await this.goalsRepository.findById(id, userId);

    if (!existingGoal) {
      throw new NotFoundException('Goal not found');
    }

    // Validate dates if provided
    if (
      updateGoalDto.startDate ||
      updateGoalDto.endDate ||
      updateGoalDto.customEndDate
    ) {
      this.validateGoalDates({
        ...existingGoal,
        ...updateGoalDto,
      } as CreateGoalDto);
    }

    const updatedGoal = await this.goalsRepository.update(
      id,
      userId,
      updateGoalDto,
    );

    // Invalidate cache
    await this.invalidateUserGoalsCache(userId);

    this.logger.log(`Goal updated: ${id} for user: ${userId}`);
    return updatedGoal;
  }

  async deleteGoal(id: string, userId: string) {
    const goal = await this.goalsRepository.findById(id, userId);

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    await this.goalsRepository.delete(id, userId);

    // Invalidate cache
    await this.invalidateUserGoalsCache(userId);

    this.logger.log(`Goal deleted: ${id} for user: ${userId}`);
    return { message: 'Goal deleted successfully' };
  }

  async addProgress(
    goalId: string,
    userId: string,
    progressDto: GoalProgressDto,
  ) {
    const goal = await this.goalsRepository.findById(goalId, userId);

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.isCompleted) {
      throw new BadRequestException('Cannot add progress to completed goal');
    }

    const progressEntry = await this.goalsRepository.addProgress(
      goalId,
      userId,
      progressDto,
    );

    // Check for milestone completions
    await this.checkMilestoneCompletions(goalId);

    // Invalidate cache
    await this.invalidateUserGoalsCache(userId);

    this.logger.log(`Progress added to goal: ${goalId} for user: ${userId}`);
    return progressEntry;
  }

  async shareGoal(goalId: string, userId: string, shareDto: ShareGoalDto) {
    const goal = await this.goalsRepository.findById(goalId, userId);

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.sharingType === 'private') {
      throw new BadRequestException(
        'This goal is private and cannot be shared',
      );
    }

    const sharing = await this.goalsRepository.shareGoal(
      goalId,
      userId,
      shareDto,
    );

    // TODO: Send notification to shared user
    // await this.notificationService.sendGoalSharingNotification(shareDto.sharedWithUserId, goal, shareDto.inviteMessage);

    this.logger.log(
      `Goal shared: ${goalId} with user: ${shareDto.sharedWithUserId}`,
    );
    return sharing;
  }

  async getSharedGoals(userId: string) {
    return await this.goalsRepository.getSharedGoals(userId);
  }

  async addComment(goalId: string, userId: string, commentDto: GoalCommentDto) {
    // Verify user has access to this goal
    await this.getGoalById(goalId, userId);

    const comment = await this.goalsRepository.addComment(
      goalId,
      userId,
      commentDto,
    );

    this.logger.log(`Comment added to goal: ${goalId} by user: ${userId}`);
    return comment;
  }

  async getComments(goalId: string, userId: string, limit = 50, offset = 0) {
    // Verify user has access to this goal
    await this.getGoalById(goalId, userId);

    return await this.goalsRepository.getComments(goalId, limit, offset);
  }

  async addReminder(
    goalId: string,
    userId: string,
    reminderDto: GoalReminderDto,
  ) {
    const goal = await this.goalsRepository.findById(goalId, userId);

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const reminder = await this.goalsRepository.addReminder(
      goalId,
      reminderDto,
    );

    this.logger.log(`Reminder added to goal: ${goalId} for user: ${userId}`);
    return reminder;
  }

  async createTemplate(userId: string, templateDto: CreateGoalTemplateDto) {
    const template = await this.goalsRepository.createTemplate(
      userId,
      templateDto,
    );

    this.logger.log(`Goal template created: ${template.id} by user: ${userId}`);
    return template;
  }

  async getTemplates(isPublic = true, userId?: string, limit = 50, offset = 0) {
    const cacheKey = this.cacheService.generateKey(
      'goal_templates',
      isPublic.toString(),
      userId || 'all',
    );

    return await this.cacheService.warm(
      cacheKey,
      async () => {
        return await this.goalsRepository.getTemplates(
          isPublic,
          userId,
          limit,
          offset,
        );
      },
      3600, // 1 hour cache for templates
    );
  }

  async getAnalytics(userId: string, query: GoalAnalyticsQueryDto) {
    const cacheKey = this.cacheService.generateKey(
      'goal_analytics',
      userId,
      JSON.stringify(query),
    );

    return await this.cacheService.warm(
      cacheKey,
      async () => {
        const analytics = await this.goalsRepository.getGoalAnalytics(
          userId,
          query,
        );

        // Add additional insights
        const overdueGoals = await this.goalsRepository.getOverdueGoals(userId);
        const streaks = await this.goalsRepository.getUserGoalStreaks(userId);

        return {
          ...analytics,
          insights: {
            overdueGoals: overdueGoals.length,
            currentStreak: this.calculateCurrentStreak(streaks),
            longestStreak: this.calculateLongestStreak(streaks),
            recommendations: await this.generateRecommendations(
              userId,
              analytics,
            ),
          },
        };
      },
      600, // 10 minutes cache for analytics
    );
  }

  async getSuggestions(
    userId: string,
    suggestionDto: GoalSuggestionDto,
  ): Promise<GoalSuggestion[]> {
    try {
      // Get user's goal history and preferences
      const userGoals = await this.goalsRepository.findAll(userId, {
        limit: 100,
      });
      const analytics = await this.goalsRepository.getGoalAnalytics(userId, {});

      // Build AI prompt for goal suggestions
      const prompt = this.buildSuggestionPrompt(
        userGoals.goals,
        analytics,
        suggestionDto,
      );

      // Get AI suggestions
      const aiResponse = await this.aiService.askQuestion(
        { message: prompt },
        userId,
      );

      // Parse AI response into structured suggestions
      const suggestions = this.parseAISuggestions(aiResponse.response);

      this.logger.log(
        `Generated ${suggestions.length} goal suggestions for user: ${userId}`,
      );
      return suggestions;
    } catch (error) {
      this.logger.error('Error generating goal suggestions:', error);

      // Fallback to template-based suggestions
      return await this.getFallbackSuggestions(suggestionDto);
    }
  }

  // Cron job to process overdue goals
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processOverdueGoals() {
    this.logger.log('Processing overdue goals...');

    try {
      // This would need to be implemented to get all users' overdue goals
      // For now, we'll leave this as a placeholder
      this.logger.log('Overdue goals processing completed');
    } catch (error) {
      this.logger.error('Error processing overdue goals:', error);
    }
  }

  // Cron job to send goal reminders
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendGoalReminders() {
    try {
      const pendingReminders = await this.goalsRepository.getPendingReminders();

      for (const reminder of pendingReminders) {
        try {
          // TODO: Send notification
          // await this.notificationService.sendGoalReminder(reminder);

          await this.goalsRepository.markReminderSent(reminder.id);
          this.logger.log(`Reminder sent: ${reminder.id}`);
        } catch (error) {
          this.logger.error(`Failed to send reminder ${reminder.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error sending goal reminders:', error);
    }
  }

  // Private helper methods
  private validateGoalDates(goalDto: CreateGoalDto) {
    const startDate = new Date(goalDto.startDate);
    const now = new Date();

    // Allow past start dates for existing goals
    if (startDate < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
      // More than 1 day in the past
      throw new BadRequestException(
        'Start date cannot be more than 1 day in the past',
      );
    }

    if (goalDto.timeframe === GoalTimeframeEnum.CUSTOM) {
      if (!goalDto.customEndDate) {
        throw new BadRequestException(
          'Custom end date is required for custom timeframe',
        );
      }

      const customEndDate = new Date(goalDto.customEndDate);
      if (customEndDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    if (goalDto.endDate) {
      const endDate = new Date(goalDto.endDate);
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }
  }

  private async createRecurringGoal(
    userId: string,
    createGoalDto: CreateGoalDto,
  ) {
    const { recurrencePattern } = createGoalDto;
    if (!recurrencePattern) {
      throw new BadRequestException(
        'Recurrence pattern is required for recurring goals',
      );
    }

    // Create the main recurring goal (template)
    const mainGoal = await this.goalsRepository.create(userId, {
      ...createGoalDto,
      isTemplate: true,
    });

    // Create first instance
    const firstInstance = await this.goalsRepository.create(userId, {
      ...createGoalDto,
      parentGoalId: mainGoal.id,
      isRecurring: false,
      recurrencePattern: undefined,
    });

    // TODO: Schedule creation of future instances based on recurrence pattern

    return { mainGoal, firstInstance };
  }

  private async createAutoReminders(goalId: string, goalDto: CreateGoalDto) {
    const reminders = [];

    // Create deadline reminder (if goal has end date)
    if (goalDto.endDate || goalDto.customEndDate) {
      const endDate = new Date(goalDto.endDate || goalDto.customEndDate!);
      const reminderDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before

      if (reminderDate > new Date()) {
        reminders.push({
          type: 'deadline',
          title: 'Goal deadline approaching',
          message: `Your goal "${goalDto.title}" is due tomorrow`,
          scheduledFor: reminderDate.toISOString(),
        });
      }
    }

    // Create progress check reminders based on timeframe
    const progressReminder = this.getProgressReminderSchedule(goalDto);
    if (progressReminder) {
      reminders.push(progressReminder);
    }

    // Add reminders to database
    for (const reminder of reminders) {
      await this.goalsRepository.addReminder(goalId, reminder);
    }
  }

  private getProgressReminderSchedule(goalDto: CreateGoalDto) {
    const startDate = new Date(goalDto.startDate);
    let reminderDate: Date;

    switch (goalDto.timeframe) {
      case GoalTimeframeEnum.DAILY:
        // No progress reminders for daily goals
        return null;
      case GoalTimeframeEnum.WEEKLY:
        reminderDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days after start
        break;
      case GoalTimeframeEnum.MONTHLY:
        reminderDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks after start
        break;
      case GoalTimeframeEnum.QUARTERLY:
        reminderDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month after start
        break;
      case GoalTimeframeEnum.YEARLY:
        reminderDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months after start
        break;
      default:
        return null;
    }

    if (reminderDate > new Date()) {
      return {
        type: 'progress_check',
        title: 'Goal progress check',
        message: `How are you progressing with your goal "${goalDto.title}"?`,
        scheduledFor: reminderDate.toISOString(),
        isRecurring: true,
        recurrencePattern: {
          frequency: 'weekly' as const,
          interval: 1,
        },
      };
    }

    return null;
  }

  private async checkMilestoneCompletions(goalId: string) {
    const milestones = await this.goalsRepository.getMilestones(goalId);
    const goal = await this.goalsRepository.findById(goalId, ''); // We'll need to pass userId properly

    if (!goal || milestones.length === 0) return;

    const currentProgress = parseFloat(goal.progressPercentage);

    for (const milestone of milestones) {
      if (!milestone.isCompleted) {
        const milestoneProgress =
          (parseFloat(milestone.targetValue) / parseFloat(goal.targetValue)) *
          100;

        if (currentProgress >= milestoneProgress) {
          await this.goalsRepository.updateMilestone(milestone.id, true);

          // TODO: Send milestone completion notification
          this.logger.log(
            `Milestone completed: ${milestone.id} for goal: ${goalId}`,
          );
        }
      }
    }
  }

  private calculateCurrentStreak(completedGoals: any[]): number {
    if (completedGoals.length === 0) return 0;

    // Sort by completion date (most recent first)
    const sortedGoals = completedGoals.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const goal of sortedGoals) {
      const goalDate = new Date(goal.completedAt);
      goalDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (currentDate.getTime() - goalDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff <= 1) {
        // Within 1 day
        streak++;
        currentDate = goalDate;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateLongestStreak(completedGoals: any[]): number {
    if (completedGoals.length === 0) return 0;

    // Group goals by completion date
    const goalsByDate = new Map<string, number>();

    for (const goal of completedGoals) {
      const dateKey = new Date(goal.completedAt).toISOString().split('T')[0];
      goalsByDate.set(dateKey, (goalsByDate.get(dateKey) || 0) + 1);
    }

    const dates = Array.from(goalsByDate.keys()).sort();
    let longestStreak = 0;
    let currentStreak = 0;

    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = new Date(dates[i - 1]);
        const currentDate = new Date(dates[i]);
        const daysDiff = Math.floor(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDiff === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }

    return Math.max(longestStreak, currentStreak);
  }

  private async generateRecommendations(
    userId: string,
    analytics: any,
  ): Promise<string[]> {
    const recommendations = [];

    // Based on completion rate
    if (analytics.summary.averageCompletionRate < 50) {
      recommendations.push(
        'Consider setting more achievable goals or breaking down large goals into smaller milestones',
      );
    }

    // Based on overdue goals
    const overdueGoals = await this.goalsRepository.getOverdueGoals(userId);
    if (overdueGoals.length > 0) {
      recommendations.push(
        'You have overdue goals. Consider reviewing and updating their deadlines or breaking them down',
      );
    }

    // Based on goal distribution
    const totalGoals = analytics.summary.totalGoals;
    if (totalGoals < 3) {
      recommendations.push(
        'Consider setting more goals to build a consistent habit of goal achievement',
      );
    }

    return recommendations;
  }

  private buildSuggestionPrompt(
    userGoals: any[],
    analytics: any,
    suggestionDto: GoalSuggestionDto,
  ): string {
    const goalTypes = userGoals.map((g) => g.type).join(', ');
    const categories = userGoals.map((g) => g.category).join(', ');
    const completionRate = analytics.summary?.averageCompletionRate || 0;

    return `Based on the following user data, suggest ${suggestionDto.count || 5} personalized study goals:

User's Goal History:
- Previous goal types: ${goalTypes}
- Previous categories: ${categories}
- Average completion rate: ${completionRate}%
- Total goals created: ${userGoals.length}

User Preferences:
${suggestionDto.preferences ? JSON.stringify(suggestionDto.preferences, null, 2) : 'No specific preferences provided'}

Please provide goal suggestions in the following JSON format:
[
  {
    "title": "Goal title",
    "description": "Detailed description",
    "type": "study_time|tasks_completed|sessions_count|focus_score|streak|grade",
    "category": "academic|personal|productivity|health",
    "timeframe": "daily|weekly|monthly|quarterly|yearly",
    "targetValue": 25,
    "unit": "hours",
    "difficulty": "easy|medium|hard",
    "reasoning": "Why this goal is suggested for the user",
    "milestones": [
      {
        "title": "Milestone title",
        "description": "Milestone description",
        "targetPercentage": 25,
        "order": 1
      }
    ]
  }
]

Focus on goals that:
1. Match the user's historical preferences and performance
2. Are achievable based on their completion rate
3. Progressively challenge the user
4. Align with their stated preferences
5. Fill gaps in their goal categories or types`;
  }

  private parseAISuggestions(aiResponse: string): GoalSuggestion[] {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const suggestions = JSON.parse(jsonMatch[0]);

      // Validate and sanitize suggestions
      return suggestions
        .filter(
          (suggestion: any) =>
            suggestion.title &&
            suggestion.type &&
            suggestion.category &&
            suggestion.timeframe &&
            suggestion.targetValue > 0,
        )
        .slice(0, 10); // Limit to 10 suggestions
    } catch (error) {
      this.logger.error('Error parsing AI suggestions:', error);
      return [];
    }
  }

  private async getFallbackSuggestions(
    suggestionDto: GoalSuggestionDto,
  ): Promise<GoalSuggestion[]> {
    // Provide fallback template-based suggestions
    const fallbackSuggestions: GoalSuggestion[] = [
      {
        title: 'Daily Study Time Goal',
        description: 'Dedicate consistent time to studying each day',
        type: GoalTypeEnum.STUDY_TIME,
        category: GoalCategoryEnum.ACADEMIC,
        timeframe: GoalTimeframeEnum.DAILY,
        targetValue: 2,
        unit: 'hours',
        difficulty: 'medium',
        reasoning:
          'Building a daily study habit is fundamental for academic success',
        milestones: [
          {
            title: 'Complete 1 hour',
            description: 'First milestone',
            targetPercentage: 50,
            order: 1,
          },
        ],
      },
      {
        title: 'Weekly Focus Sessions',
        description: 'Complete focused study sessions without distractions',
        type: GoalTypeEnum.SESSIONS_COUNT,
        category: GoalCategoryEnum.PRODUCTIVITY,
        timeframe: GoalTimeframeEnum.WEEKLY,
        targetValue: 5,
        unit: 'sessions',
        difficulty: 'easy',
        reasoning: 'Focused sessions improve learning efficiency and retention',
      },
    ];

    return fallbackSuggestions.slice(0, suggestionDto.count || 5);
  }

  private async invalidateUserGoalsCache(userId: string) {
    const patterns = [`user_goals:${userId}:*`, `goal_analytics:${userId}:*`];

    for (const pattern of patterns) {
      await this.cacheService.delPattern(pattern);
    }
  }
}
