'use client';

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button';
  lines?: number;
}

export function Skeleton({ 
  className, 
  variant = 'default',
  lines = 1,
  ...props 
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-muted rounded";
  
  const variants = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-4",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24"
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variants.text,
              i === lines - 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseClasses, variants[variant], className)}
      {...props}
    />
  );
}

// Specialized loading components
export function TaskCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton variant="button" className="h-6 w-16" />
      </div>
      <Skeleton variant="text" lines={2} />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={cn(
          "flex gap-3",
          i % 2 === 0 ? "justify-start" : "justify-end"
        )}>
          {i % 2 === 0 && <Skeleton variant="avatar" />}
          <div className={cn(
            "max-w-[70%] space-y-2",
            i % 2 === 0 ? "bg-muted" : "bg-primary/10",
            "p-3 rounded-lg"
          )}>
            <Skeleton variant="text" lines={2} />
          </div>
          {i % 2 === 1 && <Skeleton variant="avatar" />}
        </div>
      ))}
    </div>
  );
}