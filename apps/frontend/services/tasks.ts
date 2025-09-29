import axios from 'axios';
import {
  Task,
  Subtask,
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryParams,
  TasksResponse,
  CreateSubtaskDto,
  UpdateSubtaskDto,
  BatchUpdateTasksDto,
  BatchDeleteTasksDto,
  TaskParseResponse,
  TaskParseAndCreateResponse,
  Subject,
} from '@/types/tasks';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tasks API
export const tasksApi = {
  // Get all tasks with filters
  async getTasks(params?: TaskQueryParams): Promise<TasksResponse> {
    const response = await api.get('/api/tasks', { params });
    return response.data;
  },

  // Get tasks for today
  async getTodaysTasks(): Promise<Task[]> {
    const response = await api.get('/api/tasks/today');
    return response.data;
  },

  // Get single task by ID
  async getTask(id: string): Promise<Task> {
    const response = await api.get(`/api/tasks/${id}`);
    return response.data;
  },

  // Create new task
  async createTask(data: CreateTaskDto): Promise<Task> {
    const response = await api.post('/api/tasks', data);
    return response.data;
  },

  // Update task
  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
    const response = await api.patch(`/api/tasks/${id}`, data);
    return response.data;
  },

  // Delete task
  async deleteTask(id: string): Promise<void> {
    await api.delete(`/api/tasks/${id}`);
  },

  // Toggle task completion
  async toggleTaskCompletion(id: string): Promise<Task> {
    const response = await api.patch(`/api/tasks/${id}/complete`);
    return response.data;
  },

  // Update task progress
  async updateTaskProgress(id: string, progressPercentage: number): Promise<Task> {
    const response = await api.patch(`/api/tasks/${id}/progress`, {
      progressPercentage,
    });
    return response.data;
  },

  // Get tasks by status
  async getTasksByStatus(status: string): Promise<Task[]> {
    const response = await api.get(`/api/tasks/status/${status}`);
    return response.data;
  },

  // Batch operations
  async batchUpdateTasks(data: BatchUpdateTasksDto): Promise<{ updated: number; tasks: Task[] }> {
    const response = await api.post('/api/tasks/batch/update', data);
    return response.data;
  },

  async batchDeleteTasks(data: BatchDeleteTasksDto): Promise<{ deleted: number; taskIds: string[] }> {
    const response = await api.post('/api/tasks/batch/delete', data);
    return response.data;
  },

  // Natural language parsing
  async parseTaskInput(
    input: string,
    availableSubjects?: Subject[]
  ): Promise<TaskParseResponse> {
    const response = await api.post('/api/tasks/parse', {
      input,
      availableSubjects,
    });
    return response.data;
  },

  async parseAndCreateTask(
    input: string,
    availableSubjects?: Subject[]
  ): Promise<TaskParseAndCreateResponse> {
    const response = await api.post('/api/tasks/parse/create', {
      input,
      availableSubjects,
    });
    return response.data;
  },

  async getTaskInputSuggestions(
    input: string,
    availableSubjects?: Subject[]
  ): Promise<{ suggestions: string[] }> {
    const params = new URLSearchParams({ input });
    if (availableSubjects) {
      params.append('availableSubjects', JSON.stringify(availableSubjects));
    }
    const response = await api.get(`/api/tasks/parse/suggestions?${params}`);
    return response.data;
  },
};

// Subtasks API
export const subtasksApi = {
  // Get all subtasks for a task
  async getTaskSubtasks(taskId: string): Promise<Subtask[]> {
    const response = await api.get(`/api/subtasks/task/${taskId}`);
    return response.data;
  },

  // Create new subtask
  async createSubtask(data: CreateSubtaskDto): Promise<Subtask> {
    const response = await api.post('/api/subtasks', data);
    return response.data;
  },

  // Bulk create subtasks
  async bulkCreateSubtasks(
    taskId: string,
    titles: string[]
  ): Promise<{ created: number; subtasks: Subtask[] }> {
    const response = await api.post('/api/subtasks/bulk', {
      taskId,
      titles,
    });
    return response.data;
  },

  // Update subtask
  async updateSubtask(id: string, data: UpdateSubtaskDto): Promise<Subtask> {
    const response = await api.patch(`/api/subtasks/${id}`, data);
    return response.data;
  },

  // Delete subtask
  async deleteSubtask(id: string): Promise<void> {
    await api.delete(`/api/subtasks/${id}`);
  },

  // Toggle subtask completion
  async toggleSubtaskCompletion(id: string): Promise<Subtask> {
    const response = await api.patch(`/api/subtasks/${id}/complete`);
    return response.data;
  },

  // Reorder subtask
  async reorderSubtask(id: string, position: number): Promise<Subtask> {
    const response = await api.patch(`/api/subtasks/${id}/reorder`, {
      position,
    });
    return response.data;
  },
};

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};