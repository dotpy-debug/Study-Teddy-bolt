import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { tasks, subtasks } from '../../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { CreateSubtaskDto, UpdateSubtaskDto, BulkCreateSubtasksDto } from './dto/subtask.dto';
import { CacheService } from '../../common/cache/cache.service';
import { QueryOptimizerService } from '../../common/performance/query-optimizer.service';

@Injectable()
export class SubtasksService {
  private readonly logger = new Logger(SubtasksService.name);

  constructor(
    private cacheService: CacheService,
    private queryOptimizerService: QueryOptimizerService,
    private drizzleService: DrizzleService,
  ) {}

  async createSubtask(userId: string, data: CreateSubtaskDto) {
    // First verify that the task belongs to the user
    await this.verifyTaskOwnership(data.taskId, userId);

    // Get the current max order for this task
    const [maxOrderResult] = await this.drizzleService.db
      .select({ maxOrder: subtasks.order })
      .from(subtasks)
      .where(eq(subtasks.taskId, data.taskId))
      .orderBy(desc(subtasks.order))
      .limit(1);

    const nextOrder = data.order ?? (maxOrderResult?.maxOrder ?? -1) + 1;

    const [subtask] = await this.drizzleService.db
      .insert(subtasks)
      .values({
        taskId: data.taskId,
        title: data.title,
        order: nextOrder,
      })
      .returning();

    // Invalidate cache
    await this.invalidateTaskCache(data.taskId, userId);

    return subtask;
  }

  async bulkCreateSubtasks(userId: string, data: BulkCreateSubtasksDto) {
    // First verify that the task belongs to the user
    await this.verifyTaskOwnership(data.taskId, userId);

    // Get the current max order for this task
    const [maxOrderResult] = await this.drizzleService.db
      .select({ maxOrder: subtasks.order })
      .from(subtasks)
      .where(eq(subtasks.taskId, data.taskId))
      .orderBy(desc(subtasks.order))
      .limit(1);

    let currentOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

    const subtaskData = data.titles.map((title) => ({
      taskId: data.taskId,
      title,
      order: currentOrder++,
    }));

    const createdSubtasks = await this.drizzleService.db
      .insert(subtasks)
      .values(subtaskData)
      .returning();

    // Invalidate cache
    await this.invalidateTaskCache(data.taskId, userId);

    return { created: createdSubtasks.length, subtasks: createdSubtasks };
  }

  async getTaskSubtasks(userId: string, taskId: string) {
    // First verify that the task belongs to the user
    await this.verifyTaskOwnership(taskId, userId);

    return this.queryOptimizerService.executeWithMetrics(
      () =>
        this.drizzleService.db
          .select()
          .from(subtasks)
          .where(eq(subtasks.taskId, taskId))
          .orderBy(asc(subtasks.order)),
      'getTaskSubtasks',
    );
  }

  async updateSubtask(id: string, userId: string, data: UpdateSubtaskDto) {
    // First get the subtask to verify ownership
    const [existingSubtask] = await this.drizzleService.db
      .select({
        id: subtasks.id,
        taskId: subtasks.taskId,
        completed: subtasks.completed,
      })
      .from(subtasks)
      .where(eq(subtasks.id, id))
      .limit(1);

    if (!existingSubtask) {
      throw new NotFoundException('Subtask not found');
    }

    // Verify task ownership
    await this.verifyTaskOwnership(existingSubtask.taskId, userId);

    const updateData: any = { ...data };

    // Set completion timestamp if marking as completed
    if (data.completed === true && !existingSubtask.completed) {
      updateData.completedAt = new Date();
    } else if (data.completed === false) {
      updateData.completedAt = null;
    }

    updateData.updatedAt = new Date();

    const [updated] = await this.drizzleService.db
      .update(subtasks)
      .set(updateData)
      .where(eq(subtasks.id, id))
      .returning();

    // Update parent task progress
    await this.updateParentTaskProgress(existingSubtask.taskId);

    // Invalidate cache
    await this.invalidateTaskCache(existingSubtask.taskId, userId);

    return updated;
  }

  async deleteSubtask(id: string, userId: string) {
    // First get the subtask to verify ownership
    const [existingSubtask] = await this.drizzleService.db
      .select({
        id: subtasks.id,
        taskId: subtasks.taskId,
      })
      .from(subtasks)
      .where(eq(subtasks.id, id))
      .limit(1);

    if (!existingSubtask) {
      throw new NotFoundException('Subtask not found');
    }

    // Verify task ownership
    await this.verifyTaskOwnership(existingSubtask.taskId, userId);

    const deletedRows = await this.drizzleService.db
      .delete(subtasks)
      .where(eq(subtasks.id, id))
      .returning();

    if (deletedRows.length === 0) {
      throw new NotFoundException('Subtask not found');
    }

    // Update parent task progress
    await this.updateParentTaskProgress(existingSubtask.taskId);

    // Invalidate cache
    await this.invalidateTaskCache(existingSubtask.taskId, userId);

    return { message: 'Subtask deleted successfully' };
  }

