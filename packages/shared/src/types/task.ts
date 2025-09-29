// TaskPriority and TaskStatus are exported as enums from ../enums.ts
import { TaskPriority } from '../enums';

export interface StudyTask {
  id: string;
  userId: string;
  title: string;
  subject?: string | null;
  description?: string | null;
  dueDate?: Date | string | null;
  priority: TaskPriority;
  completed: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateTaskDto {
  title: string;
  subject?: string;
  description?: string;
  dueDate?: Date | string;
  priority?: TaskPriority;
}

export interface UpdateTaskDto {
  title?: string;
  subject?: string;
  description?: string;
  dueDate?: Date | string;
  priority?: TaskPriority;
  completed?: boolean;
}

export interface TaskFilters {
  subject?: string;
  priority?: TaskPriority;
  completed?: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  dueDate?: string;
  status?: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId?: string | null;
  durationMinutes: number;
  date: Date | string;
  notes?: string | null;
  createdAt: Date | string;
}

export interface CreateStudySessionDto {
  taskId?: string;
  durationMinutes: number;
  date?: Date | string;
  notes?: string;
}