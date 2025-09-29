import { apiClient, type ApiError } from './client';

// Types for Subjects API
export interface Subject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  credits?: number;
  semester?: string;
  professor?: string;
  room?: string;
  schedule?: WeeklySchedule[];
  goals?: string[];
  resources?: SubjectResource[];
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  location?: string;
  type: 'lecture' | 'seminar' | 'lab' | 'tutorial' | 'exam' | 'office_hours';
}

export interface SubjectResource {
  id: string;
  title: string;
  type: 'book' | 'article' | 'video' | 'website' | 'document' | 'tool' | 'other';
  url?: string;
  description?: string;
  tags?: string[];
  isRequired: boolean;
  addedAt: string;
}

export interface CreateSubjectDto {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  credits?: number;
  semester?: string;
  professor?: string;
  room?: string;
  schedule?: WeeklySchedule[];
  goals?: string[];
  resources?: Omit<SubjectResource, 'id' | 'addedAt'>[];
}

export interface UpdateSubjectDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  credits?: number;
  semester?: string;
  professor?: string;
  room?: string;
  schedule?: WeeklySchedule[];
  goals?: string[];
  isActive?: boolean;
  isArchived?: boolean;
}

export interface SubjectStats {
  subjectId: string;
  name: string;
  color: string;
  totalStudyTime: number; // in minutes
  tasksCompleted: number;
  tasksTotal: number;
  averageScore: number;
  lastStudied?: string; // ISO date string
  upcomingDeadlines: number;
  focusSessionsCount: number;
  averageSessionDuration: number; // in minutes
  productivityTrend: 'up' | 'down' | 'stable';
}

export interface SubjectProgress {
  subjectId: string;
  weeklyProgress: {
    week: string; // ISO week format
    studyTime: number;
    tasksCompleted: number;
    focusScore: number;
  }[];
  monthlyGoals: {
    goalId: string;
    title: string;
    progress: number; // percentage
    target: number;
    current: number;
    unit: string;
  }[];
  upcomingEvents: {
    id: string;
    title: string;
    type: 'assignment' | 'exam' | 'quiz' | 'project' | 'lecture';
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
  }[];
}

export interface CreateResourceDto {
  title: string;
  type: 'book' | 'article' | 'video' | 'website' | 'document' | 'tool' | 'other';
  url?: string;
  description?: string;
  tags?: string[];
  isRequired: boolean;
}

export interface UpdateResourceDto {
  title?: string;
  type?: 'book' | 'article' | 'video' | 'website' | 'document' | 'tool' | 'other';
  url?: string;
  description?: string;
  tags?: string[];
  isRequired?: boolean;
}

export interface SubjectQueryParams {
  limit?: number;
  offset?: number;
  isActive?: boolean;
  isArchived?: boolean;
  semester?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'lastStudied' | 'studyTime';
  sortOrder?: 'asc' | 'desc';
}

