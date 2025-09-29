import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Skeleton loader for better UX
const DashboardSkeleton = () => (
  <div className="space-y-4 p-6">
    <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
    <div className="h-64 bg-gray-200 rounded animate-pulse" />
  </div>
)

// Lazy load heavy dashboard components
const StatsCards = dynamic(
  () => import('@/components/dashboard/stats-cards'),
  {
    loading: () => <div className="h-32 bg-gray-100 rounded animate-pulse" />,
    ssr: false
  }
)

const ActivityChart = dynamic(
  () => import('@/components/dashboard/activity-chart'),
  {
    loading: () => <div className="h-64 bg-gray-100 rounded animate-pulse" />,
    ssr: false
  }
)

const RecentTasks = dynamic(
  () => import('@/components/dashboard/recent-tasks'),
  {
    loading: () => <div className="h-48 bg-gray-100 rounded animate-pulse" />,
    ssr: false
  }
)

const StudyProgress = dynamic(
  () => import('@/components/dashboard/study-progress'),
  {
    loading: () => <div className="h-48 bg-gray-100 rounded animate-pulse" />,
    ssr: false
  }
)

// Server component for initial HTML
export default function Dashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Critical content rendered on server */}
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Non-critical content loaded on client */}
      <Suspense fallback={<DashboardSkeleton />}>
        <div className="space-y-6">
          <StatsCards />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityChart />
            <StudyProgress />
          </div>

          <RecentTasks />
        </div>
      </Suspense>
    </div>
  )
}