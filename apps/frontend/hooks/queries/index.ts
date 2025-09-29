// Export all query hooks for easy importing
export * from './use-subjects';
export * from './use-focus-sessions';
export * from './use-tasks';

// Re-export React Query utilities
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery
} from '@tanstack/react-query';

export { useQuery, useMutation, useQueryClient, useInfiniteQuery };

// Re-export our custom React Query configuration
export {
  queryClient,
  queryKeys,
  invalidateQueries,
  optimisticUpdates,
  prefetchQueries,
  backgroundSync
} from '@/lib/react-query';