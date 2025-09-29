'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackCustomMetric } from '@/lib/web-vitals';

interface UseOptimizedQueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<T>;
  staleTime?: number; // Time in ms before data is considered stale
  cacheTime?: number; // Time in ms to keep data in cache
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  isStale: boolean;
}

// Simple in-memory cache
const queryCache = new Map<string, {
  data: any;
  timestamp: number;
  staleTime: number;
  cacheTime: number;
}>();

// Cleanup expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > entry.cacheTime) {
      queryCache.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus = true,
  enabled = true,
  onSuccess,
  onError,
}: UseOptimizedQueryOptions<T>) {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    isStale: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchStartTimeRef = useRef<number>(0);

  const getCachedData = useCallback(() => {
    const cached = queryCache.get(queryKey);
    if (!cached) return null;

    const now = Date.now();
    const isStale = now - cached.timestamp > cached.staleTime;
    const isExpired = now - cached.timestamp > cached.cacheTime;

    if (isExpired) {
      queryCache.delete(queryKey);
      return null;
    }

    return { data: cached.data, isStale };
  }, [queryKey]);

  const setCachedData = useCallback((data: T) => {
    queryCache.set(queryKey, {
      data,
      timestamp: Date.now(),
      staleTime,
      cacheTime,
    });
  }, [queryKey, staleTime, cacheTime]);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    fetchStartTimeRef.current = performance.now();

    setState(prev => ({
      ...prev,
      isFetching: true,
      isLoading: !isBackground && !prev.data,
      isError: false,
      error: null,
    }));

    try {
      const data = await queryFn();
      
      // Track fetch performance
      const fetchTime = performance.now() - fetchStartTimeRef.current;
      trackCustomMetric(`query_${queryKey}_fetch_time`, fetchTime);

      setCachedData(data);
      
      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        isFetching: false,
        isStale: false,
        isError: false,
        error: null,
      }));

      onSuccess?.(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: err,
      }));

      onError?.(err);
    }
  }, [enabled, queryFn, queryKey, onSuccess, onError, setCachedData]);

  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // Initial load
  useEffect(() => {
    if (!enabled) return;

    const cached = getCachedData();
    if (cached) {
      setState(prev => ({
        ...prev,
        data: cached.data,
        isStale: cached.isStale,
        isLoading: false,
        isFetching: false,
      }));

      // Fetch fresh data in background if stale
      if (cached.isStale) {
        fetchData(true);
      }
    } else {
      fetchData(false);
    }
  }, [enabled, getCachedData, fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      const cached = getCachedData();
      if (cached?.isStale || !cached) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, getCachedData, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refetch,
    invalidate: () => {
      queryCache.delete(queryKey);
      fetchData(false);
    },
  };
}

// Hook for mutations with optimistic updates
export function useOptimizedMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
  onSettled,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
}) {
  const [state, setState] = useState({
    isLoading: false,
    isError: false,
    error: null as Error | null,
    data: null as TData | null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    const startTime = performance.now();
    
    setState({
      isLoading: true,
      isError: false,
      error: null,
      data: null,
    });

    try {
      const data = await mutationFn(variables);
      
      // Track mutation performance
      const mutationTime = performance.now() - startTime;
      trackCustomMetric('mutation_time', mutationTime);

      setState({
        isLoading: false,
        isError: false,
        error: null,
        data,
      });

      onSuccess?.(data, variables);
      onSettled?.(data, null, variables);
      
      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      setState({
        isLoading: false,
        isError: true,
        error: err,
        data: null,
      });

      onError?.(err, variables);
      onSettled?.(null, err, variables);
      
      throw err;
    }
  }, [mutationFn, onSuccess, onError, onSettled]);

  return {
    ...state,
    mutate,
    reset: () => setState({
      isLoading: false,
      isError: false,
      error: null,
      data: null,
    }),
  };
}