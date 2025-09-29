'use client';

import React, { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import {
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { DashboardHeader } from '@/features/analytics/components/dashboard-header';
import { InsightsSidebar } from '@/features/analytics/components/insights-sidebar';
import { ActivityFeed } from '@/features/analytics/components/activity-feed';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';

// Types
interface WeeklyPoint {
  date: string;
  minutes: number;
  tasksCompleted: number;
  focusScore?: number;
  subjectsStudied?: number;
}

interface AnalyticsTile {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  span: 'single' | 'double';
  priority: number;
}

interface DashboardConfig {
  tiles: AnalyticsTile[];
  layout: 'grid' | 'masonry';
  comparisonMode: boolean;
  comparisonPeriod?: string;
}

interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  period: string;
  status: 'on-track' | 'behind' | 'ahead';
}

// Lazy loaded components for performance
const StudyTimeChart = React.lazy(() => import('@/components/analytics/study-time-chart'));
const TaskCompletionChart = React.lazy(() => import('@/components/analytics/task-completion-chart'));
const SubjectDistribution = React.lazy(() => import('@/components/analytics/subject-distribution'));
const FocusMetrics = React.lazy(() => import('@/components/analytics/focus-metrics'));

// Loading skeleton component
const ChartSkeleton = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[100px]" />
    </div>
    <Skeleton className="h-[200px] w-full" />
  </div>
);

