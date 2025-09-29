import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  focusSessionsApi,
  type FocusSession,
  type CreateSessionDto,
  type UpdateSessionDto,
  type SessionQueryParams,
  type SessionStatsQueryParams,
  type SessionStats
} from '@/lib/api';
import { queryKeys, invalidateQueries, backgroundSync } from '@/lib/react-query';
import { toast } from 'react-hot-toast';
import { useEffect, useRef } from 'react';

// Get all focus sessions
export function useFocusSessions(params?: SessionQueryParams) {
  return useQuery({
    queryKey: queryKeys.focusSessions.list(params),
    queryFn: async () => {
      const result = await focusSessionsApi.getSessions(params);
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get active focus session
export function useActiveSession() {
  return useQuery({
    queryKey: queryKeys.focusSessions.active(),
    queryFn: async () => {
      const result = await focusSessionsApi.getActiveSession();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds - more frequent updates for active sessions
    refetchInterval: 30 * 1000, // Poll every 30 seconds
  });
}

// Get paused focus sessions
export function usePausedSessions() {
  return useQuery({
    queryKey: queryKeys.focusSessions.paused(),
    queryFn: async () => {
      const result = await focusSessionsApi.getPausedSessions();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Get focus session by ID
export function useFocusSession(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.focusSessions.detail(id),
    queryFn: async () => {
      const result = await focusSessionsApi.getSessionById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Get real-time session status with current duration
export function useSessionStatus(id: string, enabled = true) {
  const cleanupRef = useRef<(() => void) | null>(null);

  const query = useQuery({
    queryKey: queryKeys.focusSessions.status(id),
    queryFn: async () => {
      const result = await focusSessionsApi.getSessionStatus(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 1000, // 5 seconds for real-time updates
    refetchInterval: 5 * 1000, // Poll every 5 seconds
  });

  // Set up background polling for active sessions
  useEffect(() => {
    if (enabled && id && query.data?.status === 'active') {
      cleanupRef.current = backgroundSync.startActiveSessionPolling(id);
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, id, query.data?.status]);

  return query;
}

// Get session statistics
export function useSessionStats(params?: SessionStatsQueryParams) {
  return useQuery({
    queryKey: queryKeys.focusSessions.stats(params),
    queryFn: async () => {
      const result = await focusSessionsApi.getStats(params);
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get session analytics
export function useSessionAnalytics(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.focusSessions.analytics(id),
    queryFn: async () => {
      const result = await focusSessionsApi.getSessionAnalytics(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Start focus session mutation
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSessionDto) => {
      const result = await focusSessionsApi.startSession(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      // Add the new session to the cache
      queryClient.setQueryData(queryKeys.focusSessions.detail(data!.id), data);

      // Update active session
      queryClient.setQueryData(queryKeys.focusSessions.active(), data);

      // Invalidate related queries
      invalidateQueries.onSessionUpdate();

      toast.success(`${data!.type} session started successfully`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to start session');
    },
  });
}

// Update focus session mutation
export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSessionDto }) => {
      const result = await focusSessionsApi.updateSession(id, data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, { id }) => {
      // Update the session in the cache
      queryClient.setQueryData(queryKeys.focusSessions.detail(id), data);

      // Invalidate related queries
      invalidateQueries.onSessionUpdate();

      toast.success('Session updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update session');
    },
  });
}

// Pause focus session mutation
export function usePauseSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await focusSessionsApi.pauseSession(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the session in the cache
      queryClient.setQueryData(queryKeys.focusSessions.detail(id), data);

      // Clear active session if this was it
      const activeSession = queryClient.getQueryData(queryKeys.focusSessions.active()) as FocusSession | null;
      if (activeSession?.id === id) {
        queryClient.setQueryData(queryKeys.focusSessions.active(), null);
      }

      // Invalidate related queries
      invalidateQueries.onSessionUpdate();

      toast.success('Session paused successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to pause session');
    },
  });
}

// Resume focus session mutation
export function useResumeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await focusSessionsApi.resumeSession(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the session in the cache
      queryClient.setQueryData(queryKeys.focusSessions.detail(id), data);

      // Set as active session
      queryClient.setQueryData(queryKeys.focusSessions.active(), data);

      // Invalidate related queries
      invalidateQueries.onSessionUpdate();

      toast.success('Session resumed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to resume session');
    },
  });
}

// End focus session mutation
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await focusSessionsApi.endSession(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the session in the cache
      queryClient.setQueryData(queryKeys.focusSessions.detail(id), data);

      // Clear active session if this was it
      const activeSession = queryClient.getQueryData(queryKeys.focusSessions.active()) as FocusSession | null;
      if (activeSession?.id === id) {
        queryClient.setQueryData(queryKeys.focusSessions.active(), null);
      }

      // Invalidate related queries
      invalidateQueries.onSessionUpdate();

      toast.success('Session completed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to end session');
    },
  });
}

// Abandon focus session mutation
export function useAbandonSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await focusSessionsApi.abandonSession(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the session in the cache
      queryClient.setQueryData(queryKeys.focusSessions.detail(id), data);

      // Clear active session if this was it
      const activeSession = queryClient.getQueryData(queryKeys.focusSessions.active()) as FocusSession | null;
      if (activeSession?.id === id) {
        queryClient.setQueryData(queryKeys.focusSessions.active(), null);
      }

      // Invalidate related queries
      invalidateQueries.onSessionUpdate();

      toast.success('Session abandoned');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to abandon session');
    },
  });
}

// Delete focus session mutation
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await focusSessionsApi.deleteSession(id);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, id) => {
      // Remove the session from all queries
      queryClient.removeQueries({ queryKey: queryKeys.focusSessions.detail(id) });

      // Invalidate sessions list
      invalidateQueries.onSessionUpdate();

      toast.success('Session deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete session');
    },
  });
}

// Pomodoro-specific hooks

// Get Pomodoro session
export function usePomodoroSession(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.pomodoro.session(sessionId),
    queryFn: async () => {
      const result = await focusSessionsApi.getPomodoroSession(sessionId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: enabled && !!sessionId,
    staleTime: 5 * 1000, // 5 seconds for real-time updates
    refetchInterval: 5 * 1000, // Poll every 5 seconds
  });
}

// Get default Pomodoro settings
export function useDefaultPomodoroSettings() {
  return useQuery({
    queryKey: queryKeys.pomodoro.settings(),
    queryFn: async () => {
      const result = await focusSessionsApi.getDefaultPomodoroSettings();
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - settings don't change often
  });
}

// Create Pomodoro session mutation
export function useCreatePomodoroSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, settings }: { sessionId: string; settings?: any }) => {
      const result = await focusSessionsApi.createPomodoroSession(sessionId, settings);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, { sessionId }) => {
      // Update the Pomodoro session in the cache
      queryClient.setQueryData(queryKeys.pomodoro.session(sessionId), data);

      toast.success('Pomodoro session started');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to start Pomodoro session');
    },
  });
}

// Complete Pomodoro phase mutation
export function useCompletePomodoroPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await focusSessionsApi.completePomodoroPhase(sessionId);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, sessionId) => {
      // Update the Pomodoro session in the cache
      queryClient.setQueryData(queryKeys.pomodoro.session(sessionId), (old: any) => {
        if (!old) return old;
        return { ...old, ...data };
      });

      // Invalidate session updates
      invalidateQueries.onSessionUpdate();

      toast.success('Phase completed!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to complete phase');
    },
  });
}