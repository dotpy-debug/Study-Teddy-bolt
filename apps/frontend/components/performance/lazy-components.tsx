'use client';

import { lazy, Suspense } from 'react';
import { Skeleton, TaskCardSkeleton, DashboardStatsSkeleton, ChatMessageSkeleton } from '@/components/ui/loading-skeleton';

// Lazy load heavy components
export const LazyTaskCalendar = lazy(() => 
  import('@/components/tasks/task-calendar').then(module => ({
    default: module.TaskCalendar
  }))
);

export const LazyAIChat = lazy(() => 
  import('@/components/ai/ai-chat-interface').then(module => ({
    default: module.AIChatInterface
  }))
);

export const LazyDashboardCharts = lazy(() => 
  import('@/components/dashboard/dashboard-charts').then(module => ({
    default: module.DashboardCharts
  }))
);

export const LazyTaskForm = lazy(() => 
  import('@/components/tasks/task-form').then(module => ({
    default: module.TaskForm
  }))
);

// Wrapper components with appropriate loading states
export function TaskCalendarWithSuspense(props: any) {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    }>
      <LazyTaskCalendar {...props} />
    </Suspense>
  );
}

export function AIChatWithSuspense(props: any) {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4">
          <ChatMessageSkeleton />
        </div>
        <div className="p-4 border-t">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    }>
      <LazyAIChat {...props} />
    </Suspense>
  );
}

export function DashboardChartsWithSuspense(props: any) {
  return (
    <Suspense fallback={<DashboardStatsSkeleton />}>
      <LazyDashboardCharts {...props} />
    </Suspense>
  );
}

export function TaskFormWithSuspense(props: any) {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton variant="text" lines={3} />
        <div className="flex gap-2">
          <Skeleton variant="button" />
          <Skeleton variant="button" />
        </div>
      </div>
    }>
      <LazyTaskForm {...props} />
    </Suspense>
  );
}