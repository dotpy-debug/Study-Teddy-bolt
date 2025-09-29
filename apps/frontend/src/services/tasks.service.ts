import apiClient from './api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  subjectId?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  estimatedMinutes?: number;
  subjectId?: string;
  tags?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  subjectId?: string;
  tags?: string[];
}

export class TasksService {
  async getTasks(filters?: {
    status?: string;
    priority?: string;
    subjectId?: string;
    tags?: string[];
    search?: string;
  }): Promise<Task[]> {
    const response = await apiClient.get('/api/tasks', { params: filters });
    return response.data;
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await apiClient.get(`/api/tasks/${taskId}`);
    return response.data;
  }

  async createTask(task: CreateTaskDto): Promise<Task> {
    const response = await apiClient.post('/api/tasks', task);
    return response.data;
  }

  async updateTask(taskId: string, updates: UpdateTaskDto): Promise<Task> {
    const response = await apiClient.put(`/api/tasks/${taskId}`, updates);
    return response.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`/api/tasks/${taskId}`);
  }

  async completeTask(taskId: string, actualMinutes?: number): Promise<Task> {
    const response = await apiClient.patch(`/api/tasks/${taskId}/complete`, {
      actualMinutes,
    });
    return response.data;
  }

  async startTask(taskId: string): Promise<Task> {
    const response = await apiClient.patch(`/api/tasks/${taskId}/start`);
    return response.data;
  }

  async pauseTask(taskId: string): Promise<Task> {
    const response = await apiClient.patch(`/api/tasks/${taskId}/pause`);
    return response.data;
  }

  async getTaskStatistics(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
  }> {
    const response = await apiClient.get('/api/tasks/statistics');
    return response.data;
  }
}

export const tasksService = new TasksService();