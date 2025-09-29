import dynamic from 'next/dynamic'
import { ComponentType, lazy, Suspense } from 'react'

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
)

// Minimal loading skeleton
const MinimalSkeleton = () => (
  <div className="animate-pulse bg-muted rounded h-10 w-full" />
)

/**
 * Lazy load a component with Next.js dynamic import
 * Optimized for minimal bundle size
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    loading?: ComponentType<any> | (() => JSX.Element)
    ssr?: boolean
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || LoadingFallback,
    ssr: options?.ssr ?? false, // Disable SSR by default for client components
  })
}

/**
 * Lazy load with React.lazy for client-only components
 * Even smaller bundle size for pure client components
 */
export function clientOnly<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(importFn)

  return (props: any) => (
    <Suspense fallback={<MinimalSkeleton />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

/**
 * Preload a component (useful for critical user paths)
 */
export function preloadComponent(
  importFn: () => Promise<any>
) {
  if (typeof window !== 'undefined') {
    // Preload after initial render
    setTimeout(() => {
      importFn()
    }, 1000)
  }
}

/**
 * Load component only when visible in viewport
 */
export function lazyLoadOnView<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  rootMargin = '200px'
) {
  return dynamic(
    () =>
      new Promise<{ default: T }>((resolve) => {
        if (typeof window === 'undefined') {
          resolve(importFn())
          return
        }

        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              observer.disconnect()
              resolve(importFn())
            }
          },
          { rootMargin }
        )

        // Start observing after a delay
        setTimeout(() => {
          const element = document.querySelector('[data-lazy-boundary]')
          if (element) {
            observer.observe(element)
          } else {
            resolve(importFn())
          }
        }, 100)
      }),
    {
      ssr: false,
      loading: MinimalSkeleton,
    }
  )
}

/**
 * Optimized bundle splitting for routes
 */
export const splitRoute = (path: string) => {
  return lazyLoad(
    () => import(`../app/${path}/page`) as Promise<{ default: ComponentType<any> }>,
    { ssr: true }
  )
}

/**
 * Heavy library lazy loading - disabled problematic imports
 */
export const lazyLibrary = {
  // Disabled non-working imports - these need to be fixed individually
  // Charts - recharts doesn't export default component
  // recharts: () => lazyLoad(() => import('recharts')),

  // Rich text editors - check if component exists
  // editor: () => lazyLoad(() => import('@/components/editor/RichTextEditor')),

  // Date pickers - react-day-picker doesn't export default component
  // datePicker: () => lazyLoad(() => import('react-day-picker')),

  // Heavy UI components - check if components exist
  // dataTable: () => lazyLoad(() => import('@/components/ui/data-table')),

  // Forms - check if components exist
  // complexForm: () => lazyLoad(() => import('@/components/forms/ComplexForm')),

  // Modals - check if components exist
  // modal: () => lazyLoad(() => import('@/components/ui/modal')),
}

// Export utilities for route-level code splitting - disabled non-existing routes
export const routeModules = {
  // dashboard: () => import('../app/dashboard/page'),
  // settings: () => import('../app/settings/page'),
  // profile: () => import('../app/profile/page'),
  // admin: () => import('../app/admin/page'),
} as const