import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { tasks, subjects } from '../../db/schema';
import { eq, and, desc, asc, gte, lte, ilike, or, inArray, count } from 'drizzle-orm';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { CacheService } from '../../common/cache/cache.service';
import { QueryOptimizerService } from '../../common/performance/query-optimizer.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private cacheService: CacheService,
    private queryOptimizerService: QueryOptimizerService,
    private drizzleService: DrizzleService,
  ) {}
  async getUserTasks(userId: string, query?: any) {
    const conditions = [eq(tasks.userId, userId)];

    // Apply filters from query
    if (query?.subject) {
      conditions.push(ilike(tasks.title, `%${query.subject}%`));
    }
    if (query?.priority) {
      conditions.push(eq(tasks.priority, query.priority));
    }
    if (query?.status) {
      conditions.push(eq(tasks.status, query.status));
    }
    if (query?.dueDate) {
      const date = new Date(query.dueDate);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(and(gte(tasks.dueDate, startOfDay), lte(tasks.dueDate, endOfDay)));
    }

    return this.queryOptimizerService.executeWithMetrics(
      () =>
        this.drizzleService.db
          .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
            estimatedMinutes: tasks.estimatedMinutes,
            actualMinutes: tasks.actualMinutes,
            progressPercentage: tasks.progressPercentage,
            aiGenerated: tasks.aiGenerated,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
            subject: {
              id: subjects.id,
              name: subjects.name,
              color: subjects.color,
              icon: subjects.icon,
            },
          })
          .from(tasks)
          .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
          .where(and(...conditions))
          .orderBy(desc(tasks.dueDate)),
      'getUserTasks',
    );
  }

  async getTodaysTasks(userId: string, timezone = 'UTC') {
    const { startOfDay, endOfDay } = this.getDayBoundaries(timezone);

    this.logger.debug(
      `Fetching today's tasks for user ${userId} between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`,
    );

    return this.queryOptimizerService.executeWithMetrics(
      () =>
        this.drizzleService.db
          .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
            estimatedMinutes: tasks.estimatedMinutes,
            actualMinutes: tasks.actualMinutes,
            progressPercentage: tasks.progressPercentage,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
            subject: {
              id: subjects.id,
              name: subjects.name,
              color: subjects.color,
              icon: subjects.icon,
            },
          })
          .from(tasks)
          .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
          .where(
            and(
              eq(tasks.userId, userId),
              or(eq(tasks.status, 'pending'), eq(tasks.status, 'in_progress')),
              gte(tasks.dueDate, startOfDay),
              lte(tasks.dueDate, endOfDay),
            ),
          )
          .orderBy(desc(tasks.dueDate)),
      'getTodaysTasks',
    );
  }

  /**
   * Creates start and end of day boundaries for date filtering
   * @param timezone - Timezone string (currently not fully implemented)
   * @returns Object with startOfDay and endOfDay Date objects
   */
  private getDayBoundaries(timezone = 'UTC') {
    // Create start of day (00:00:00.000)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Create end of day (23:59:59.999)
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // TODO: Implement proper timezone conversion using a library like date-fns-tz
    // For now, using local server timezone as the database timestamps are stored in local time
    // Future enhancement: Convert dates based on user's timezone preference

    return { startOfDay, endOfDay };
  }

  async createTask(userId: string, data: CreateTaskDto) {
    const [task] = await this.drizzleService.db
      .insert(tasks)
      .values({
        userId,
        title: data.title,
        description: data.description,
        subjectId: data.subjectId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority || 'medium',
        status: data.status || 'pending',
        estimatedMinutes: data.estimatedMinutes,
        aiGenerated: data.aiGenerated || false,
        aiMetadata: data.aiMetadata,
      })
      .returning();

    // Invalidate dashboard cache after task creation
    await this.invalidateDashboardCache(userId);

    return task;
  }

  async updateTask(taskId: string, userId: string, data: UpdateTaskDto) {
    const updateData: any = { ...data };
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }
    if (data.status === 'completed' && !data.completedAt) {
      updateData.completedAt = new Date();
    }
    updateData.updatedAt = new Date();

    const [updated] = await this.drizzleService.db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Task not found');
    }

    // Invalidate dashboard cache after task update
    await this.invalidateDashboardCache(userId);

    return updated;
  }

  async deleteTask(taskId: string, userId: string) {
    const deletedRows = await this.drizzleService.db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    if (deletedRows.length === 0) {
      throw new NotFoundException('Task not found');
    }

    // Invalidate dashboard cache after task deletion
    await this.invalidateDashboardCache(userId);

    return { message: 'Task deleted successfully' };
  }

  async toggleTaskCompletion(taskId: string, userId: string) {
    // First get the current task
    const [currentTask] = await this.drizzleService.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!currentTask) {
      throw new NotFoundException('Task not found');
    }

    // Toggle the status between completed and pending
    const newStatus = currentTask.status === 'completed' ? 'pending' : 'completed';
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'completed') {
      updateData.completedAt = new Date();
      updateData.progressPercentage = 100;
    } else {
      updateData.completedAt = null;
    }

    const [updated] = await this.drizzleService.db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    // Invalidate dashboard cache after task completion status change
    await this.invalidateDashboardCache(userId);

    return updated;
  }

  async getTaskById(taskId: string, userId: string) {
    const [task] = await this.drizzleService.db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        estimatedMinutes: tasks.estimatedMinutes,
        actualMinutes: tasks.actualMinutes,
        progressPercentage: tasks.progressPercentage,
        aiGenerated: tasks.aiGenerated,
        aiMetadata: tasks.aiMetadata,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          color: subjects.color,
          icon: subjects.icon,
        },
      })
      .from(tasks)
      .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  // Batch operations
  async batchUpdateTasks(userId: string, taskIds: string[], updateData: Partial<UpdateTaskDto>) {
    const updatedTasks = [];

    for (const taskId of taskIds) {
      try {
        const updated = await this.updateTask(taskId, userId, updateData);
        updatedTasks.push(updated);
      } catch (error) {
        this.logger.warn(`Failed to update task ${taskId}:`, error);
      }
    }

    await this.invalidateDashboardCache(userId);
    return { updated: updatedTasks.length, tasks: updatedTasks };
  }

  async batchDeleteTasks(userId: string, taskIds: string[]) {
    const deletedTasks = [];

    for (const taskId of taskIds) {
      try {
        await this.deleteTask(taskId, userId);
        deletedTasks.push(taskId);
      } catch (error) {
        this.logger.warn(`Failed to delete task ${taskId}:`, error);
      }
    }

    await this.invalidateDashboardCache(userId);
    return { deleted: deletedTasks.length, taskIds: deletedTasks };
  }

  async getTasksWithFilters(
    userId: string,
    options: {
      searchTerm?: string;
      status?: string[];
      priority?: string[];
      subjectIds?: string[];
      dueDateFrom?: string;
      dueDateTo?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const {
      searchTerm,
      status,
      priority,
      subjectIds,
      dueDateFrom,
      dueDateTo,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = options;
    let baseQuery = this.drizzleService.db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        estimatedMinutes: tasks.estimatedMinutes,
        actualMinutes: tasks.actualMinutes,
        progressPercentage: tasks.progressPercentage,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          color: subjects.color,
          icon: subjects.icon,
        },
      })
      .from(tasks)
      .leftJoin(subjects, eq(tasks.subjectId, subjects.id));

    const conditions = [eq(tasks.userId, userId)];

    if (subjectIds && subjectIds.length > 0) {
      conditions.push(inArray(tasks.subjectId, subjectIds));
    }

    if (searchTerm) {
      conditions.push(
        or(ilike(tasks.title, `%${searchTerm}%`), ilike(tasks.description, `%${searchTerm}%`)),
      );
    }

    if (status && status.length > 0) {
      conditions.push(inArray(tasks.status, status));
    }

    if (priority && priority.length > 0) {
      conditions.push(inArray(tasks.priority, priority));
    }

    if (dueDateFrom) {
      conditions.push(gte(tasks.dueDate, new Date(dueDateFrom)));
    }

    if (dueDateTo) {
      conditions.push(lte(tasks.dueDate, new Date(dueDateTo)));
    }

    baseQuery = baseQuery.where(and(...conditions));

    // Apply sorting
    if (sortBy) {
      const sortDirection = sortOrder === 'desc' ? desc : asc;
      switch (sortBy) {
        case 'title':
          baseQuery = baseQuery.orderBy(sortDirection(tasks.title));
          break;
        case 'dueDate':
          baseQuery = baseQuery.orderBy(sortDirection(tasks.dueDate));
          break;
        case 'priority':
          baseQuery = baseQuery.orderBy(sortDirection(tasks.priority));
          break;
        case 'status':
          baseQuery = baseQuery.orderBy(sortDirection(tasks.status));
          break;
        case 'createdAt':
        default:
          baseQuery = baseQuery.orderBy(sortDirection(tasks.createdAt));
          break;
      }
    } else {
      baseQuery = baseQuery.orderBy(desc(tasks.createdAt));
    }

    // Apply pagination
    if (limit) {
      baseQuery = baseQuery.limit(limit);
    }
    if (offset) {
      baseQuery = baseQuery.offset(offset);
    }

    const results = await this.queryOptimizerService.executeWithMetrics(
      () => baseQuery,
      'getTasksWithFilters',
    );

    // Get total count for pagination
    const totalQuery = this.drizzleService.db
      .select({ count: count() })
      .from(tasks)
      .where(and(...conditions));

    const [{ count: total }] = await totalQuery;

    return {
      tasks: results,
      pagination: {
        total,
        limit: limit || total,
        offset: offset || 0,
        hasMore: (offset || 0) + (limit || total) < total,
      },
    };
  }

  async getTasksByStatus(userId: string, status: string) {
    return this.queryOptimizerService.executeWithMetrics(
      () =>
        this.drizzleService.db
          .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            completedAt: tasks.completedAt,
            estimatedMinutes: tasks.estimatedMinutes,
            actualMinutes: tasks.actualMinutes,
            progressPercentage: tasks.progressPercentage,
            createdAt: tasks.createdAt,
            updatedAt: tasks.updatedAt,
            subject: {
              id: subjects.id,
              name: subjects.name,
              color: subjects.color,
              icon: subjects.icon,
            },
          })
          .from(tasks)
          .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
          .where(and(eq(tasks.userId, userId), eq(tasks.status, status)))
          .orderBy(desc(tasks.createdAt)),
      'getTasksByStatus',
    );
  }

  async updateTaskProgress(taskId: string, userId: string, progressPercentage: number) {
    const [updated] = await this.drizzleService.db
      .update(tasks)
      .set({
        progressPercentage,
        updatedAt: new Date(),
        ...(progressPercentage === 100 && {
          status: 'completed',
          completedAt: new Date(),
        }),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Task not found');
    }

    await this.invalidateDashboardCache(userId);
    return updated;
  }

  // Cache invalidation method
  private async invalidateDashboardCache(userId: string): Promise<void> {
    try {
      // Invalidate all dashboard-related cache for the user
      await this.cacheService.delPattern(`dashboard_stats:${userId}`);
      await this.cacheService.delPattern(`dashboard_streak:${userId}`);
      await this.cacheService.delPattern(`dashboard_weekly:${userId}`);
      this.logger.debug(`Invalidated dashboard cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate dashboard cache for user ${userId}:`, error);
    }
  }
}
