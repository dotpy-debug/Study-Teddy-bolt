import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  subjectsApi,
  type Subject,
  type CreateSubjectDto,
  type UpdateSubjectDto,
  type SubjectQueryParams,
  type SubjectStats
} from '@/lib/api';
import { queryKeys, invalidateQueries } from '@/lib/react-query';
import { toast } from 'react-hot-toast';

// Get all subjects
export function useSubjects(params?: SubjectQueryParams) {
  return useQuery({
    queryKey: queryKeys.subjects.list(params),
    queryFn: async () => {
      const result = await subjectsApi.getSubjects(params);
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get active subjects only
export function useActiveSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects.active(),
    queryFn: async () => {
      const result = await subjectsApi.getActiveSubjects();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get subject by ID
export function useSubject(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(id),
    queryFn: async () => {
      const result = await subjectsApi.getSubjectById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get subject statistics
export function useSubjectStats(id?: string, timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month') {
  return useQuery({
    queryKey: queryKeys.subjects.stats(id, timeRange),
    queryFn: async () => {
      const result = await subjectsApi.getSubjectStats(id, timeRange);
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get subject progress
export function useSubjectProgress(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subjects.progress(id),
    queryFn: async () => {
      const result = await subjectsApi.getSubjectProgress(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Get subject schedule
export function useSubjectSchedule(id?: string) {
  return useQuery({
    queryKey: queryKeys.subjects.schedule(id),
    queryFn: async () => {
      const result = await subjectsApi.getSubjectSchedule(id);
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get subject resources
export function useSubjectResources(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.subjects.resources(id),
    queryFn: async () => {
      const result = await subjectsApi.getSubjectResources(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create subject mutation
export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubjectDto) => {
      const result = await subjectsApi.createSubject(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch subjects list
      invalidateQueries.onSubjectUpdate();

      // Add the new subject to the cache
      queryClient.setQueryData(queryKeys.subjects.detail(data!.id), data);

      toast.success('Subject created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create subject');
    },
  });
}

// Update subject mutation
export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSubjectDto }) => {
      const result = await subjectsApi.updateSubject(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, { id }) => {
      // Update the subject in the cache
      queryClient.setQueryData(queryKeys.subjects.detail(id), data);

      // Invalidate related queries
      invalidateQueries.onSubjectUpdate();

      toast.success('Subject updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update subject');
    },
  });
}

// Delete subject mutation
export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await subjectsApi.deleteSubject(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, id) => {
      // Remove the subject from all queries
      queryClient.removeQueries({ queryKey: queryKeys.subjects.detail(id) });

      // Invalidate subjects list
      invalidateQueries.onSubjectUpdate();

      toast.success('Subject deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete subject');
    },
  });
}

// Archive subject mutation
export function useArchiveSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await subjectsApi.archiveSubject(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the subject in the cache
      queryClient.setQueryData(queryKeys.subjects.detail(id), data);

      // Invalidate subjects list
      invalidateQueries.onSubjectUpdate();

      toast.success('Subject archived successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to archive subject');
    },
  });
}

// Duplicate subject mutation
export function useDuplicateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName?: string }) => {
      const result = await subjectsApi.duplicateSubject(id, newName);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      // Add the new subject to the cache
      queryClient.setQueryData(queryKeys.subjects.detail(data!.id), data);

      // Invalidate subjects list
      invalidateQueries.onSubjectUpdate();

      toast.success('Subject duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to duplicate subject');
    },
  });
}

// Reorder subjects mutation
export function useReorderSubjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subjectIds: string[]) => {
      const result = await subjectsApi.reorderSubjects(subjectIds);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      // Update the subjects list in the cache
      queryClient.setQueryData(queryKeys.subjects.list(), data);

      toast.success('Subjects reordered successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to reorder subjects');
    },
  });
}