export default function AnalyticsPage() {
  // State management
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    tiles: [
      { id: 'study-time', title: 'Study Time Overview', component: StudyTimeChart, span: 'double', priority: 1 },
      { id: 'task-completion', title: 'Task Completion', component: TaskCompletionChart, span: 'single', priority: 2 },
      { id: 'subject-distribution', title: 'Subject Distribution', component: SubjectDistribution, span: 'single', priority: 3 },
      { id: 'focus-metrics', title: 'Focus Metrics', component: FocusMetrics, span: 'single', priority: 4 },
    ],
    layout: 'grid',
    comparisonMode: false,
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  // Cache for API responses
  const [dataCache, setDataCache] = useState<Map<string, any>>(new Map());

  // Fetch data with caching
  const fetchAnalyticsData = useCallback(async (useCache = true) => {
    const cacheKey = `analytics-${fromDate}-${toDate}`;

    if (useCache && dataCache.has(cacheKey)) {
      const cachedData = dataCache.get(cacheKey);
      setWeekly(cachedData.weekly);
      setGoals(cachedData.goals);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [weeklyRes, goalsRes] = await Promise.all([
        api.get('/dashboard/weekly'),
        api.get('/analytics/goals'),
      ]);

      const weeklyData = weeklyRes.data || [];
      const goalsData = goalsRes.data || [];

      setWeekly(weeklyData);
      setGoals(goalsData);

      // Cache the data
      setDataCache(prev => new Map(prev).set(cacheKey, { weekly: weeklyData, goals: goalsData }));

      if (weeklyData.length && !fromDate && !toDate) {
        const min = new Date(weeklyData[0].date);
        const max = new Date(weeklyData[weeklyData.length - 1].date);
        setFromDate(min.toISOString().slice(0, 10));
        setToDate(max.toISOString().slice(0, 10));
      }
    } catch (e) {
      console.error('Failed to fetch analytics data:', e);
      setWeekly([]);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, dataCache]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalyticsData(false);
    setRefreshing(false);
  }, [fetchAnalyticsData]);

  // Date range presets
  const handleDateRangeChange = useCallback((range: '7d' | '30d' | '90d' | 'custom') => {
    setDateRange(range);
    if (range !== 'custom') {
      const today = new Date();
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
      const startDate = new Date(today.getTime() - daysMap[range] * 24 * 60 * 60 * 1000);
      setFromDate(startDate.toISOString().slice(0, 10));
      setToDate(today.toISOString().slice(0, 10));
    }
  }, []);

  // Export functionality
  const handleExport = useCallback(async (format: 'pdf' | 'csv' | 'json') => {
    try {
      const response = await api.post('/analytics/export', {
        format,
        dateRange: { from: fromDate, to: toDate },
        data: filtered,
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' :
              format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${fromDate}-${toDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [fromDate, toDate]);

  // Share functionality
  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/analytics/shared?from=${fromDate}&to=${toDate}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Study Analytics Dashboard',
          text: 'Check out my study progress!',
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  }, [fromDate, toDate]);

  // Print functionality
  const handlePrint = useCallback(() => {
    setIsPrintView(true);
    setTimeout(() => {
      window.print();
      setIsPrintView(false);
    }, 100);
  }, []);

  // Toggle comparison mode
  const toggleComparisonMode = useCallback(() => {
    setDashboardConfig(prev => ({
      ...prev,
      comparisonMode: !prev.comparisonMode,
    }));
  }, []);

  // Initialize data
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            handleRefresh();
            break;
          case 'p':
            e.preventDefault();
            handlePrint();
            break;
          case 'e':
            e.preventDefault();
            handleExport('pdf');
            break;
          case 'f':
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh, handlePrint, handleExport, isFullscreen]);

  // Filtered data based on date range
  const filtered = useMemo(() => {
    if (!fromDate || !toDate) return weekly;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    return weekly.filter((p) => {
      const d = new Date(p.date);
      return d >= from && d <= to;
    });
  }, [weekly, fromDate, toDate]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalMinutes = filtered.reduce((s, p) => s + (p.minutes || 0), 0);
    const totalTasksCompleted = filtered.reduce((s, p) => s + (p.tasksCompleted || 0), 0);
    const avgFocusScore = filtered.length > 0
      ? filtered.reduce((s, p) => s + (p.focusScore || 0), 0) / filtered.length
      : 0;
    const totalSubjects = new Set(filtered.map(p => p.subjectsStudied)).size;

    return {
      totalMinutes,
      totalTasksCompleted,
      avgFocusScore,
      totalSubjects,
      dailyAverage: filtered.length > 0 ? totalMinutes / filtered.length : 0,
    };
  }, [filtered]);

  // Responsive grid classes
  const gridClasses = cn(
    'grid gap-6',
    {
      'grid-cols-1 md:grid-cols-2 lg:grid-cols-4': !isFullscreen,
      'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4': isFullscreen,
      'print:grid-cols-2': isPrintView,
    }
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        <div className={gridClasses}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', { 'fixed inset-0 z-50 bg-background p-6 overflow-auto': isFullscreen })}>
      {/* Dashboard Header */}
      <DashboardHeader
        title="Analytics Dashboard"
        description="Track your study progress and performance insights"
        dateRange={dateRange}
        fromDate={fromDate}
        toDate={toDate}
        onDateRangeChange={handleDateRangeChange}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onShare={handleShare}
        onPrint={handlePrint}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onToggleComparison={toggleComparisonMode}
        isRefreshing={refreshing}
        isFullscreen={isFullscreen}
        comparisonMode={dashboardConfig.comparisonMode}
      />

      <div className="flex gap-6">
        {/* Main Dashboard Content */}
        <div className="flex-1">
          {/* Summary Metrics */}
          <div className={gridClasses}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(metrics.totalMinutes / 60)}h {metrics.totalMinutes % 60}m
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.dailyAverage.toFixed(0)} min/day average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalTasksCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {(metrics.totalTasksCompleted / (filtered.length || 1)).toFixed(1)} tasks/day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.avgFocusScore.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Average focus rating
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subjects</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalSubjects}</div>
                <p className="text-xs text-muted-foreground">
                  Subjects studied
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Goal Tracking Overview */}
          {goals.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goal Tracking
                </CardTitle>
                <CardDescription>Your progress toward study goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{goal.title}</h4>
                        <Badge
                          variant={goal.status === 'on-track' ? 'default' :
                                  goal.status === 'ahead' ? 'secondary' : 'destructive'}
                        >
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {goal.current} / {goal.target} {goal.unit}
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{goal.period}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analytics Tiles */}
          <Tabs defaultValue="overview" value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="mt-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {filtered.length > 0 ? (
                <DashboardCharts weekly={filtered} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No data available</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      No analytics data available for the selected date range.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="detailed" className="space-y-6">
              <div className={cn('grid gap-6', {
                'grid-cols-1 lg:grid-cols-2': dashboardConfig.tiles.some(t => t.span === 'double'),
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': !dashboardConfig.tiles.some(t => t.span === 'double'),
              })}>
                {dashboardConfig.tiles
                  .sort((a, b) => a.priority - b.priority)
                  .map((tile) => {
                    const Component = tile.component;
                    return (
                      <Card
                        key={tile.id}
                        className={cn({
                          'lg:col-span-2': tile.span === 'double',
                        })}
                      >
                        <CardHeader>
                          <CardTitle>{tile.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Suspense fallback={<ChartSkeleton />}>
                            <Component
                              data={filtered}
                              comparisonMode={dashboardConfig.comparisonMode}
                            />
                          </Suspense>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Insights Sidebar */}
        {!isFullscreen && (
          <div className="w-80 space-y-6">
            <InsightsSidebar
              data={filtered}
              goals={goals}
              dateRange={{ from: fromDate, to: toDate }}
            />
            <ActivityFeed />
          </div>
        )}
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          @page {
            margin: 0.5in;
            size: A4;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}