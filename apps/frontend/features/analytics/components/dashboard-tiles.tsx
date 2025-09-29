'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  BookOpen,
  Brain,
  Download,
  Expand,
  Calendar,
  CheckCircle,
  AlertCircle,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { analyticsApi, type AnalyticsTimeRange } from '@/lib/api/analytics';
import { toast } from 'sonner';

// Types
type TimePeriod = 'today' | 'week' | 'month' | 'year';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

interface TileProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

// Animated Counter Component
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  decimals = 0,
  suffix = '',
  prefix = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  React.useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};

// Period Selector Component
const PeriodSelector: React.FC<{
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
}> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Today</SelectItem>
        <SelectItem value="week">Week</SelectItem>
        <SelectItem value="month">Month</SelectItem>
        <SelectItem value="year">Year</SelectItem>
      </SelectContent>
    </Select>
  );
};

// Export Button Component
const ExportButton: React.FC<{
  onExport: () => Promise<void>;
  isLoading?: boolean;
}> = ({ onExport, isLoading }) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={isLoading}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export
    </Button>
  );
};

// Study Performance Tile
export const StudyPerformanceTile: React.FC<TileProps> = ({ period, onPeriodChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const timeRange: AnalyticsTimeRange = useMemo(() => ({ period }), [period]);

  const { data: studyData, isLoading, error } = useQuery({
    queryKey: ['analytics', 'study', period],
    queryFn: async () => {
      const result = await analyticsApi.getStudyAnalytics({ timeRange });
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: performanceData } = useQuery({
    queryKey: ['analytics', 'performance', period],
    queryFn: async () => {
      const result = await analyticsApi.getPerformanceMetrics({ timeRange });
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleExport = useCallback(async () => {
    try {
      const result = await analyticsApi.exportAnalytics('json', { timeRange });
      if (result.data) {
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-performance-${period}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  }, [period, timeRange]);

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !studyData) {
    return (
      <Card className="col-span-2 border-red-200">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load study performance data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendData = performanceData?.weeklyStats?.map(stat => ({
    date: stat.week,
    studyTime: stat.studyTime / 60, // Convert to hours
    sessions: stat.sessions,
    focusScore: stat.focusScore
  })) || [];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900 dark:text-blue-100">Study Performance</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector value={period} onChange={onPeriodChange} />
              <ExportButton onExport={handleExport} />
              <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Expand className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Study Performance Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          <AnimatedCounter value={studyData.totalStudyTime / 60} decimals={1} suffix="h" />
                        </div>
                        <div className="text-sm text-muted-foreground">Total Study Time</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          <AnimatedCounter value={studyData.completionRate * 100} decimals={1} suffix="%" />
                        </div>
                        <div className="text-sm text-muted-foreground">Completion Rate</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          <AnimatedCounter value={studyData.focusScore} decimals={0} />
                        </div>
                        <div className="text-sm text-muted-foreground">Focus Score</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          <AnimatedCounter value={studyData.streakDays} decimals={0} />
                        </div>
                        <div className="text-sm text-muted-foreground">Current Streak</div>
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="studyTime"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Study Hours"
                          />
                          <Line
                            type="monotone"
                            dataKey="focusScore"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            name="Focus Score"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  {getTrendIcon(studyData.productivityTrend)}
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  <AnimatedCounter value={studyData.totalStudyTime / 60} decimals={1} suffix="h" />
                </div>
                <div className="text-sm text-muted-foreground">Study Time</div>
                <div className="text-xs text-blue-600 mt-1">
                  {studyData.totalStudyTimeFormatted}
                </div>
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <Badge variant={studyData.completionRate > 0.8 ? 'default' : 'secondary'}>
                    {studyData.completionRate > 0.8 ? 'Excellent' : 'Good'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  <AnimatedCounter value={studyData.completionRate * 100} decimals={1} suffix="%" />
                </div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
                <Progress value={studyData.completionRate * 100} className="mt-2" />
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <Badge variant={studyData.focusScore > 80 ? 'default' : 'secondary'}>
                    {studyData.focusScore > 80 ? 'High' : 'Medium'}
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  <AnimatedCounter value={studyData.focusScore} decimals={0} />
                </div>
                <div className="text-sm text-muted-foreground">Focus Score</div>
                <Progress value={studyData.focusScore} className="mt-2" />
              </motion.div>
            </div>

            {/* Trend Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Performance Trend
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="studyTimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="studyTime"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#studyTimeGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Subject Progress Tile
export const SubjectProgressTile: React.FC<TileProps> = ({ period, onPeriodChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const timeRange: AnalyticsTimeRange = useMemo(() => ({ period }), [period]);

  const { data: subjectData, isLoading, error } = useQuery({
    queryKey: ['analytics', 'subjects', period],
    queryFn: async () => {
      const result = await analyticsApi.getSubjectAnalytics({ timeRange });
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleExport = useCallback(async () => {
    try {
      const result = await analyticsApi.exportAnalytics('json', { timeRange });
      if (result.data) {
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subject-progress-${period}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  }, [period, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subjectData) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load subject data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = subjectData.map(subject => ({
    name: subject.subjectName,
    value: subject.studyTime / 60,
    color: subject.color
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-900 dark:text-green-100">Subject Progress</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector value={period} onChange={onPeriodChange} />
              <ExportButton onExport={handleExport} />
              <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Expand className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Subject Progress Details</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                      {subjectData.map((subject, index) => (
                        <div key={subject.subjectId} className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{subject.subjectName}</span>
                            <Badge variant="outline">{subject.progressPercentage}%</Badge>
                          </div>
                          <Progress value={subject.progressPercentage} className="mb-2" />
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>Study Time: {subject.studyTimeFormatted}</div>
                            <div>Sessions: {subject.sessionsCount}</div>
                            <div>Tasks: {subject.tasksCompleted}/{subject.tasksTotal}</div>
                            <div>Focus: {subject.focusScore}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Circular Progress Charts */}
            <div className="grid grid-cols-1 gap-3">
              {subjectData.slice(0, 4).map((subject, index) => (
                <motion.div
                  key={subject.subjectId}
                  className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="relative">
                    <div className="w-12 h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="90%"
                          data={[{ value: subject.progressPercentage }]}
                        >
                          <RadialBar
                            dataKey="value"
                            cornerRadius={10}
                            fill={subject.color}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {subject.progressPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {subject.subjectName}
                      </p>
                      <Badge
                        variant="outline"
                        style={{ borderColor: subject.color, color: subject.color }}
                      >
                        {subject.tasksCompleted}/{subject.tasksTotal}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {subject.studyTimeFormatted}
                      <span className="ml-2">•</span>
                      <span className="ml-2">Focus: {subject.focusScore}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {subjectData.length > 4 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsExpanded(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All {subjectData.length} Subjects
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Task Productivity Tile
export const TaskProductivityTile: React.FC<TileProps> = ({ period, onPeriodChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const timeRange: AnalyticsTimeRange = useMemo(() => ({ period }), [period]);

  const { data: performanceData, isLoading, error } = useQuery({
    queryKey: ['analytics', 'performance', period],
    queryFn: async () => {
      const result = await analyticsApi.getPerformanceMetrics({ timeRange });
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: studyData } = useQuery({
    queryKey: ['analytics', 'study', period],
    queryFn: async () => {
      const result = await analyticsApi.getStudyAnalytics({ timeRange });
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleExport = useCallback(async () => {
    try {
      const result = await analyticsApi.exportAnalytics('json', { timeRange });
      if (result.data) {
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-productivity-${period}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  }, [period, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !performanceData || !studyData) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load productivity data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendData = performanceData.weeklyStats?.map(stat => ({
    date: stat.week,
    completed: stat.tasksCompleted,
    sessions: stat.sessions
  })) || [];

  const overdueCount = Math.floor(studyData.totalTasks * 0.1); // Mock overdue count
  const upcomingCount = Math.floor(studyData.totalTasks * 0.3); // Mock upcoming count

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900 dark:text-orange-100">Task Productivity</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector value={period} onChange={onPeriodChange} />
              <ExportButton onExport={handleExport} />
              <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Expand className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Task Productivity Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          <AnimatedCounter value={studyData.completedTasks} />
                        </div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          <AnimatedCounter value={studyData.totalTasks - studyData.completedTasks} />
                        </div>
                        <div className="text-sm text-muted-foreground">Remaining</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          <AnimatedCounter value={overdueCount} />
                        </div>
                        <div className="text-sm text-muted-foreground">Overdue</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          <AnimatedCounter value={upcomingCount} />
                        </div>
                        <div className="text-sm text-muted-foreground">Upcoming</div>
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" fill="#22c55e" name="Tasks Completed" />
                          <Bar dataKey="sessions" fill="#3b82f6" name="Study Sessions" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Completed
                  </Badge>
                </div>
                <div className="text-xl font-bold text-green-600">
                  <AnimatedCounter value={studyData.completedTasks} />
                </div>
                <div className="text-xs text-muted-foreground">Tasks</div>
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <Badge variant="destructive">
                    Overdue
                  </Badge>
                </div>
                <div className="text-xl font-bold text-red-600">
                  <AnimatedCounter value={overdueCount} />
                </div>
                <div className="text-xs text-muted-foreground">Tasks</div>
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                  <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                    Upcoming
                  </Badge>
                </div>
                <div className="text-xl font-bold text-yellow-600">
                  <AnimatedCounter value={upcomingCount} />
                </div>
                <div className="text-xs text-muted-foreground">Tasks</div>
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <Target className="h-4 w-4 text-blue-600" />
                  <Badge variant="outline">
                    Rate
                  </Badge>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  <AnimatedCounter value={studyData.completionRate * 100} decimals={0} suffix="%" />
                </div>
                <div className="text-xs text-muted-foreground">Completion</div>
              </motion.div>
            </div>

            {/* Completion Trend */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Completion Trend
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar
                      dataKey="completed"
                      fill="#22c55e"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Focus Insights Tile
export const FocusInsightsTile: React.FC<TileProps> = ({ period, onPeriodChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const timeRange: AnalyticsTimeRange = useMemo(() => ({ period }), [period]);

  const { data: performanceData, isLoading, error } = useQuery({
    queryKey: ['analytics', 'performance', period],
    queryFn: async () => {
      const result = await analyticsApi.getPerformanceMetrics({ timeRange });
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: insightsData } = useQuery({
    queryKey: ['analytics', 'insights', period],
    queryFn: async () => {
      const result = await analyticsApi.getProductivityInsights({ timeRange });
      if (result.error) throw result.error;
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleExport = useCallback(async () => {
    try {
      const result = await analyticsApi.exportAnalytics('json', { timeRange });
      if (result.data) {
        const url = URL.createObjectURL(result.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focus-insights-${period}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  }, [period, timeRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !performanceData) {
    return (
      <Card className="border-red-200">
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load focus insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dailyPatterns = performanceData.dailyPatterns || [];
  const bestTime = dailyPatterns.reduce((best, current) =>
    current.efficiency > best.efficiency ? current : best,
    dailyPatterns[0] || { hour: 9, efficiency: 0 }
  );

  const concentrationTrend = performanceData.weeklyStats?.map(stat => ({
    date: stat.week,
    focus: stat.focusScore,
    efficiency: Math.round((stat.studyTime / stat.sessions) * 10) / 10
  })) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-purple-900 dark:text-purple-100">Focus Insights</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <PeriodSelector value={period} onChange={onPeriodChange} />
              <ExportButton onExport={handleExport} />
              <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Expand className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Focus Insights Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-4">Daily Focus Patterns</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyPatterns}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="hour"
                                tickFormatter={(hour) => `${hour}:00`}
                              />
                              <YAxis />
                              <Tooltip
                                labelFormatter={(hour) => `${hour}:00`}
                                formatter={(value, name) => [
                                  name === 'efficiency' ? `${value}%` : value,
                                  name === 'efficiency' ? 'Efficiency' : 'Study Time (min)'
                                ]}
                              />
                              <Bar dataKey="studyTime" fill="#8b5cf6" name="Study Time" />
                              <Bar dataKey="efficiency" fill="#ec4899" name="Efficiency" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-4">Concentration Trends</h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={concentrationTrend}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="focus"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                name="Focus Score"
                              />
                              <Line
                                type="monotone"
                                dataKey="efficiency"
                                stroke="#ec4899"
                                strokeWidth={2}
                                name="Efficiency"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    {insightsData && (
                      <div>
                        <h4 className="font-medium mb-4">AI Insights</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {insightsData.insights.slice(0, 4).map((insight, index) => (
                            <div
                              key={index}
                              className={cn(
                                "p-4 rounded-lg border",
                                insight.impact === 'positive' && "border-green-200 bg-green-50",
                                insight.impact === 'negative' && "border-red-200 bg-red-50",
                                insight.impact === 'neutral' && "border-gray-200 bg-gray-50"
                              )}
                            >
                              <h5 className="font-medium text-sm mb-2">{insight.title}</h5>
                              <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                              {insight.recommendation && (
                                <p className="text-xs font-medium text-blue-600">{insight.recommendation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Best Study Time */}
            <motion.div
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Best Study Time</span>
                </div>
                <Badge variant="outline" className="border-purple-300 text-purple-700">
                  Peak Performance
                </Badge>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {bestTime.hour}:00 - {bestTime.hour + 1}:00
              </div>
              <div className="text-sm text-muted-foreground">
                {bestTime.efficiency}% efficiency • Optimal focus window
              </div>
            </motion.div>

            {/* Focus Pattern Chart */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Daily Focus Pattern
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyPatterns.slice(6, 22)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(hour) => `${hour}h`}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                    />
                    <Tooltip
                      labelFormatter={(hour) => `${hour}:00`}
                      formatter={(value) => [`${value}%`, 'Efficiency']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#focusGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Insights */}
            {insightsData && insightsData.insights.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Quick Insights
                </h4>
                <div className="space-y-2">
                  {insightsData.insights.slice(0, 2).map((insight, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg text-sm",
                        insight.impact === 'positive' && "bg-green-50 border border-green-200",
                        insight.impact === 'negative' && "bg-red-50 border border-red-200",
                        insight.impact === 'neutral' && "bg-blue-50 border border-blue-200"
                      )}
                    >
                      <div className="font-medium mb-1">{insight.title}</div>
                      <div className="text-xs text-muted-foreground">{insight.description}</div>
                    </div>
                  ))}
                  {insightsData.insights.length > 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setIsExpanded(true)}
                    >
                      View All Insights
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Dashboard Tiles Component
export const DashboardTiles: React.FC = () => {
  const [period, setPeriod] = useState<TimePeriod>('week');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <StudyPerformanceTile period={period} onPeriodChange={setPeriod} />
      <SubjectProgressTile period={period} onPeriodChange={setPeriod} />
      <TaskProductivityTile period={period} onPeriodChange={setPeriod} />
      <FocusInsightsTile period={period} onPeriodChange={setPeriod} />
    </div>
  );
};

export default DashboardTiles;