import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullable().optional(),
  authProvider: z.enum(['local', 'google']),
  googleId: z.string().nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  authProvider: z.enum(['local', 'google']),
  googleId: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  email: z.string().email().optional(),
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  ),
  name: z.string().min(1).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  ),
});

// Task schemas
export const taskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  subject: z.string().max(50).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  dueDate: z.union([z.date(), z.string()]).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  completed: z.boolean(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.union([z.date(), z.string()]).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.union([z.date(), z.string()]).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  completed: z.boolean().optional(),
});

// AI Chat schemas
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

export const generatePracticeSchema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  count: z.number().int().min(1).max(20).optional().default(5),
});

export const explainConceptSchema = z.object({
  concept: z.string().min(1).max(200),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
});

// Study Session schemas
export const studySessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  taskId: z.string().uuid().nullable().optional(),
  durationMinutes: z.number().int().min(1).max(480), // max 8 hours
  date: z.union([z.date(), z.string()]),
  notes: z.string().max(500).nullable().optional(),
  createdAt: z.union([z.date(), z.string()]),
});

export const createStudySessionSchema = z.object({
  taskId: z.string().uuid().optional(),
  durationMinutes: z.number().int().min(1).max(480),
  date: z.union([z.date(), z.string()]).optional(),
  notes: z.string().max(500).optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Filter schemas
export const taskFilterSchema = z.object({
  subject: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  completed: z.boolean().optional(),
  startDate: z.union([z.date(), z.string()]).optional(),
  endDate: z.union([z.date(), z.string()]).optional(),
  search: z.string().optional(),
});

export const dateRangeSchema = z.object({
  start: z.union([z.date(), z.string()]),
  end: z.union([z.date(), z.string()]),
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type GeneratePractice = z.infer<typeof generatePracticeSchema>;
export type ExplainConcept = z.infer<typeof explainConceptSchema>;
export type StudySession = z.infer<typeof studySessionSchema>;
export type CreateStudySession = z.infer<typeof createStudySessionSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;