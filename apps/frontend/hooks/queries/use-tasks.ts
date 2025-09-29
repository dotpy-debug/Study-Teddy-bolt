import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tasksApi,
  type StudyTask,
  type CreateTaskDto,
  type UpdateTaskDto,
  type TaskQueryParams,
  type TaskStats,
  type BatchTaskUpdate
} from '@/lib/api';
import { queryKeys, invalidateQueries, optimisticUpdates } from '@/lib/react-query';
import { toast } from 'react-hot-toast';

// Get all tasks
export function useTasks(params?: TaskQueryParams) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: async () => {
      const result = await tasksApi.getTasks(params);
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get today's tasks
export function useTodayTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.today(),
    queryFn: async () => {
      const result = await tasksApi.getTodayTasks();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

// Get upcoming tasks
export function useUpcomingTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.upcoming(),
    queryFn: async () => {
      const result = await tasksApi.getUpcomingTasks();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get overdue tasks
export function useOverdueTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.overdue(),
    queryFn: async () => {
      const result = await tasksApi.getOverdueTasks();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Get task by ID
export function useTask(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: async () => {
      const result = await tasksApi.getTask(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get task statistics
export function useTaskStats() {
  return useQuery({
    queryKey: queryKeys.tasks.stats(),
    queryFn: async () => {
      const result = await tasksApi.getTaskStats();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get study sessions for a task
export function useTaskStudySessions(taskId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.tasks.studySessions(taskId),
    queryFn: async () => {
      const result = await tasksApi.getTaskStudySessions(taskId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!taskId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get all study sessions
export function useStudySessions() {
  return useQuery({
    queryKey: queryKeys.tasks.studySessions(),
    queryFn: async () => {
      const result = await tasksApi.getStudySessions();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Create task mutation
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskDto) => {
      const result = await tasksApi.createTask(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      // Add the new task to the cache
      queryClient.setQueryData(queryKeys.tasks.detail(data!.id), data);

      // Invalidate related queries
      invalidateQueries.onTaskUpdate();

      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create task');
    },
  });
}

// Update task mutation
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskDto }) => {
      const result = await tasksApi.updateTask(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(id));

      // Optimistically update the task
      queryClient.setQueryData(queryKeys.tasks.detail(id), (old: any) => {
        if (!old) return old;
        return { ...old, ...data };
      });

      // Return a context object with the snapshotted value
      return { previousTask };
    },
    onSuccess: (data, { id }) => {
      // Update the task in the cache with server response
      queryClient.setQueryData(queryKeys.tasks.detail(id), data);

      // Invalidate related queries
      invalidateQueries.onTaskUpdate();

      toast.success('Task updated successfully');
    },
    onError: (error: any, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), context.previousTask);
      }

      toast.error(error?.message || 'Failed to update task');
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
    },
  });
}

// Toggle task completion mutation
export function useToggleTaskComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tasksApi.toggleComplete(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(id)) as StudyTask;

      // Optimistically update the task status
      if (previousTask) {
        const newStatus = previousTask.status === 'completed' ? 'pending' : 'completed';
        optimisticUpdates.updateTaskStatus(id, newStatus);
      }

      return { previousTask };
    },
    onSuccess: (data, id) => {
      // Update the task in the cache with server response
      queryClient.setQueryData(queryKeys.tasks.detail(id), data);

      // Invalidate related queries
      invalidateQueries.onTaskUpdate();

      const isCompleted = data!.status === 'completed';
      toast.success(isCompleted ? 'Task completed!' : 'Task marked as incomplete');
    },
    onError: (error: any, id, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), context.previousTask);
      }

      toast.error(error?.message || 'Failed to update task');
    },
    onSettled: (_, __, id) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
    },
  });
}

// Mark task as complete mutation
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tasksApi.completeTask(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onMutate: async (id) => {
      // Optimistically update the task status
      optimisticUpdates.updateTaskStatus(id, 'completed');
    },
    onSuccess: (data, id) => {
      // Update the task in the cache
      queryClient.setQueryData(queryKeys.tasks.detail(id), data);

      // Invalidate related queries
      invalidateQueries.onTaskUpdate();

      toast.success('Task completed successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to complete task');
    },
  });
}

// Delete task mutation
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tasksApi.deleteTask(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, id) => {
      // Remove the task from all queries
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(id) });

      // Invalidate tasks list
      invalidateQueries.onTaskUpdate();

      toast.success('Task deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete task');
    },
  });
}

// Duplicate task mutation
export function useDuplicateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await tasksApi.duplicateTask(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      // Add the new task to the cache
      queryClient.setQueryData(queryKeys.tasks.detail(data!.id), data);

      // Invalidate tasks list
      invalidateQueries.onTaskUpdate();

      toast.success('Task duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to duplicate task');
    },
  });
}

// Bulk update tasks mutation
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: BatchTaskUpdate) => {
      const result = await tasksApi.bulkUpdateTasks(updates);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, { taskIds }) => {
      // Update each task in the cache
      data?.forEach((task) => {
        queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      });

      // Invalidate tasks list
      invalidateQueries.onTaskUpdate();

      toast.success(`${taskIds.length} tasks updated successfully`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update tasks');
    },
  });
}

// Bulk delete tasks mutation
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const result = await tasksApi.bulkDeleteTasks(taskIds);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, taskIds) => {
      // Remove all tasks from queries
      taskIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(id) });
      });

      // Invalidate tasks list
      invalidateQueries.onTaskUpdate();

      toast.success(`${taskIds.length} tasks deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete tasks');
    },
  });
}

// Archive completed tasks mutation
export function useArchiveCompletedTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await tasksApi.archiveCompletedTasks();
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate tasks list to reflect archived tasks
      invalidateQueries.onTaskUpdate();

      toast.success(`${data!.archivedCount} completed tasks archived`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to archive completed tasks');
    },
  });
}