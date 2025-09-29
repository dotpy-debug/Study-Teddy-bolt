export interface Subject {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  completedAt?: string;
  estimatedMinutes?: number;
  actualMinutes: number;
  progressPercentage: number;
  aiGenerated: boolean;
  aiMetadata?: {
    model?: string;
    prompt?: string;
    confidence?: number;
  };
  createdAt: string;
  updatedAt: string;
  subject?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  subjectId?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  estimatedMinutes?: number;
  aiGenerated?: boolean;
  aiMetadata?: {
    model?: string;
    prompt?: string;
    confidence?: number;
  };
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  actualMinutes?: number;
  progressPercentage?: number;
}

export interface TaskQueryParams {
  search?: string;
  subjectIds?: string[];
  priority?: string[];
  status?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CreateSubtaskDto {
  taskId: string;
  title: string;
  order?: number;
}

export interface UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
  order?: number;
}

export interface BatchUpdateTasksDto {
  taskIds: string[];
  updateData: Partial<UpdateTaskDto>;
}

export interface BatchDeleteTasksDto {
  taskIds: string[];
}

export interface ParsedTaskInput {
  title: string;
  subjectId?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
}

export interface TaskParseResponse {
  parsed: ParsedTaskInput;
  createTaskDto: CreateTaskDto;
}

export interface TaskParseAndCreateResponse {
  task: Task;
  parsed: ParsedTaskInput;
  originalInput: string;
}

export interface TaskViewState {
  view: 'list' | 'kanban';
  filters: TaskQueryParams;
  selectedTasks: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}