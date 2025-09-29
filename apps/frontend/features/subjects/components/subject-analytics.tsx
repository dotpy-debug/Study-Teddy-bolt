'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  TargetIcon,
  BookOpenIcon,
  CalendarIcon,
  DownloadIcon,
  BarChart3Icon,
  FilterIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { format, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useSubject, useSubjectAnalytics, useSubjects } from '../hooks/useSubjects';
import { SubjectMixChart, SubjectMixData } from '@/components/analytics/SubjectMixChart';
import { TrendChart } from '@/components/analytics/TrendChart';
import { AnalyticsTiles, DashboardTile } from '@/components/analytics/AnalyticsTiles';

interface SubjectAnalyticsProps {
  subjectId: string;
  className?: string;
}

type ViewMode = 'overview' | 'detailed' | 'comparison';
type TimeRange = 'week' | 'month' | 'quarter' | 'year';
type ChartType = 'line' | 'area' | 'bar';

interface ExtendedAnalyticsData {
  studyTimeData: Array<{ date: string; minutes: number; sessions: number }>;
  taskProgressData: Array<{ date: string; completed: number; total: number; rate: number }>;
  focusSessionData: Array<{ date: string; averageDuration: number; totalSessions: number }>;
  performanceTrendData: Array<{ date: string; efficiency: number; productivity: number }>;
  goalProgressData: Array<{ goal: string; current: number; target: number; progress: number }>;
  timeDistributionData: Array<{ category: string; minutes: number; percentage: number; color: string }>;
  comparisonData?: Array<{ subject: string; totalTime: number; efficiency: number; color: string }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'];

const CustomTooltip = ({ active, payload, label, suffix = '' }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">
          {format(parseISO(label), 'MMM dd, yyyy')}
        </p>
        {payload.map((item: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: item.color }}>
            {item.name}: {item.value}{suffix}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const generateMockExtendedData = (analytics: any, timeRange: TimeRange): ExtendedAnalyticsData => {
  const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365;
  const baseDate = subDays(new Date(), days);

  const studyTimeData = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - i - 1);
    const baseMinutes = analytics?.dailyFocusTime?.find((d: any) =>
      format(parseISO(d.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    )?.minutes || 0;

    return {
      date: format(date, 'yyyy-MM-dd'),
      minutes: baseMinutes + Math.floor(Math.random() * 60),
      sessions: Math.floor(Math.random() * 4) + 1,
    };
  });

  const taskProgressData = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - i - 1);
    const completed = Math.floor(Math.random() * 8) + 1;
    const total = completed + Math.floor(Math.random() * 4);

    return {
      date: format(date, 'yyyy-MM-dd'),
      completed,
      total,
      rate: Math.round((completed / total) * 100),
    };
  });

  const focusSessionData = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - i - 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      averageDuration: Math.floor(Math.random() * 45) + 15,
      totalSessions: Math.floor(Math.random() * 6) + 1,
    };
  });

  const performanceTrendData = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - i - 1);
    return {
      date: format(date, 'yyyy-MM-dd'),
      efficiency: Math.floor(Math.random() * 40) + 60,
      productivity: Math.floor(Math.random() * 50) + 50,
    };
  });

  const goalProgressData = [
    { goal: 'Weekly Study Hours', current: 12, target: 20, progress: 60 },
    { goal: 'Tasks Completed', current: 18, target: 25, progress: 72 },
    { goal: 'Focus Sessions', current: 8, target: 10, progress: 80 },
    { goal: 'Streak Days', current: 5, target: 7, progress: 71 },
  ];

  const timeDistributionData = [
    { category: 'Active Study', minutes: 480, percentage: 60, color: COLORS[0] },
    { category: 'Review', minutes: 160, percentage: 20, color: COLORS[1] },
    { category: 'Practice', minutes: 120, percentage: 15, color: COLORS[2] },
    { category: 'Break Time', minutes: 40, percentage: 5, color: COLORS[3] },
  ];

  return {
    studyTimeData,
    taskProgressData,
    focusSessionData,
    performanceTrendData,
    goalProgressData,
    timeDistributionData,
  };
};

