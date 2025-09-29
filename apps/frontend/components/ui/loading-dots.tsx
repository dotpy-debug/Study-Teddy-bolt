'use client';

import { cn } from '@/lib/utils';

interface LoadingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingDots({ className, size = 'md' }: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const dotClass = cn(
    'rounded-full bg-current',
    sizeClasses[size]
  );

  return (
    <>
      <style jsx global>{`
        @keyframes loading-dots-bounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .loading-dot-1 {
          animation: loading-dots-bounce 1.4s ease-in-out 0s infinite;
        }
        .loading-dot-2 {
          animation: loading-dots-bounce 1.4s ease-in-out 0.2s infinite;
        }
        .loading-dot-3 {
          animation: loading-dots-bounce 1.4s ease-in-out 0.4s infinite;
        }
      `}</style>
      <div className={cn('flex items-center space-x-1', className)}>
        <div className={cn(dotClass, 'loading-dot-1')} />
        <div className={cn(dotClass, 'loading-dot-2')} />
        <div className={cn(dotClass, 'loading-dot-3')} />
      </div>
    </>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center space-y-4">
        <LoadingDots size="lg" className="text-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}