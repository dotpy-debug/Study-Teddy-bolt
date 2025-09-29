export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  success: boolean;
  errors?: string[];
  timestamp: string;
  requestId?: string;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'student' | 'admin';
  preferences: UserPreferences;
  subscription?: UserSubscription;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  desktop: boolean;
  taskReminders: boolean;
  deadlineAlerts: boolean;
  weeklyReports: boolean;
}

export interface PrivacyPreferences {
  analyticsOptIn: boolean;
  shareProgressWithTeachers: boolean;
  publicProfile: boolean;
}

export interface UserSubscription {
  plan: 'free' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  renewsAt?: string;
  cancelledAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  subjectId?: string;
  subject?: Subject;
  tags: string[];
  subtasks: Subtask[];
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  presetId?: string;
  focusDuration: number;
  breakDuration: number;
  sessionsCompleted: number;
  sessionGoal: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startedAt: string;
  endedAt?: string;
  totalFocusTime: number;
  distractions: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: 'academic' | 'skill' | 'habit' | 'project';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  targetDate?: string;
  progress: number; // 0-100
  milestones: GoalMilestone[];
  subjectId?: string;
  subject?: Subject;
  createdAt: string;
  updatedAt: string;
}

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  targetDate?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  studyTime: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    average: number;
  };
  taskCompletion: {
    completed: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  focusMetrics: {
    averageSessionLength: number;
    totalSessions: number;
    averageDistractions: number;
    focusScore: number;
  };
  subjectBreakdown: Array<{
    subjectId: string;
    subjectName: string;
    timeSpent: number;
    tasksCompleted: number;
    percentage: number;
  }>;
  streaks: {
    current: number;
    longest: number;
    lastStudyDate?: string;
  };
}