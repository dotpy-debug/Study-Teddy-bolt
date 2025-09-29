export interface DashboardStats {
  tasks: TaskMetrics;
  studyTime: StudyTimeMetrics;
  aiChats: number;
  streak: number;
  ai: {
    totalChats: number;
  };
  time: {
    totalMinutes: number;
  };
  streaks: {
    current: number;
  };
}

export interface TaskMetrics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  dueToday: number;
  reviewDue: number;
}

export interface StudyTimeMetrics {
  thisWeek: number; // minutes
  today: number; // minutes
  daily: number; // average minutes per day
  total: number; // total minutes all time
}

export interface WeeklyOverview {
  date: string;
  minutes: number;
  tasksCompleted: number;
}

export interface StudyStreak {
  current: number;
  longest: number;
  lastStudyDate: Date | string;
  streakDates: string[];
}

export interface SubjectStats {
  subject: string;
  totalTasks: number;
  completedTasks: number;
  totalStudyTime: number; // minutes
  averageCompletionTime: number; // minutes
}

export interface PerformanceMetrics {
  productivityScore: number; // 0-100
  consistencyScore: number; // 0-100
  focusScore: number; // 0-100
  improvementRate: number; // percentage
}

export interface DashboardFilters {
  dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
  subject?: string;
  taskStatus?: 'all' | 'completed' | 'pending' | 'overdue';
}