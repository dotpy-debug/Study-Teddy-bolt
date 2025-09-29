import { apiClient, type ApiError } from './client';
import type {
  StudyTask,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  TaskStats,
  StudySession,
  CreateStudySessionDto,
  TaskPriority,
  TaskStatus
} from '@studyteddy/shared';

// Task result interface
export interface TaskResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

// Task query parameters
export interface TaskQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  filters?: TaskFilters;
}

// Batch task operations
export interface BatchTaskUpdate {
  taskIds: string[];
  updates: Partial<UpdateTaskDto>;
}

export const tasksApi = {
  // Get all user tasks with optional filtering and pagination
  getTasks: async (params?: TaskQueryParams): Promise<TaskResult<StudyTask[]>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      // Add filters
      if (params?.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(`filter.${key}`, value.toString());
          }
        });
      }

      const url = `/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<StudyTask[]>(url);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get today's tasks
  getTodayTasks: async (): Promise<TaskResult<StudyTask[]>> => {
    try {
      const response = await apiClient.get<StudyTask[]>('/tasks/today');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get upcoming tasks (due in next 7 days)
  getUpcomingTasks: async (): Promise<TaskResult<StudyTask[]>> => {
    try {
      const response = await apiClient.get<StudyTask[]>('/tasks/upcoming');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get overdue tasks
  getOverdueTasks: async (): Promise<TaskResult<StudyTask[]>> => {
    try {
      const response = await apiClient.get<StudyTask[]>('/tasks/overdue');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get task statistics
  getTaskStats: async (): Promise<TaskResult<TaskStats>> => {
    try {
      const response = await apiClient.get<TaskStats>('/tasks/stats');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Create a new task
  createTask: async (data: CreateTaskDto): Promise<TaskResult<StudyTask>> => {
    try {
      const response = await apiClient.post<StudyTask>('/tasks', data);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update a task
  updateTask: async (id: string, data: UpdateTaskDto): Promise<TaskResult<StudyTask>> => {
    try {
      const response = await apiClient.put<StudyTask>(`/tasks/${id}`, data);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Toggle task completion status
  toggleComplete: async (id: string): Promise<TaskResult<StudyTask>> => {
    try {
      const response = await apiClient.patch<StudyTask>(`/tasks/${id}/toggle`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Mark task as complete
  completeTask: async (id: string): Promise<TaskResult<StudyTask>> => {
    try {
      const response = await apiClient.patch<StudyTask>(`/tasks/${id}/complete`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Mark task as incomplete
  uncompleteTask: async (id: string): Promise<TaskResult<StudyTask>> => {
    try {
      const response = await apiClient.patch<StudyTask>(`/tasks/${id}/uncomplete`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Delete a task
  deleteTask: async (id: string): Promise<TaskResult<void>> => {
    try {
      await apiClient.delete(`/tasks/${id}`);

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get a specific task
  getTask: async (id: string): Promise<TaskResult<StudyTask>> => {
    try {
      const response = await apiClient.get<StudyTask>(`/tasks/${id}`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Bulk operations
  bulkUpdateTasks: async (updates: BatchTaskUpdate): Promise<TaskResult<StudyTask[]>> => {
    try {
      const response = await apiClient.patch<StudyTask[]>('/tasks/bulk', updates);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Bulk delete tasks
  bulkDeleteTasks: async (taskIds: string[]): Promise<TaskResult<void>> => {
    try {
      await apiClient.delete('/tasks/bulk', { data: { taskIds } });

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Study session operations
  createStudySession: async (data: CreateStudySessionDto): Promise<TaskResult<StudySession>> => {
    try {
      const response = await apiClient.post<StudySession>('/tasks/study-sessions', data);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get study sessions for a task
  getTaskStudySessions: async (taskId: string): Promise<TaskResult<StudySession[]>> => {
    try {
      const response = await apiClient.get<StudySession[]>(`/tasks/${taskId}/study-sessions`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get all study sessions
  getStudySessions: async (): Promise<TaskResult<StudySession[]>> => {
    try {
      const response = await apiClient.get<StudySession[]>('/tasks/study-sessions');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Duplicate a task
  duplicateTask: async (id: string): Promise<TaskResult<StudyTask>> => {
    try {
      const response = await apiClient.post<StudyTask>(`/tasks/${id}/duplicate`);

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Archive completed tasks
  archiveCompletedTasks: async (): Promise<TaskResult<{ archivedCount: number }>> => {
    try {
      const response = await apiClient.post<{ archivedCount: number }>('/tasks/archive');

      return {
        data: response,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }
};