export interface DashboardStats {
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  studyTime: {
    thisWeek: number;
    daily: number;
  };
  aiChats: number;
  streak: number;
}

export interface WeeklyOverview {
  date: string;
  minutes: number;
  tasksCompleted: number;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  durationMinutes: number;
  date: string;
  createdAt: string;
}