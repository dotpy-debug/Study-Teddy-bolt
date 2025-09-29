'use client';

import { cn } from '@/lib/utils';

export function SkipNavLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:fixed focus:top-4 focus:left-4 focus:z-50',
        'focus:bg-white focus:text-black dark:focus:bg-gray-900 dark:focus:text-white',
        'focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'transition-all duration-200'
      )}
    >
      Skip to main content
    </a>
  );
}

export function SkipNavContent({
  children,
  id = 'main-content',
  className,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <main id={id} className={className} tabIndex={-1}>
      {children}
    </main>
  );
}