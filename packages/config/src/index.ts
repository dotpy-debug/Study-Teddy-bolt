export const APP_CONFIG = {
  name: 'Study Teddy',
  version: '1.0.0',
  description: 'AI-powered study planner and tutor',
  defaultTimezone: 'UTC',
  supportEmail: 'support@studyteddy.com',
};

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export const AUTH_CONFIG = {
  jwtExpiresIn: '7d',
  refreshExpiresIn: '30d',
  bcryptRounds: 10,
  passwordMinLength: 6,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
};

export const POMODORO_CONFIG = {
  defaultWorkDuration: 25 * 60, // 25 minutes in seconds
  defaultShortBreak: 5 * 60, // 5 minutes
  defaultLongBreak: 15 * 60, // 15 minutes
  sessionsBeforeLongBreak: 4,
};

export const GAMIFICATION_CONFIG = {
  pointsPerMinute: 10,
  streakBonus: 50,
  achievementBonus: 100,
  levelUpThreshold: 1000,
};

export const LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFlashcardsPerDeck: 500,
  maxDecksPerUser: 100,
  maxAssignmentAttachments: 10,
  maxStudySessionHours: 12,
};

export const ROUTES = {
  auth: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
  },
  dashboard: {
    home: '/dashboard',
    subjects: '/dashboard/subjects',
    sessions: '/dashboard/sessions',
    flashcards: '/dashboard/flashcards',
    assignments: '/dashboard/assignments',
    aiTutor: '/dashboard/ai-tutor',
    analytics: '/dashboard/analytics',
    calendar: '/dashboard/calendar',
    achievements: '/dashboard/achievements',
    settings: '/dashboard/settings',
  },
};

export const COLORS = {
  primary: '#4F46E5',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  info: '#3B82F6',
  success: '#22C55E',
  neutral: '#6B7280',
};

// Export environment configuration
export * from './env';
export * from './env-checker';