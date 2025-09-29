// Centralized enums for the application

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum StudyDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export enum Subject {
  MATHEMATICS = 'mathematics',
  SCIENCE = 'science',
  ENGLISH = 'english',
  HISTORY = 'history',
  GEOGRAPHY = 'geography',
  COMPUTER_SCIENCE = 'computer_science',
  PHYSICS = 'physics',
  CHEMISTRY = 'chemistry',
  BIOLOGY = 'biology',
  ECONOMICS = 'economics',
  BUSINESS = 'business',
  ART = 'art',
  MUSIC = 'music',
  PHYSICAL_EDUCATION = 'physical_education',
  OTHER = 'other',
}

export enum NotificationType {
  TASK_REMINDER = 'task_reminder',
  TASK_OVERDUE = 'task_overdue',
  STREAK_MILESTONE = 'streak_milestone',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  STUDY_SESSION_COMPLETE = 'study_session_complete',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}