import { Injectable, Logger } from '@nestjs/common';
import { and, eq, gte, lte, or, desc, asc, count, sql } from 'drizzle-orm';
import { PgDatabase } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tasks, users, subjects, Task } from '../db/schema';

export interface TaskQueryOptions {
  userId: string;
  limit?: number;
  offset?: number;
  sortBy?: 'dueDate' | 'priority' | 'created' | 'title';
  sortOrder?: 'asc' | 'desc';
  filter?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
  searchQuery?: string;
  subjectId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface TaskListResponse {
  data: Task[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

@Injectable()
export class TasksPerformanceService {
  private readonly logger = new Logger(TasksPerformanceService.name);

  constructor(private readonly db: NodePgDatabase) {}

  /**
   * Optimized task listing with intelligent caching and minimal data transfer
   */
  async getTasksOptimized(options: TaskQueryOptions): Promise<TaskListResponse> {
    const startTime = Date.now();
    const {
      userId,
      limit = 50,
      offset = 0,
      sortBy = 'dueDate',
      sortOrder = 'asc',
      filter = 'all',
      searchQuery,
      subjectId,
      priority,
      status,
    } = options;

    try {
      // Build where conditions efficiently
      const whereConditions = [eq(tasks.userId, userId)];

      // Add status filter
      if (status) {
        whereConditions.push(eq(tasks.status, status));
      }

      // Add priority filter
      if (priority) {
        whereConditions.push(eq(tasks.priority, priority));
      }

      // Add subject filter
      if (subjectId) {
        whereConditions.push(eq(tasks.subjectId, subjectId));
      }

      // Add date-based filters
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      switch (filter) {
        case 'today':
          whereConditions.push(
            and(
              gte(tasks.dueDate, todayStart),
              lte(tasks.dueDate, todayEnd),
              eq(tasks.status, 'pending'),
            ),
          );
          break;
        case 'upcoming':
          whereConditions.push(and(gte(tasks.dueDate, todayEnd), eq(tasks.status, 'pending')));
          break;
        case 'overdue':
          whereConditions.push(and(lte(tasks.dueDate, now), eq(tasks.status, 'pending')));
          break;
        case 'completed':
          whereConditions.push(eq(tasks.status, 'completed'));
          break;
      }

      // Add search filter
      if (searchQuery) {
        whereConditions.push(
          or(
            sql`${tasks.title} ILIKE ${`%${searchQuery}%`}`,
            sql`${tasks.description} ILIKE ${`%${searchQuery}%`}`,
          ),
        );
      }

      // Build sort order
      const sortColumn = {
        dueDate: tasks.dueDate,
        priority: tasks.priority,
        created: tasks.createdAt,
        title: tasks.title,
      }[sortBy];

      const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

      // Execute optimized query with join for subject info
      const tasksQuery = this.db
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
          subjectId: tasks.subjectId,
          // Join subject data efficiently
          subjectName: subjects.name,
          subjectColor: subjects.color,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .where(and(...whereConditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Execute count query in parallel for pagination
      const countQuery = this.db
        .select({ count: count() })
        .from(tasks)
        .where(and(...whereConditions));

      // Execute both queries in parallel
      const [tasksResult, countResult] = await Promise.all([tasksQuery, countQuery]);

      const totalCount = countResult[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Tasks query executed in ${duration}ms - ${tasksResult.length} items, filter: ${filter}, search: ${searchQuery || 'none'}`,
      );

      return {
        data: tasksResult as Task[],
        total: totalCount,
        page: currentPage,
        totalPages,
        hasMore: currentPage < totalPages,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Tasks query failed after ${duration}ms`, error.stack);
      throw error;
    }
  }

  /**
   * Get task counts for dashboard widgets - optimized single query
   */
  async getTaskCounts(userId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    today: number;
    thisWeek: number;
  }> {
    const startTime = Date.now();

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      // Single query with conditional aggregation for optimal performance
      const result = await this.db
        .select({
          total: count(),
          pending: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'pending' THEN 1 END)`,
          completed: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
          overdue: sql<number>`COUNT(CASE WHEN ${tasks.dueDate} < ${now} AND ${tasks.status} = 'pending' THEN 1 END)`,
          today: sql<number>`COUNT(CASE WHEN ${tasks.dueDate} >= ${todayStart} AND ${tasks.dueDate} < ${todayEnd} AND ${tasks.status} = 'pending' THEN 1 END)`,
          thisWeek: sql<number>`COUNT(CASE WHEN ${tasks.dueDate} >= ${weekStart} AND ${tasks.dueDate} < ${weekEnd} AND ${tasks.status} = 'pending' THEN 1 END)`,
        })
        .from(tasks)
        .where(eq(tasks.userId, userId));

      const counts = result[0] || {
        total: 0,
        pending: 0,
        completed: 0,
        overdue: 0,
        today: 0,
        thisWeek: 0,
      };

      const duration = Date.now() - startTime;
      this.logger.log(`Task counts query executed in ${duration}ms`);

      return counts;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Task counts query failed after ${duration}ms`, error.stack);
      throw error;
    }
  }

  /**
   * Optimized task creation with minimal database round trips
   */
  async createTaskOptimized(userId: string, taskData: Partial<Task>): Promise<Task> {
    const startTime = Date.now();

    try {
      const newTask = await this.db
        .insert(tasks)
        .values({
          ...taskData,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const duration = Date.now() - startTime;
      this.logger.log(`Task created in ${duration}ms`);

      return newTask[0];
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Task creation failed after ${duration}ms`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk task operations for improved performance
   */
  async bulkUpdateTaskStatus(
    userId: string,
    taskIds: string[],
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  ): Promise<void> {
    const startTime = Date.now();

    try {
      await this.db
        .update(tasks)
        .set({
          status,
          updatedAt: new Date(),
          ...(status === 'completed' && { completedAt: new Date() }),
        })
        .where(and(eq(tasks.userId, userId), sql`${tasks.id} = ANY(${taskIds})`));

      const duration = Date.now() - startTime;
      this.logger.log(`Bulk updated ${taskIds.length} tasks in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Bulk task update failed after ${duration}ms`, error.stack);
      throw error;
    }
  }

  /**
   * Get tasks with intelligent prefetching for calendar views
   */
  async getTasksForDateRange(userId: string, startDate: Date, endDate: Date): Promise<Task[]> {
    const startTime = Date.now();

    try {
      const result = await this.db
        .select()
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .where(
          and(eq(tasks.userId, userId), gte(tasks.dueDate, startDate), lte(tasks.dueDate, endDate)),
        )
        .orderBy(asc(tasks.dueDate));

      const duration = Date.now() - startTime;
      this.logger.log(`Date range query executed in ${duration}ms - ${result.length} tasks`);

      return result.map((row) => ({
        ...row.tasks,
        subject: row.subjects,
      })) as Task[];
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Date range query failed after ${duration}ms`, error.stack);
      throw error;
    }
  }
}
