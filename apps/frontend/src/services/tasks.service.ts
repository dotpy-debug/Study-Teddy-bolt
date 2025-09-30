// Tasks Service Stub
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject?: string;
}

class TasksService {
  async getTasks(): Promise<Task[]> {
    return [];
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    throw new Error('Tasks service not implemented');
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    throw new Error('Tasks service not implemented');
  }

  async deleteTask(id: string): Promise<void> {
    throw new Error('Tasks service not implemented');
  }
}

const tasksService = new TasksService();
export default tasksService;
export { Task };