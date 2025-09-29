export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export interface UserProfile {
  id: string;
  userId: string;
  bio?: string;
  gradeLevel?: string;
  subjects: string[];
  studyGoals?: string;
  preferredStudyTime?: string;
  timezone: string;
}

export interface UserPreferences {
  notifications: boolean;
  emailAlerts: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  pomodoroLength: number;
  breakLength: number;
}