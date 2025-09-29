export interface Task {
  id: string;
  userId: string;
  title: string;
  subject: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  subject: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateTaskDto {
  title?: string;
  subject?: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
}

export interface TaskStats {
  total: number;
  completed: number;
  overdue: number;
  completionRate: number;
}