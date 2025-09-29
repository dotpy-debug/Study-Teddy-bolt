'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  Subject,
  CreateSubjectData,
  UpdateSubjectData,
  SubjectQueryParams,
  SubjectListResponse,
  Resource,
  CreateResourceData,
  UpdateResourceData,
  ResourceQueryParams,
} from '../types';
import { subjectsApi } from '@/lib/api/subjects';

export function useSubjects(params?: SubjectQueryParams) {
  return useQuery({
    queryKey: ['subjects', params],
    queryFn: () => subjectsApi.getSubjects(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSubject(id: string) {
  return useQuery({
    queryKey: ['subjects', id],
    queryFn: () => subjectsApi.getSubject(id),
    enabled: !!id,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSubjectData) => subjectsApi.createSubject(data),
    onSuccess: (newSubject) => {
      // Invalidate and refetch subjects
      queryClient.invalidateQueries({ queryKey: ['subjects'] });

      toast({
        title: 'Subject created',
        description: `${newSubject.name} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating subject',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubjectData }) =>
      subjectsApi.updateSubject(id, data),
    onSuccess: (updatedSubject) => {
      // Invalidate and refetch subjects
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subjects', updatedSubject.id] });

      toast({
        title: 'Subject updated',
        description: `${updatedSubject.name} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating subject',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => subjectsApi.deleteSubject(id),
    onSuccess: () => {
      // Invalidate and refetch subjects
      queryClient.invalidateQueries({ queryKey: ['subjects'] });

      toast({
        title: 'Subject deleted',
        description: 'Subject has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting subject',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}

export function useSubjectAnalytics(id: string, params?: any) {
  return useQuery({
    queryKey: ['subjects', id, 'analytics', params],
    queryFn: () => subjectsApi.getSubjectAnalytics(id, params),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSubjectDistribution() {
  return useQuery({
    queryKey: ['subjects', 'distribution'],
    queryFn: () => subjectsApi.getSubjectDistribution(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Resource-specific hooks
export function useSubjectResources(subjectId: string, params?: ResourceQueryParams) {
  const { data: subject } = useSubject(subjectId);

  return {
    data: subject?.resources?.resources || [],
    isLoading: false, // Resources are part of subject data
    error: null,
  };
}

export function useCreateSubjectResource(subjectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateSubject = useUpdateSubject();

  return useMutation({
    mutationFn: async (data: CreateResourceData) => {
      const subject = queryClient.getQueryData<Subject>(['subjects', subjectId]);
      if (!subject) throw new Error('Subject not found');

      const newResource: Resource = {
        id: crypto.randomUUID(),
        ...data,
        order: subject.resources?.resources?.length || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedResources = {
        ...subject.resources,
        resources: [...(subject.resources?.resources || []), newResource],
      };

      await updateSubject.mutateAsync({
        id: subjectId,
        data: { resources: updatedResources },
      });

      return newResource;
    },
    onSuccess: (newResource) => {
      queryClient.invalidateQueries({ queryKey: ['subjects', subjectId] });

      toast({
        title: 'Resource added',
        description: `${newResource.title} has been added to your resources.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding resource',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSubjectResource(subjectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateSubject = useUpdateSubject();

  return useMutation({
    mutationFn: async ({ resourceId, data }: { resourceId: string; data: UpdateResourceData }) => {
      const subject = queryClient.getQueryData<Subject>(['subjects', subjectId]);
      if (!subject) throw new Error('Subject not found');

      const updatedResources = {
        ...subject.resources,
        resources: (subject.resources?.resources || []).map(resource =>
          resource.id === resourceId
            ? { ...resource, ...data, updatedAt: new Date().toISOString() }
            : resource
        ),
      };

      await updateSubject.mutateAsync({
        id: subjectId,
        data: { resources: updatedResources },
      });

      return updatedResources.resources?.find(r => r.id === resourceId);
    },
    onSuccess: (updatedResource) => {
      queryClient.invalidateQueries({ queryKey: ['subjects', subjectId] });

      if (updatedResource) {
        toast({
          title: 'Resource updated',
          description: `${updatedResource.title} has been updated.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating resource',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSubjectResource(subjectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateSubject = useUpdateSubject();

  return useMutation({
    mutationFn: async (resourceId: string) => {
      const subject = queryClient.getQueryData<Subject>(['subjects', subjectId]);
      if (!subject) throw new Error('Subject not found');

      const updatedResources = {
        ...subject.resources,
        resources: (subject.resources?.resources || []).filter(r => r.id !== resourceId),
      };

      await updateSubject.mutateAsync({
        id: subjectId,
        data: { resources: updatedResources },
      });

      return resourceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', subjectId] });

      toast({
        title: 'Resource deleted',
        description: 'Resource has been removed from your list.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting resource',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderSubjectResources(subjectId: string) {
  const queryClient = useQueryClient();
  const updateSubject = useUpdateSubject();

  return useMutation({
    mutationFn: async (reorderedResources: Resource[]) => {
      const subject = queryClient.getQueryData<Subject>(['subjects', subjectId]);
      if (!subject) throw new Error('Subject not found');

      const updatedResources = {
        ...subject.resources,
        resources: reorderedResources.map((resource, index) => ({
          ...resource,
          order: index,
          updatedAt: new Date().toISOString(),
        })),
      };

      await updateSubject.mutateAsync({
        id: subjectId,
        data: { resources: updatedResources },
      });

      return updatedResources.resources;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', subjectId] });
    },
    onError: (error: any) => {
      // Silent error handling for reordering
      console.error('Error reordering resources:', error);
    },
  });
}

// Utility hook for subject operations
export function useSubjectOperations() {
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  return {
    createSubject: createSubject.mutate,
    updateSubject: updateSubject.mutate,
    deleteSubject: deleteSubject.mutate,
    isCreating: createSubject.isPending,
    isUpdating: updateSubject.isPending,
    isDeleting: deleteSubject.isPending,
    isLoading: createSubject.isPending || updateSubject.isPending || deleteSubject.isPending,
  };
}

// Utility hook for resource operations
export function useSubjectResourceOperations(subjectId: string) {
  const createResource = useCreateSubjectResource(subjectId);
  const updateResource = useUpdateSubjectResource(subjectId);
  const deleteResource = useDeleteSubjectResource(subjectId);
  const reorderResources = useReorderSubjectResources(subjectId);

  return {
    createResource: createResource.mutate,
    updateResource: updateResource.mutate,
    deleteResource: deleteResource.mutate,
    reorderResources: reorderResources.mutate,
    isCreating: createResource.isPending,
    isUpdating: updateResource.isPending,
    isDeleting: deleteResource.isPending,
    isReordering: reorderResources.isPending,
    isLoading: createResource.isPending || updateResource.isPending || deleteResource.isPending || reorderResources.isPending,
  };
}