export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  breaksTaken: number;
  focusScore: number;
  notes?: string;
  status: SessionStatus;
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

export interface SessionStats {
  totalSessions: number;
  totalDuration: number;
  averageDuration: number;
  averageFocusScore: number;
  currentStreak: number;
  longestStreak: number;
}

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
}