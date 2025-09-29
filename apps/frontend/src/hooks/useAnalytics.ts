import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  totalFocusTime: number;
  averageSessionLength: number;
  streakDays: number;
  productivityScore: number;
}

export function useAnalytics(dateRange?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const params = dateRange ? {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      } : {};

      const response = await api.get('/analytics', { params });
      return response.data as AnalyticsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSubjectAnalytics(subjectId: string) {
  return useQuery({
    queryKey: ['analytics', 'subject', subjectId],
    queryFn: async () => {
      const response = await api.get(`/analytics/subjects/${subjectId}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTaskAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'tasks'],
    queryFn: async () => {
      const response = await api.get('/analytics/tasks');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}