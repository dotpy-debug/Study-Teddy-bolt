import { Injectable, Logger } from '@nestjs/common';
import { and, eq, desc, asc, like, ilike, or, gte, lte, inArray, sql, isNull } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import {
  goals,
  goalMilestones,
  goalProgress,
  goalTemplates,
  goalSharing,
  goalComments,
  goalReminders,
} from '../../db/schema/goals.schema';
import { users } from '../../db/schema/users.schema';
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
} from './dto/goals.dto';

@Injectable()
export class GoalsRepository {
  private readonly logger = new Logger(GoalsRepository.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  async create(userId: string, createGoalDto: CreateGoalDto) {
    const { milestones, ...goalData } = createGoalDto;

    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        // Create the goal
        const [goal] = await tx
          .insert(goals)
          .values({
            ...goalData,
            userId,
            currentValue: '0',
            progressPercentage: '0',
          })
          .returning();

        // Create milestones if provided
        if (milestones && milestones.length > 0) {
          await tx.insert(goalMilestones).values(
            milestones.map((milestone) => ({
              ...milestone,
              goalId: goal.id,
              targetValue: milestone.targetValue.toString(),
            })),
          );
        }

        return goal;
      });
    } catch (error) {
      this.logger.error('Error creating goal:', error);
      throw error;
    }
  }

  async findAll(userId: string, query: GoalQueryDto) {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      status,
      timeframe,
      search,
      tags,
      includeCompleted = false,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const offset = (page - 1) * limit;
    const conditions = [eq(goals.userId, userId)];

    // Apply filters
    if (type) conditions.push(eq(goals.type, type));
    if (category) conditions.push(eq(goals.category, category));
    if (status) conditions.push(eq(goals.status, status));
    if (timeframe) conditions.push(eq(goals.timeframe, timeframe));
    if (!includeCompleted) conditions.push(eq(goals.isCompleted, false));

    if (search) {
      conditions.push(
        or(ilike(goals.title, `%${search}%`), ilike(goals.description, `%${search}%`)),
      );
    }

    if (tags) {
      const tagArray = tags.split(',').map((tag) => tag.trim());
      conditions.push(sql`${goals.tags} ?| array[${tagArray.map((tag) => `'${tag}'`).join(',')}]`);
    }

    const orderBy = sortOrder === 'desc' ? desc(goals[sortBy]) : asc(goals[sortBy]);

    try {
      const [result, totalResult] = await Promise.all([
        this.drizzleService.db
          .select({
            id: goals.id,
            title: goals.title,
            description: goals.description,
            type: goals.type,
            category: goals.category,
            timeframe: goals.timeframe,
            targetValue: goals.targetValue,
            currentValue: goals.currentValue,
            unit: goals.unit,
            startDate: goals.startDate,
            endDate: goals.endDate,
            customEndDate: goals.customEndDate,
            status: goals.status,
            priority: goals.priority,
            isCompleted: goals.isCompleted,
            completedAt: goals.completedAt,
            progressPercentage: goals.progressPercentage,
            isRecurring: goals.isRecurring,
            recurrencePattern: goals.recurrencePattern,
            parentGoalId: goals.parentGoalId,
            sharingType: goals.sharingType,
            isCollaborative: goals.isCollaborative,
            collaboratorIds: goals.collaboratorIds,
            isTemplate: goals.isTemplate,
            templateId: goals.templateId,
            isAiSuggested: goals.isAiSuggested,
            tags: goals.tags,
            metadata: goals.metadata,
            createdAt: goals.createdAt,
            updatedAt: goals.updatedAt,
          })
          .from(goals)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),

        this.drizzleService.db
          .select({ count: sql<number>`count(*)` })
          .from(goals)
          .where(and(...conditions)),
      ]);

      const total = totalResult[0]?.count || 0;

      return {
        goals: result,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error('Error finding goals:', error);
      throw error;
    }
  }

  async findById(id: string, userId: string) {
    try {
      const result = await this.drizzleService.db
        .select()
        .from(goals)
        .where(and(eq(goals.id, id), eq(goals.userId, userId)))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.logger.error('Error finding goal by ID:', error);
      throw error;
    }
  }

  async findByIdWithDetails(id: string, userId: string) {
    try {
      const [goal, milestones, progressEntries, comments] = await Promise.all([
        this.findById(id, userId),
        this.getMilestones(id),
        this.getProgressEntries(id),
        this.getComments(id),
      ]);

      if (!goal) return null;

      return {
        ...goal,
        milestones,
        progress: progressEntries,
        comments,
      };
    } catch (error) {
      this.logger.error('Error finding goal with details:', error);
      throw error;
    }
  }

  async update(id: string, userId: string, updateGoalDto: UpdateGoalDto) {
    try {
      const [updatedGoal] = await this.drizzleService.db
        .update(goals)
        .set({
          ...updateGoalDto,
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, id), eq(goals.userId, userId)))
        .returning();

      return updatedGoal;
    } catch (error) {
      this.logger.error('Error updating goal:', error);
      throw error;
    }
  }

  async delete(id: string, userId: string) {
    try {
      const [deletedGoal] = await this.drizzleService.db
        .delete(goals)
        .where(and(eq(goals.id, id), eq(goals.userId, userId)))
        .returning();

      return deletedGoal;
    } catch (error) {
      this.logger.error('Error deleting goal:', error);
      throw error;
    }
  }

  async addProgress(goalId: string, userId: string, progressDto: GoalProgressDto) {
    try {
      return await this.drizzleService.db.transaction(async (tx) => {
        // Add progress entry
        const [progressEntry] = await tx
          .insert(goalProgress)
          .values({
            goalId,
            value: progressDto.value.toString(),
            note: progressDto.note,
            source: progressDto.source || 'manual',
            metadata: progressDto.metadata,
          })
          .returning();

        // Update goal's current value and progress percentage
        const goal = await tx
          .select()
          .from(goals)
          .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
          .limit(1);

        if (goal[0]) {
          const currentValue = parseFloat(goal[0].currentValue) + progressDto.value;
          const targetValue = parseFloat(goal[0].targetValue);
          const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);
          const isCompleted = progressPercentage >= 100;

          await tx
            .update(goals)
            .set({
              currentValue: currentValue.toString(),
              progressPercentage: progressPercentage.toString(),
              isCompleted,
              completedAt: isCompleted ? new Date() : null,
              status: isCompleted ? 'completed' : goal[0].status,
              updatedAt: new Date(),
            })
            .where(eq(goals.id, goalId));
        }

        return progressEntry;
      });
    } catch (error) {
      this.logger.error('Error adding goal progress:', error);
      throw error;
    }
  }

  async getProgressEntries(goalId: string, limit = 50, offset = 0) {
    try {
      return await this.drizzleService.db
        .select()
        .from(goalProgress)
        .where(eq(goalProgress.goalId, goalId))
        .orderBy(desc(goalProgress.recordedAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      this.logger.error('Error getting progress entries:', error);
      throw error;
    }
  }

  async getMilestones(goalId: string) {
    try {
      return await this.drizzleService.db
        .select()
        .from(goalMilestones)
        .where(eq(goalMilestones.goalId, goalId))
        .orderBy(asc(goalMilestones.order));
    } catch (error) {
      this.logger.error('Error getting milestones:', error);
      throw error;
    }
  }

  async updateMilestone(milestoneId: string, isCompleted: boolean) {
    try {
      const [updatedMilestone] = await this.drizzleService.db
        .update(goalMilestones)
        .set({
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        })
        .where(eq(goalMilestones.id, milestoneId))
        .returning();

      return updatedMilestone;
    } catch (error) {
      this.logger.error('Error updating milestone:', error);
      throw error;
    }
  }

  async shareGoal(goalId: string, userId: string, shareDto: ShareGoalDto) {
    try {
      // Check if already shared with this user
      const existingShare = await this.drizzleService.db
        .select()
        .from(goalSharing)
        .where(
          and(
            eq(goalSharing.goalId, goalId),
            eq(goalSharing.sharedWithUserId, shareDto.sharedWithUserId),
          ),
        )
        .limit(1);

      if (existingShare.length > 0) {
        throw new Error('Goal already shared with this user');
      }

      const [sharing] = await this.drizzleService.db
        .insert(goalSharing)
        .values({
          goalId,
          sharedWithUserId: shareDto.sharedWithUserId,
          sharedByUserId: userId,
          permission: shareDto.permission,
          inviteMessage: shareDto.inviteMessage,
        })
        .returning();

      return sharing;
    } catch (error) {
      this.logger.error('Error sharing goal:', error);
      throw error;
    }
  }

  async getSharedGoals(userId: string) {
    try {
      return await this.drizzleService.db
        .select({
          goal: goals,
          sharing: goalSharing,
          sharedBy: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(goalSharing)
        .innerJoin(goals, eq(goalSharing.goalId, goals.id))
        .innerJoin(users, eq(goalSharing.sharedByUserId, users.id))
        .where(eq(goalSharing.sharedWithUserId, userId))
        .orderBy(desc(goalSharing.createdAt));
    } catch (error) {
      this.logger.error('Error getting shared goals:', error);
      throw error;
    }
  }

  async addComment(goalId: string, userId: string, commentDto: GoalCommentDto) {
    try {
      const [comment] = await this.drizzleService.db
        .insert(goalComments)
        .values({
          goalId,
          userId,
          content: commentDto.content,
          parentCommentId: commentDto.parentCommentId,
        })
        .returning();

      return comment;
    } catch (error) {
      this.logger.error('Error adding goal comment:', error);
      throw error;
    }
  }

  async getComments(goalId: string, limit = 50, offset = 0) {
    try {
      return await this.drizzleService.db
        .select({
          comment: goalComments,
          user: {
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
          },
        })
        .from(goalComments)
        .innerJoin(users, eq(goalComments.userId, users.id))
        .where(eq(goalComments.goalId, goalId))
        .orderBy(desc(goalComments.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      this.logger.error('Error getting goal comments:', error);
      throw error;
    }
  }

  async addReminder(goalId: string, reminderDto: GoalReminderDto) {
    try {
      const [reminder] = await this.drizzleService.db
        .insert(goalReminders)
        .values({
          goalId,
          type: reminderDto.type,
          title: reminderDto.title,
          message: reminderDto.message,
          scheduledFor: new Date(reminderDto.scheduledFor),
          isRecurring: reminderDto.isRecurring || false,
          recurrencePattern: reminderDto.recurrencePattern,
        })
        .returning();

      return reminder;
    } catch (error) {
      this.logger.error('Error adding goal reminder:', error);
      throw error;
    }
  }

  async getPendingReminders() {
    try {
      const now = new Date();
      return await this.drizzleService.db
        .select()
        .from(goalReminders)
        .where(and(eq(goalReminders.isSent, false), lte(goalReminders.scheduledFor, now)))
        .orderBy(asc(goalReminders.scheduledFor));
    } catch (error) {
      this.logger.error('Error getting pending reminders:', error);
      throw error;
    }
  }

  async markReminderSent(reminderId: string) {
    try {
      await this.drizzleService.db
        .update(goalReminders)
        .set({
          isSent: true,
          sentAt: new Date(),
        })
        .where(eq(goalReminders.id, reminderId));
    } catch (error) {
      this.logger.error('Error marking reminder as sent:', error);
      throw error;
    }
  }

  // Template methods
  async createTemplate(userId: string, templateDto: CreateGoalTemplateDto) {
    try {
      const [template] = await this.drizzleService.db
        .insert(goalTemplates)
        .values({
          ...templateDto,
          defaultTargetValue: templateDto.defaultTargetValue.toString(),
          createdBy: userId,
        })
        .returning();

      return template;
    } catch (error) {
      this.logger.error('Error creating goal template:', error);
      throw error;
    }
  }

  async getTemplates(isPublic = true, userId?: string, limit = 50, offset = 0) {
    try {
      const conditions = [];

      if (isPublic) {
        conditions.push(eq(goalTemplates.isPublic, true));
      }

      if (userId) {
        conditions.push(eq(goalTemplates.createdBy, userId));
      }

      return await this.drizzleService.db
        .select()
        .from(goalTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(goalTemplates.usageCount), desc(goalTemplates.rating))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      this.logger.error('Error getting goal templates:', error);
      throw error;
    }
  }

  async incrementTemplateUsage(templateId: string) {
    try {
      await this.drizzleService.db
        .update(goalTemplates)
        .set({
          usageCount: sql`${goalTemplates.usageCount} + 1`,
        })
        .where(eq(goalTemplates.id, templateId));
    } catch (error) {
      this.logger.error('Error incrementing template usage:', error);
      throw error;
    }
  }

  // Analytics methods
  async getGoalAnalytics(userId: string, query: GoalAnalyticsQueryDto) {
    try {
      const conditions = [eq(goals.userId, userId)];

      if (query.startDate) {
        conditions.push(gte(goals.createdAt, new Date(query.startDate)));
      }

      if (query.endDate) {
        conditions.push(lte(goals.createdAt, new Date(query.endDate)));
      }

      if (query.type) {
        conditions.push(eq(goals.type, query.type));
      }

      if (query.category) {
        conditions.push(eq(goals.category, query.category));
      }

      const [totalGoals, completedGoals, activeGoals, categoryStats, typeStats, averageCompletion] =
        await Promise.all([
          // Total goals count
          this.drizzleService.db
            .select({ count: sql<number>`count(*)` })
            .from(goals)
            .where(and(...conditions)),

          // Completed goals count
          this.drizzleService.db
            .select({ count: sql<number>`count(*)` })
            .from(goals)
            .where(and(...conditions, eq(goals.isCompleted, true))),

          // Active goals count
          this.drizzleService.db
            .select({ count: sql<number>`count(*)` })
            .from(goals)
            .where(and(...conditions, eq(goals.status, 'active'))),

          // Goals by category
          this.drizzleService.db
            .select({
              category: goals.category,
              count: sql<number>`count(*)`,
              completedCount: sql<number>`count(*) filter (where ${goals.isCompleted} = true)`,
            })
            .from(goals)
            .where(and(...conditions))
            .groupBy(goals.category),

          // Goals by type
          this.drizzleService.db
            .select({
              type: goals.type,
              count: sql<number>`count(*)`,
              completedCount: sql<number>`count(*) filter (where ${goals.isCompleted} = true)`,
              averageProgress: sql<number>`avg(cast(${goals.progressPercentage} as decimal))`,
            })
            .from(goals)
            .where(and(...conditions))
            .groupBy(goals.type),

          // Average completion rate
          this.drizzleService.db
            .select({
              averageProgress: sql<number>`avg(cast(${goals.progressPercentage} as decimal))`,
            })
            .from(goals)
            .where(and(...conditions)),
        ]);

      return {
        summary: {
          totalGoals: totalGoals[0]?.count || 0,
          completedGoals: completedGoals[0]?.count || 0,
          activeGoals: activeGoals[0]?.count || 0,
          averageCompletionRate: averageCompletion[0]?.averageProgress || 0,
        },
        categoryBreakdown: categoryStats,
        typeBreakdown: typeStats,
      };
    } catch (error) {
      this.logger.error('Error getting goal analytics:', error);
      throw error;
    }
  }

  async getOverdueGoals(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];

      return await this.drizzleService.db
        .select()
        .from(goals)
        .where(
          and(
            eq(goals.userId, userId),
            eq(goals.isCompleted, false),
            or(lte(goals.endDate, today), lte(goals.customEndDate, today)),
          ),
        )
        .orderBy(asc(goals.endDate));
    } catch (error) {
      this.logger.error('Error getting overdue goals:', error);
      throw error;
    }
  }

  async getUserGoalStreaks(userId: string) {
    try {
      // Get goals completed in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return await this.drizzleService.db
        .select({
          type: goals.type,
          category: goals.category,
          completedAt: goals.completedAt,
        })
        .from(goals)
        .where(
          and(
            eq(goals.userId, userId),
            eq(goals.isCompleted, true),
            gte(goals.completedAt, thirtyDaysAgo),
          ),
        )
        .orderBy(desc(goals.completedAt));
    } catch (error) {
      this.logger.error('Error getting user goal streaks:', error);
      throw error;
    }
  }
}
