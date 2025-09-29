'use client';

import { Suspense, ReactNode } from 'react';
import { Skeleton } from './loading-skeleton';

interface StreamingContentProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

export function StreamingContent({ 
  children, 
  fallback,
  className 
}: StreamingContentProps) {
  return (
    <div className={className}>
      <Suspense fallback={fallback || <Skeleton className="h-20 w-full" />}>
        {children}
      </Suspense>
    </div>
  );
}

// Specialized streaming components
export function StreamingTaskList({ children }: { children: ReactNode }) {
  return (
    <StreamingContent
      fallback={
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton variant="text" lines={2} />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      }
    >
      {children}
    </StreamingContent>
  );
}

export function StreamingDashboard({ children }: { children: ReactNode }) {
  return (
    <StreamingContent
      fallback={
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 border rounded-lg space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          
          {/* Charts area */}
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      }
    >
      {children}
    </StreamingContent>
  );
}

export function StreamingChat({ children }: { children: ReactNode }) {
  return (
    <StreamingContent
      fallback={
        <div className="flex flex-col h-full">
          <div className="flex-1 p-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                {i % 2 === 0 && <Skeleton variant="avatar" />}
                <div className="max-w-[70%] space-y-2 p-3 rounded-lg bg-muted">
                  <Skeleton variant="text" lines={2} />
                </div>
                {i % 2 === 1 && <Skeleton variant="avatar" />}
              </div>
            ))}
          </div>
          <div className="p-4 border-t">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      }
    >
      {children}
    </StreamingContent>
  );
}