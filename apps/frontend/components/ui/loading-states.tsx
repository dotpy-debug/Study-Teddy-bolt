'use client';

import { ReactNode } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface LoadingStateProps {
  isLoading: boolean;
  error?: Error | null;
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function LoadingState({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
  onRetry,
  className,
}: LoadingStateProps) {
  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        {errorComponent || (
          <>
            <div className="text-destructive mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {loadingComponent || (
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// Specialized loading states
export function InlineLoadingState({
  isLoading,
  error,
  children,
  onRetry,
}: Omit<LoadingStateProps, 'loadingComponent' | 'errorComponent' | 'className'>) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <span>Error: {error.message}</span>
        {onRetry && (
          <Button onClick={onRetry} variant="ghost" size="sm" className="h-6 px-2">
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return <>{children}</>;
}

export function ButtonLoadingState({
  isLoading,
  children,
  ...buttonProps
}: {
  isLoading: boolean;
  children: ReactNode;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={isLoading} {...buttonProps}>
      {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
      {children}
    </Button>
  );
}

// Page-level loading states
export function PageLoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">Loading</h3>
        <p className="text-sm text-muted-foreground">Please wait while we load your data...</p>
      </div>
    </div>
  );
}

export function PageErrorState({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry?: () => void; 
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="text-destructive mb-6">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || 'We encountered an unexpected error. Please try again.'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} className="mr-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh page
        </Button>
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-center max-w-md">
        {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-6">{description}</p>
        )}
        {action}
      </div>
    </div>
  );
}