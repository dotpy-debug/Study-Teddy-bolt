'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Target,
  BookOpen,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { AnalyticsTiles } from '@/components/analytics/AnalyticsTiles';
import { SubjectMixChart } from '@/components/analytics/SubjectMixChart';
import { TrendChart } from '@/components/analytics/TrendChart';
import { NextBestAction } from '@/components/analytics/NextBestAction';
import { PerformanceMetrics } from '@/components/analytics/PerformanceMetrics';
import { StudyPatterns } from '@/components/analytics/StudyPatterns';
import { GoalProgress } from '@/components/analytics/GoalProgress';
import { useAnalytics } from '@/hooks/useAnalytics';
import { toast } from 'sonner';

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('last_7_days');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const {
    dashboardTiles,
    subjectMix,
    trendData,
    nextBestAction,
    advancedAnalytics,
    isLoading,
    error,
    refetch,
  } = useAnalytics(timeRange);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success('Analytics refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh analytics');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(
        `/api/analytics/dashboard/export?format=${format}&range=${timeRange}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${timeRange}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading analytics: {error.message}</p>
            <Button onClick={handleRefresh} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your study progress and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Next Best Action */}
      <div className="mb-6">
        <NextBestAction action={nextBestAction} />
      </div>

      {/* Main Tiles */}
      <div className="mb-6">
        <AnalyticsTiles tiles={dashboardTiles} loading={isLoading} />
      </div>

      {/* Tabs for detailed analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="patterns">Study Patterns</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Subject Mix Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Distribution</CardTitle>
                <CardDescription>
                  Time spent on each subject
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubjectMixChart data={subjectMix} />
              </CardContent>
            </Card>

            {/* Study Time Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Study Time Trend</CardTitle>
                <CardDescription>
                  Daily study minutes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trendData?.studyTime || []}
                  metric="minutes"
                  color="#3B82F6"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Task Completion Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Task Completion Trend</CardTitle>
                <CardDescription>
                  Tasks completed per day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trendData?.tasksCompleted || []}
                  metric="tasks"
                  color="#10B981"
                />
              </CardContent>
            </Card>

            {/* Focus Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Focus Score Trend</CardTitle>
                <CardDescription>
                  Average daily focus score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trendData?.focusScore || []}
                  metric="score"
                  color="#F59E0B"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics data={advancedAnalytics?.performanceMetrics} />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <StudyPatterns data={advancedAnalytics?.studyPatterns} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalProgress data={advancedAnalytics?.goalProgress} />
        </TabsContent>
      </Tabs>

      {/* Insights Section */}
      {advancedAnalytics?.recommendations && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
            <CardDescription>
              AI-powered insights based on your study patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {advancedAnalytics.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}