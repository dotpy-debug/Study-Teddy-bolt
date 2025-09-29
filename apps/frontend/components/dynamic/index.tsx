import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';

// Loading components for different scenarios
const CalendarLoader = () => (
  <div className="flex items-center justify-center p-8">
    <LoadingSpinner size="lg" />
  </div>
);

const ChartLoader = () => (
  <div className="w-full h-64">
    <Skeleton className="w-full h-full" />
  </div>
);

const FormLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-32" />
  </div>
);

const TableLoader = () => (
  <div className="space-y-2">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-full" />
  </div>
);

// Dynamically imported heavy components
export const DynamicCalendar = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  {
    loading: CalendarLoader,
    ssr: false,
  }
);

export const DynamicTaskForm = dynamic(
  () => import('@/components/tasks/task-form').then(mod => ({ default: mod.TaskForm })),
  {
    loading: FormLoader,
    ssr: true,
  }
);

export const DynamicTeddyAssistant = dynamic(
  () => import('@/components/teddy/TeddyAssistant'),
  {
    loading: () => <div className="animate-pulse">Loading Teddy...</div>,
    ssr: false,
  }
);

export const DynamicNotificationCenter = dynamic(
  () => import('@/components/notifications/notification-center').then(mod => ({ default: mod.NotificationCenter })),
  {
    ssr: false,
  }
);

// Analytics components with lazy loading
export const DynamicAnalyticsChart = dynamic(
  () => import('@/components/analytics/chart').then(mod => ({ default: mod.AnalyticsChart })),
  {
    loading: ChartLoader,
    ssr: false,
  }
);

// Form components with code splitting
export const DynamicLoginForm = dynamic(
  () => import('@/components/auth/login-form').then(mod => ({ default: mod.LoginForm })),
  {
    loading: FormLoader,
  }
);

export const DynamicRegisterForm = dynamic(
  () => import('@/components/auth/register-form').then(mod => ({ default: mod.RegisterForm })),
  {
    loading: FormLoader,
  }
);

// Utility function for creating dynamic components with custom loading
export function createDynamicComponent<T = any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  loader?: React.ComponentType
) {
  return dynamic(importFn, {
    loading: loader || (() => <LoadingSpinner />),
  });
}