  async toggleSubtaskCompletion(id: string, userId: string) {
    // First get the subtask to verify ownership
    const [existingSubtask] = await this.drizzleService.db
      .select()
      .from(subtasks)
      .where(eq(subtasks.id, id))
      .limit(1);

    if (!existingSubtask) {
      throw new NotFoundException('Subtask not found');
    }

    // Verify task ownership
    await this.verifyTaskOwnership(existingSubtask.taskId, userId);

    const newCompleted = !existingSubtask.completed;
    const updateData: any = {
      completed: newCompleted,
      updatedAt: new Date(),
    };

    if (newCompleted) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }

    const [updated] = await this.drizzleService.db
      .update(subtasks)
      .set(updateData)
      .where(eq(subtasks.id, id))
      .returning();

    // Update parent task progress
    await this.updateParentTaskProgress(existingSubtask.taskId);

    // Invalidate cache
    await this.invalidateTaskCache(existingSubtask.taskId, userId);

    return updated;
  }

  async reorderSubtask(id: string, userId: string, newPosition: number) {
    // First get the subtask to verify ownership
    const [existingSubtask] = await this.drizzleService.db
      .select()
      .from(subtasks)
      .where(eq(subtasks.id, id))
      .limit(1);

    if (!existingSubtask) {
      throw new NotFoundException('Subtask not found');
    }

    // Verify task ownership
    await this.verifyTaskOwnership(existingSubtask.taskId, userId);

    // Get all subtasks for this task to reorder them
    const allSubtasks = await this.drizzleService.db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, existingSubtask.taskId))
      .orderBy(asc(subtasks.order));

    // Remove the current subtask from the list
    const otherSubtasks = allSubtasks.filter((s) => s.id !== id);

    // Insert it at the new position
    otherSubtasks.splice(newPosition, 0, existingSubtask);

    // Update all orders
    for (let i = 0; i < otherSubtasks.length; i++) {
      await this.drizzleService.db
        .update(subtasks)
        .set({ order: i, updatedAt: new Date() })
        .where(eq(subtasks.id, otherSubtasks[i].id));
    }

    // Get the updated subtask
    const [updated] = await this.drizzleService.db
      .select()
      .from(subtasks)
      .where(eq(subtasks.id, id))
      .limit(1);

    // Invalidate cache
    await this.invalidateTaskCache(existingSubtask.taskId, userId);

    return updated;
  }

  // Helper method to verify task ownership
  private async verifyTaskOwnership(taskId: string, userId: string) {
    const [task] = await this.drizzleService.db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!task) {
      throw new ForbiddenException('Access denied to this task');
    }
  }

  // Helper method to update parent task progress based on subtask completion
  private async updateParentTaskProgress(taskId: string) {
    try {
      // Get all subtasks for the task
      const taskSubtasks = await this.drizzleService.db
        .select()
        .from(subtasks)
        .where(eq(subtasks.taskId, taskId));

      if (taskSubtasks.length === 0) {
        // No subtasks, don't update progress
        return;
      }

      // Calculate progress percentage
      const completedCount = taskSubtasks.filter((s) => s.completed).length;
      const progressPercentage = Math.round((completedCount / taskSubtasks.length) * 100);

      // Update the parent task
      const updateData: any = {
        progressPercentage,
        updatedAt: new Date(),
      };

      // If all subtasks are completed, mark task as completed
      if (progressPercentage === 100) {
        updateData.status = 'completed';
        updateData.completedAt = new Date();
      }

      await this.drizzleService.db.update(tasks).set(updateData).where(eq(tasks.id, taskId));
    } catch (error) {
      this.logger.error(`Failed to update parent task progress for task ${taskId}:`, error);
    }
  }

  // Cache invalidation method
  private async invalidateTaskCache(taskId: string, userId: string): Promise<void> {
    try {
      // Invalidate task-related cache
      await this.cacheService.delPattern(`task:${taskId}`);
      await this.cacheService.delPattern(`subtasks:${taskId}`);
      await this.cacheService.delPattern(`dashboard_stats:${userId}`);
      await this.cacheService.delPattern(`dashboard_streak:${userId}`);
      await this.cacheService.delPattern(`dashboard_weekly:${userId}`);
      this.logger.debug(`Invalidated cache for task: ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for task ${taskId}:`, error);
    }
  }
}
