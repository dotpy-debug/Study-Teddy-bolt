"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component that protects routes by checking authentication status
 * Redirects unauthenticated users to login page
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const loginUrl = `${redirectTo}?from=${encodeURIComponent(currentPath)}`;
      router.replace(loginUrl);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show children if authenticated, otherwise null (redirect will happen)
  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;