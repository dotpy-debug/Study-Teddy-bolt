'use client'

import dynamic from 'next/dynamic'
import { ComponentType, ReactNode, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Loading fallback component
const LoadingFallback = ({ size = 24 }: { size?: number }) => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className={`h-${size} w-${size} animate-spin text-muted-foreground`} />
  </div>
)

// Suspense wrapper for lazy components
export const LazyWrapper = ({
  children,
  fallback
}: {
  children: ReactNode
  fallback?: ReactNode
}) => (
  <Suspense fallback={fallback || <LoadingFallback />}>
    {children}
  </Suspense>
)

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
) {
  const LazyComponent = dynamic(importFn, {
    loading: () => fallback || <LoadingFallback />,
    ssr: false, // Disable SSR for better performance
  })

  return (props: P) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyWrapper>
  )
}

// Pre-configured lazy components for heavy UI elements

// Charts (recharts is heavy)
export const LazyChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  {
    loading: () => <LoadingFallback size={32} />,
    ssr: false,
  }
)

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  {
    loading: () => <LoadingFallback size={32} />,
    ssr: false,
  }
)

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  {
    loading: () => <LoadingFallback size={32} />,
    ssr: false,
  }
)

// Calendar component (date-picker is heavy)
export const LazyCalendar = dynamic(
  () => import('react-day-picker').then(mod => ({ default: mod.DayPicker })),
  {
    loading: () => <LoadingFallback size={32} />,
    ssr: false,
  }
)

// Drag and drop components (dnd-kit is heavy)
export const LazyDragDropContext = dynamic(
  () => import('@hello-pangea/dnd').then(mod => ({ default: mod.DragDropContext })),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Motion components (framer-motion is heavy)
export const LazyMotionDiv = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.motion.div })),
  {
    loading: () => <div />, // No loading for motion since it's just a div wrapper
    ssr: false,
  }
)

// Code editor for AI responses (if used)
export const LazyCodeEditor = dynamic(
  () => import('@monaco-editor/react').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback size={32} />,
    ssr: false,
  }
)

// Virtual list for large data sets
export const LazyVirtualizedList = dynamic(
  () => import('react-window').then(mod => ({ default: mod.FixedSizeList })),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Export utility functions
export { dynamic, Suspense }