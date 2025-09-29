// Re-export all DTOs from types for convenience
export type {
  CreateUserDto,
  UpdateUserDto,
} from './types/user';

export type {
  CreateTaskDto,
  UpdateTaskDto,
  CreateStudySessionDto,
} from './types/task';

export type {
  CreateChatDto,
  GeneratePracticeDto,
  ExplainConceptDto,
} from './types/ai';

export type {
  LoginDto,
  RegisterDto,
  GoogleAuthDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './types/auth';

// Pagination DTOs
export interface PaginationDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Common response DTOs
export interface ApiResponseDto<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ValidationErrorDto {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorResponseDto {
  statusCode: number;
  message: string;
  error?: string;
  validationErrors?: ValidationErrorDto[];
  timestamp: string;
  path: string;
}