export function SubjectAnalytics({ subjectId, className }: SubjectAnalyticsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['studyTime', 'completion']);

  const { data: subject, isLoading: subjectLoading } = useSubject(subjectId);
  const { data: analytics, isLoading: analyticsLoading, refetch } = useSubjectAnalytics(subjectId, {
    window: timeRange
  });
  const { data: allSubjects } = useSubjects();

  const extendedData = useMemo(() => {
    if (!analytics) return null;
    return generateMockExtendedData(analytics, timeRange);
  }, [analytics, timeRange]);

  const dashboardTiles: DashboardTile[] = useMemo(() => {
    if (!analytics?.metrics) return [];

    return [
      {
        id: 'total-time',
        title: 'Total Study Time',
        value: Math.floor(analytics.metrics.totalFocusedMinutes / 60),
        unit: 'hours',
        trend: 12.5,
        trendDirection: 'up',
        icon: 'clock',
        color: COLORS[0],
        sparklineData: extendedData?.studyTimeData.slice(-7).map(d => ({
          date: d.date,
          value: d.minutes
        })) || [],
      },
      {
        id: 'completion-rate',
        title: 'Completion Rate',
        value: analytics.metrics.completionRate,
        unit: '%',
        trend: 5.2,
        trendDirection: 'up',
        icon: 'target',
        color: COLORS[1],
      },
      {
        id: 'sessions',
        title: 'Study Sessions',
        value: analytics.metrics.sessionsCount,
        unit: 'sessions',
        trend: -2.1,
        trendDirection: 'down',
        icon: 'book',
        color: COLORS[2],
      },
      {
        id: 'streak',
        title: 'Current Streak',
        value: analytics.metrics.currentStreak,
        unit: 'days',
        trend: 8.7,
        trendDirection: 'up',
        icon: 'trending-up',
        color: COLORS[3],
      },
    ];
  }, [analytics, extendedData]);

  const subjectComparisonData: SubjectMixData[] = useMemo(() => {
    if (!allSubjects?.items || !subject) return [];

    return allSubjects.items
      .filter(s => !s.isArchived)
      .map((s, index) => ({
        subjectId: s.id,
        subjectName: s.name,
        totalMinutes: s.totalStudyMinutes || 0,
        percentage: Math.round((s.totalStudyMinutes || 0) /
          allSubjects.items.reduce((sum, subj) => sum + (subj.totalStudyMinutes || 0), 1) * 100),
        color: s.color || COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [allSubjects, subject]);

  const exportAnalytics = () => {
    const data = {
      subject: subject?.name,
      timeRange,
      exportDate: new Date().toISOString(),
      metrics: analytics?.metrics,
      studyTimeData: extendedData?.studyTimeData,
      taskProgressData: extendedData?.taskProgressData,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${subject?.name || 'subject'}-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (subjectLoading || analyticsLoading) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!subject || !analytics) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No analytics data available for this subject.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
            <div>
              <h2 className="text-2xl font-bold">{subject.name} Analytics</h2>
              <p className="text-muted-foreground">
                Detailed performance insights and trends
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCwIcon className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={exportAnalytics}>
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <AnalyticsTiles tiles={dashboardTiles} loading={analyticsLoading} />

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    Study Time Trend
                  </CardTitle>
                  <CardDescription>
                    Daily study minutes over {timeRange}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {extendedData && (
                    <TrendChart
                      data={extendedData.studyTimeData.map(d => ({
                        date: d.date,
                        value: d.minutes
                      }))}
                      metric="minutes"
                      color={COLORS[0]}
                      type={chartType}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TargetIcon className="h-5 w-5" />
                    Task Completion Rate
                  </CardTitle>
                  <CardDescription>
                    Daily completion percentage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {extendedData && (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={extendedData.taskProgressData}>
                        <defs>
                          <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip suffix="%" />} />
                        <Area
                          type="monotone"
                          dataKey="rate"
                          stroke={COLORS[1]}
                          strokeWidth={2}
                          fill="url(#completionGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Goal Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5" />
                  Goal Progress
                </CardTitle>
                <CardDescription>
                  Track your progress towards weekly goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {extendedData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {extendedData.goalProgressData.map((goal, index) => (
                      <div key={goal.goal} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{goal.goal}</span>
                          <span className="text-muted-foreground">
                            {goal.current}/{goal.target}
                          </span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {goal.progress}% complete
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detailed Tab */}
          <TabsContent value="detailed" className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Focus Session Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Focus Session Analytics</CardTitle>
                  <CardDescription>
                    Session duration and frequency patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {extendedData && (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={extendedData.focusSessionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="averageDuration" fill={COLORS[2]} name="Avg Duration (min)" />
                        <Bar dataKey="totalSessions" fill={COLORS[3]} name="Total Sessions" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Performance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>
                    Efficiency and productivity metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {extendedData && (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={extendedData.performanceTrendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip suffix="%" />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="efficiency"
                          stroke={COLORS[4]}
                          strokeWidth={2}
                          name="Efficiency %"
                        />
                        <Line
                          type="monotone"
                          dataKey="productivity"
                          stroke={COLORS[5]}
                          strokeWidth={2}
                          name="Productivity %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Time Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Time Distribution</CardTitle>
                  <CardDescription>
                    How you spend your study time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {extendedData && (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={extendedData.timeDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="minutes"
                          label={({ category, percentage }) => `${category}: ${percentage}%`}
                        >
                          {extendedData.timeDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name) => [
                            `${value} minutes (${Math.round(value / extendedData.timeDistributionData.reduce((sum, d) => sum + d.minutes, 0) * 100)}%)`,
                            name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Study Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Study Pattern</CardTitle>
                  <CardDescription>
                    Study time distribution by day of week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {extendedData && (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="20%"
                        outerRadius="80%"
                        data={[
                          { day: 'Mon', minutes: 120, fill: COLORS[0] },
                          { day: 'Tue', minutes: 90, fill: COLORS[1] },
                          { day: 'Wed', minutes: 150, fill: COLORS[2] },
                          { day: 'Thu', minutes: 80, fill: COLORS[3] },
                          { day: 'Fri', minutes: 110, fill: COLORS[4] },
                          { day: 'Sat', minutes: 60, fill: COLORS[5] },
                          { day: 'Sun', minutes: 40, fill: COLORS[6] },
                        ]}
                      >
                        <RadialBar dataKey="minutes" cornerRadius={10} />
                        <Tooltip formatter={(value) => [`${value} minutes`, 'Study Time']} />
                        <Legend />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subject Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3Icon className="h-5 w-5" />
                    Subject Time Distribution
                  </CardTitle>
                  <CardDescription>
                    Compare study time across all subjects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SubjectMixChart data={subjectComparisonData} />
                </CardContent>
              </Card>

              {/* Relative Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Relative Performance</CardTitle>
                  <CardDescription>
                    How this subject compares to others
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subjectComparisonData.slice(0, 5).map((subject, index) => (
                      <div key={subject.subjectId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            <span className="text-sm font-medium">
                              {subject.subjectName}
                            </span>
                            {subject.subjectId === subjectId && (
                              <Badge variant="secondary" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Math.floor(subject.totalMinutes / 60)}h {subject.totalMinutes % 60}m
                          </span>
                        </div>
                        <Progress value={subject.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparison Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Comparison Statistics</CardTitle>
                <CardDescription>
                  Detailed comparison metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      #{subjectComparisonData.findIndex(s => s.subjectId === subjectId) + 1}
                    </div>
                    <div className="text-sm text-muted-foreground">Rank by Study Time</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.metrics.completionRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {analytics.metrics.averageSessionDuration}min
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Session Duration</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}