// API result interface
export interface SubjectResult<T = unknown> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export const subjectsApi = {
  // Get all subjects with filtering
  getSubjects: async (params?: SubjectQueryParams): Promise<SubjectResult<Subject[]>> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.isArchived !== undefined) queryParams.append('isArchived', params.isArchived.toString());
      if (params?.semester) queryParams.append('semester', params.semester);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `/subjects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<{ success: boolean; data: Subject[] }>(url);

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

  // Get active subjects only
  getActiveSubjects: async (): Promise<SubjectResult<Subject[]>> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Subject[] }>('/subjects/active');

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

  // Get subject by ID
  getSubjectById: async (id: string): Promise<SubjectResult<Subject>> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Subject }>(`/subjects/${id}`);

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

  // Create a new subject
  createSubject: async (data: CreateSubjectDto): Promise<SubjectResult<Subject>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: Subject;
        message: string
      }>('/subjects', data);

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

  // Update a subject
  updateSubject: async (id: string, data: UpdateSubjectDto): Promise<SubjectResult<Subject>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: Subject;
        message: string
      }>(`/subjects/${id}`, data);

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

  // Delete a subject
  deleteSubject: async (id: string): Promise<SubjectResult<void>> => {
    try {
      await apiClient.delete<{ success: boolean; message: string }>(`/subjects/${id}`);

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

  // Archive a subject
  archiveSubject: async (id: string): Promise<SubjectResult<Subject>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: Subject;
        message: string
      }>(`/subjects/${id}/archive`);

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

  // Unarchive a subject
  unarchiveSubject: async (id: string): Promise<SubjectResult<Subject>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: Subject;
        message: string
      }>(`/subjects/${id}/unarchive`);

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

  // Get subject statistics
  getSubjectStats: async (
    id?: string,
    timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<SubjectResult<SubjectStats | SubjectStats[]>> => {
    try {
      const params = new URLSearchParams({ timeRange });
      const url = id
        ? `/subjects/${id}/stats?${params.toString()}`
        : `/subjects/stats?${params.toString()}`;

      const response = await apiClient.get<{
        success: boolean;
        data: SubjectStats | SubjectStats[]
      }>(url);

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

  // Get subject progress
  getSubjectProgress: async (id: string): Promise<SubjectResult<SubjectProgress>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: SubjectProgress
      }>(`/subjects/${id}/progress`);

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

  // Get subject schedule
  getSubjectSchedule: async (id?: string): Promise<SubjectResult<{
    subjectId: string;
    name: string;
    color: string;
    schedule: WeeklySchedule[];
  }[]>> => {
    try {
      const url = id ? `/subjects/${id}/schedule` : '/subjects/schedule';
      const response = await apiClient.get<{
        success: boolean;
        data: {
          subjectId: string;
          name: string;
          color: string;
          schedule: WeeklySchedule[];
        }[]
      }>(url);

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

  // Resource management
  getSubjectResources: async (id: string): Promise<SubjectResult<SubjectResource[]>> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: SubjectResource[]
      }>(`/subjects/${id}/resources`);

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

  // Add resource to subject
  addResource: async (id: string, resource: CreateResourceDto): Promise<SubjectResult<SubjectResource>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: SubjectResource;
        message: string
      }>(`/subjects/${id}/resources`, resource);

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

  // Update subject resource
  updateResource: async (
    subjectId: string,
    resourceId: string,
    updates: UpdateResourceDto
  ): Promise<SubjectResult<SubjectResource>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: SubjectResource;
        message: string
      }>(`/subjects/${subjectId}/resources/${resourceId}`, updates);

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

  // Remove resource from subject
  removeResource: async (subjectId: string, resourceId: string): Promise<SubjectResult<void>> => {
    try {
      await apiClient.delete<{ success: boolean; message: string }>(
        `/subjects/${subjectId}/resources/${resourceId}`
      );

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

  // Reorder subjects (for dashboard display)
  reorderSubjects: async (subjectIds: string[]): Promise<SubjectResult<Subject[]>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: Subject[];
        message: string
      }>('/subjects/reorder', { subjectIds });

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

  // Duplicate a subject
  duplicateSubject: async (id: string, newName?: string): Promise<SubjectResult<Subject>> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: Subject;
        message: string
      }>(`/subjects/${id}/duplicate`, { newName });

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

  // Export subject data
  exportSubject: async (
    id: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<SubjectResult<Blob>> => {
    try {
      const params = new URLSearchParams({ format });
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/subjects/${id}/export?${params.toString()}`,
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

  // Bulk operations
  bulkArchiveSubjects: async (subjectIds: string[]): Promise<SubjectResult<Subject[]>> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: Subject[];
        message: string
      }>('/subjects/bulk/archive', { subjectIds });

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

  bulkDeleteSubjects: async (subjectIds: string[]): Promise<SubjectResult<void>> => {
    try {
      await apiClient.delete<{ success: boolean; message: string }>('/subjects/bulk', {
        data: { subjectIds }
      });

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
  }
};

// Export types for use in components
export type {
  Subject,
  WeeklySchedule,
  SubjectResource,
  CreateSubjectDto,
  UpdateSubjectDto,
  SubjectStats,
  SubjectProgress,
  CreateResourceDto,
  UpdateResourceDto,
  SubjectQueryParams,
  SubjectResult
};