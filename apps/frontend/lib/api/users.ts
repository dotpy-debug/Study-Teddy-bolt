import { apiClient, type ApiError } from './client';

// Types for Users API
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  timezone?: string;
  locale?: string;
  role: 'user' | 'admin' | 'moderator';
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
  preferences?: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
    theme: 'light' | 'dark' | 'system';
    notifications: {
      email: boolean;
      push: boolean;
      inApp: boolean;
    };
  };
  studySettings?: {
    defaultPomodoroLength: number;
    defaultBreakLength: number;
    longBreakLength: number;
    longBreakInterval: number;
    autoStartBreaks: boolean;
    autoStartSessions: boolean;
    focusMode: boolean;
    studyReminders: boolean;
  };
  achievements?: {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: string;
  }[];
  stats?: {
    totalStudyTime: number;
    totalSessions: number;
    averageSessionLength: number;
    totalTasks: number;
    completedTasks: number;
    currentStreak: number;
    longestStreak: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  timezone?: string;
  locale?: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    weekStartsOn?: 0 | 1;
    theme?: 'light' | 'dark' | 'system';
    notifications?: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
    };
  };
  studySettings?: {
    defaultPomodoroLength?: number;
    defaultBreakLength?: number;
    longBreakLength?: number;
    longBreakInterval?: number;
    autoStartBreaks?: boolean;
    autoStartSessions?: boolean;
    focusMode?: boolean;
    studyReminders?: boolean;
  };
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserStats {
  userId: string;
  overview: {
    totalStudyTime: number;
    totalStudyTimeFormatted: string;
    totalSessions: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    averageSessionLength: number;
    averageSessionLengthFormatted: string;
    currentStreak: number;
    longestStreak: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
  };
  thisWeek: {
    studyTime: number;
    studyTimeFormatted: string;
    sessions: number;
    tasksCompleted: number;
    focusScore: number;
    goals: {
      studyTimeGoal: number;
      studyTimeProgress: number;
      sessionsGoal: number;
      sessionsProgress: number;
      tasksGoal: number;
      tasksProgress: number;
    };
  };
  thisMonth: {
    studyTime: number;
    studyTimeFormatted: string;
    sessions: number;
    tasksCompleted: number;
    focusScore: number;
    goals: {
      studyTimeGoal: number;
      studyTimeProgress: number;
      sessionsGoal: number;
      sessionsProgress: number;
      tasksGoal: number;
      tasksProgress: number;
    };
  };
  subjects: {
    subjectId: string;
    name: string;
    color: string;
    studyTime: number;
    sessions: number;
    tasksCompleted: number;
    averageScore: number;
  }[];
  recentActivity: {
    date: string;
    sessions: number;
    studyTime: number;
    tasksCompleted: number;
  }[];
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'study' | 'streak' | 'task' | 'time' | 'focus' | 'special';
  type: 'bronze' | 'silver' | 'gold' | 'platinum' | 'special';
  points: number;
  requirements: {
    type: string;
    value: number;
    description: string;
  }[];
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'session_started' | 'session_completed' | 'task_completed' | 'achievement_unlocked' | 'goal_achieved' | 'streak_milestone';
  title: string;
  description: string;
  metadata?: Record<string, any>;
  points?: number;
  createdAt: string;
}

export interface DeleteAccountDto {
  password: string;
  reason?: string;
  feedback?: string;
}

// API result interface
export interface UserResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export const usersApi = {
  // Get current user
  getCurrentUser: async (): Promise<UserResult<User>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: User
      }>('/users/me');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update current user
  updateCurrentUser: async (data: UpdateUserDto): Promise<UserResult<User>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: User;
        message: string
      }>('/users/me', data);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get user profile
  getProfile: async (): Promise<UserResult<UserProfile>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: UserProfile
      }>('/users/profile');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update user profile
  updateProfile: async (data: UpdateProfileDto): Promise<UserResult<UserProfile>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: UserProfile;
        message: string
      }>('/users/profile', data);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Upload avatar
  uploadAvatar: async (file: File): Promise<UserResult<{ avatarUrl: string }>> => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/users/avatar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      return {
        data: result.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Delete avatar
  deleteAvatar: async (): Promise<UserResult<void>> => {
    try {
      await apiClient.delete<{
        success: boolean;
        message: string
      }>('/users/avatar');

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Change password
  changePassword: async (data: ChangePasswordDto): Promise<UserResult<void>> => {
    try {
      await apiClient.put<{
        success: boolean;
        message: string
      }>('/users/password', data);

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get user statistics
  getStats: async (): Promise<UserResult<UserStats>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: UserStats
      }>('/users/stats');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get user achievements
  getAchievements: async (): Promise<UserResult<UserAchievement[]>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: UserAchievement[]
      }>('/users/achievements');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get user activity
  getActivity: async (limit = 50, offset = 0): Promise<UserResult<{
    activities: UserActivity[];
    total: number;
    hasMore: boolean;
  }>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          activities: UserActivity[];
          total: number;
          hasMore: boolean;
        }
      }>(`/users/activity?limit=${limit}&offset=${offset}`);

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Export user data
  exportData: async (format: 'json' | 'csv' = 'json'): Promise<UserResult<Blob>> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/users/export?format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      return {
        data: blob,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Delete account
  deleteAccount: async (data: DeleteAccountDto): Promise<UserResult<void>> => {
    try {
      await apiClient.delete<{
        success: boolean;
        message: string
      }>('/users/account', { data });

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Deactivate account
  deactivateAccount: async (reason?: string): Promise<UserResult<void>> => {
    try {
      await apiClient.put<{
        success: boolean;
        message: string
      }>('/users/deactivate', { reason });

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Reactivate account
  reactivateAccount: async (): Promise<UserResult<User>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: User;
        message: string
      }>('/users/reactivate');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update study settings
  updateStudySettings: async (settings: UpdateProfileDto['studySettings']): Promise<UserResult<UserProfile>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: UserProfile;
        message: string
      }>('/users/study-settings', { studySettings: settings });

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Update preferences
  updatePreferences: async (preferences: UpdateProfileDto['preferences']): Promise<UserResult<UserProfile>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: UserProfile;
        message: string
      }>('/users/preferences', { preferences });

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Get user sessions (login history)
  getSessions: async (): Promise<UserResult<{
    id: string;
    deviceInfo: string;
    ipAddress: string;
    location?: string;
    isCurrent: boolean;
    lastAccessedAt: string;
    createdAt: string;
  }[]>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          id: string;
          deviceInfo: string;
          ipAddress: string;
          location?: string;
          isCurrent: boolean;
          lastAccessedAt: string;
          createdAt: string;
        }[]
      }>('/users/sessions');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Revoke user session
  revokeSession: async (sessionId: string): Promise<UserResult<void>> => {
    try {
      await apiClient.delete<{
        success: boolean;
        message: string
      }>(`/users/sessions/${sessionId}`);

      return {
        data: null,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  },

  // Revoke all other sessions
  revokeAllOtherSessions: async (): Promise<UserResult<{ revokedCount: number }>> => {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        data: { revokedCount: number };
        message: string
      }>('/users/sessions/others');

      return {
        data: response.data,
        error: null,
        isLoading: false
      };
    } catch (error) {
      return {
        data: null,
        error: error as ApiError,
        isLoading: false
      };
    }
  }
};

// Export types for use in components
export type {
  User,
  UserProfile,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserStats,
  UserAchievement,
  UserActivity,
  DeleteAccountDto,
  UserResult
};