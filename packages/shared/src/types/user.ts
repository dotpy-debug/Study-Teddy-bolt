// AuthProvider is exported as an enum from ../enums.ts
import { AuthProvider } from '../enums';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  authProvider: AuthProvider;
  googleId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserProfile extends User {
  studyStreak: number;
  totalStudyHours: number;
  tasksCompleted: number;
  aiChatsCount: number;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  name: string;
  avatarUrl?: string;
  authProvider: AuthProvider;
  googleId?: string;
}

export interface UpdateUserDto {
  name?: string;
  avatarUrl?: string;
  email?: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date | string;
}