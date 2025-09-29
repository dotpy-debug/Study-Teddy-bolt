export interface BaseEmailJobData {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  priority?: number; // 0-100, higher = more priority
  scheduledFor?: Date;
  respectQuietHours?: boolean;
  maxRetries?: number;
}

export interface WelcomeEmailJobData extends BaseEmailJobData {
  type: 'welcome';
  verificationUrl?: string;
}

export interface VerificationEmailJobData extends BaseEmailJobData {
  type: 'verification';
  verificationToken: string;
  verificationUrl: string;
}

export interface PasswordResetEmailJobData extends BaseEmailJobData {
  type: 'password_reset';
  resetToken: string;
  resetUrl: string;
  requestedAt: Date;
}

export interface TaskReminderEmailJobData extends BaseEmailJobData {
  type: 'task_reminder';
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subjectName?: string;
  reminderType: 'due_soon' | 'overdue' | 'daily_digest';
}

export interface FocusSessionAlertEmailJobData extends BaseEmailJobData {
  type: 'focus_session_alert';
  sessionId: string;
  sessionType: 'completed' | 'interrupted' | 'milestone';
  durationMinutes: number;
  focusScore?: number;
  taskTitle?: string;
  subjectName?: string;
  pomodoroCount?: number;
}

export interface AchievementEmailJobData extends BaseEmailJobData {
  type: 'achievement';
  achievementType:
    | 'goal_completed'
    | 'streak_milestone'
    | 'focus_milestone'
    | 'task_completion_streak';
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon?: string;
  relatedData?: {
    goalId?: string;
    streakCount?: number;
    totalMinutes?: number;
    tasksCompleted?: number;
  };
}

export interface WeeklyDigestEmailJobData extends BaseEmailJobData {
  type: 'weekly_digest';
  weekStartDate: Date;
  weekEndDate: Date;
  stats: {
    totalStudyMinutes: number;
    tasksCompleted: number;
    focusSessionsCompleted: number;
    averageFocusScore: number;
    longestStudySession: number;
    mostProductiveDay: string;
    subjectBreakdown: Array<{
      subjectName: string;
      studyMinutes: number;
      tasksCompleted: number;
    }>;
    achievements: Array<{
      title: string;
      description: string;
      earnedAt: Date;
    }>;
    upcomingTasks: Array<{
      title: string;
      dueDate: Date;
      priority: string;
      subjectName?: string;
    }>;
  };
}

export type EmailJobData =
  | WelcomeEmailJobData
  | VerificationEmailJobData
  | PasswordResetEmailJobData
  | TaskReminderEmailJobData
  | FocusSessionAlertEmailJobData
  | AchievementEmailJobData
  | WeeklyDigestEmailJobData;

export interface EmailJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  repeat?: {
    pattern?: string; // Cron pattern
    every?: number; // Milliseconds
    limit?: number;
  };
  removeOnComplete?: number | boolean;
  removeOnFail?: number | boolean;
}

export interface WeeklyDigestJobData {
  userId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  timezone: string;
  userPreferences: {
    emailEnabled: boolean;
    weeklyDigestEnabled: boolean;
    digestTime: string; // HH:MM format
    digestDay: number; // 1 = Monday
  };
}

export interface RetryEmailJobData {
  originalJobId: string;
  emailDeliveryLogId: string;
  attemptNumber: number;
  originalJobData: EmailJobData;
}

// Email template data interfaces
export interface WelcomeTemplateData {
  userName: string;
  verificationUrl?: string;
  appUrl: string;
  supportEmail: string;
}

export interface VerificationTemplateData {
  userName: string;
  verificationUrl: string;
  expiryHours: number;
  supportEmail: string;
}

export interface PasswordResetTemplateData {
  userName: string;
  resetUrl: string;
  requestedAt: string;
  expiryHours: number;
  ipAddress?: string;
  supportEmail: string;
}

export interface TaskReminderTemplateData {
  userName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  dueDateFormatted: string;
  priority: string;
  priorityColor: string;
  subjectName?: string;
  subjectColor?: string;
  reminderType: string;
  dashboardUrl: string;
  taskUrl: string;
}

export interface FocusSessionAlertTemplateData {
  userName: string;
  sessionType: string;
  durationMinutes: number;
  durationFormatted: string;
  focusScore?: number;
  taskTitle?: string;
  subjectName?: string;
  pomodoroCount?: number;
  sessionSummary: string;
  dashboardUrl: string;
  statsUrl: string;
}

export interface AchievementTemplateData {
  userName: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon: string;
  achievementType: string;
  relatedStats?: string;
  celebrationMessage: string;
  dashboardUrl: string;
  achievementsUrl: string;
}

export interface WeeklyDigestTemplateData {
  userName: string;
  weekStartDate: string;
  weekEndDate: string;
  weekRange: string;
  totalStudyMinutes: number;
  totalStudyFormatted: string;
  tasksCompleted: number;
  focusSessionsCompleted: number;
  averageFocusScore: number;
  longestStudySession: number;
  longestStudyFormatted: string;
  mostProductiveDay: string;
  subjectBreakdown: Array<{
    subjectName: string;
    studyMinutes: number;
    studyFormatted: string;
    tasksCompleted: number;
    percentage: number;
  }>;
  achievements: Array<{
    title: string;
    description: string;
    earnedAt: string;
    icon: string;
  }>;
  upcomingTasks: Array<{
    title: string;
    dueDate: string;
    dueDateFormatted: string;
    priority: string;
    priorityColor: string;
    subjectName?: string;
    isOverdue: boolean;
  }>;
  weeklyGoalProgress?: {
    targetMinutes: number;
    achievedMinutes: number;
    percentage: number;
    goalMet: boolean;
  };
  motivationalMessage: string;
  dashboardUrl: string;
  tasksUrl: string;
  analyticsUrl: string;
  unsubscribeUrl: string;
}

export type EmailTemplateData =
  | WelcomeTemplateData
  | VerificationTemplateData
  | PasswordResetTemplateData
  | TaskReminderTemplateData
  | FocusSessionAlertTemplateData
  | AchievementTemplateData
  | WeeklyDigestTemplateData;
