// Main entry point for shared types and utilities

// Export types (interfaces and type aliases)
export * from './types/user';
export * from './types/task';
export * from './types/ai';
export * from './types/dashboard';
export * from './types/auth';

// Export enums (these take precedence over type aliases with same names)
export * from './enums';

// Export DTOs
export * from './dto';

// Export schemas (but not the conflicting type exports)
export {
  userSchema,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  taskSchema,
  createTaskSchema,
  updateTaskSchema,
  chatMessageSchema,
  generatePracticeSchema,
  explainConceptSchema,
  studySessionSchema,
  createStudySessionSchema,
  paginationSchema,
  taskFilterSchema,
  dateRangeSchema,
} from './schemas';

// Export utilities
export * from './utils';