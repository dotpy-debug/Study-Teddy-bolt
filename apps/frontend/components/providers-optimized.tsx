'use client'

import { ReactNode, lazy, Suspense } from 'react'
import dynamic from 'next/dynamic'

// Core provider that must be loaded immediately
import { QueryProvider } from '@/components/providers/query-provider'

// Lazy load non-critical providers
const NotificationProvider = dynamic(
  () => import('@/contexts/notification-context').then(mod => ({ default: mod.NotificationProvider })),
  { ssr: false }
)

const TeddyProvider = dynamic(
  () => import('@/contexts/teddy-context').then(mod => ({ default: mod.TeddyProvider })),
  { ssr: false }
)

// Lazy load heavy features
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })),
  { ssr: false }
)

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <NotificationProvider>
          <TeddyProvider>
            {children}
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </TeddyProvider>
        </NotificationProvider>
      </Suspense>
    </QueryProvider>
  )
}