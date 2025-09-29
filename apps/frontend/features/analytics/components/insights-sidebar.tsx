'use client';

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Zap,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  Star,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface WeeklyPoint {
  date: string;
  minutes: number;
  tasksCompleted: number;
  focusScore?: number;
  subjectsStudied?: number;
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

interface Insight {
  id: string;
  type: 'recommendation' | 'achievement' | 'warning' | 'trend';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon: React.ReactNode;
}

interface InsightsSidebarProps {
  data: WeeklyPoint[];
  goals: Goal[];
  dateRange: { from: string; to: string };
  className?: string;
}

export function InsightsSidebar({
  data,
  goals,
  dateRange,
  className,
}: InsightsSidebarProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Generate AI-powered insights based on data patterns
  const insights = useMemo((): Insight[] => {
    if (!data.length) return [];

    const insights: Insight[] = [];
    const totalMinutes = data.reduce((sum, d) => sum + (d.minutes || 0), 0);
    const totalTasks = data.reduce((sum, d) => sum + (d.tasksCompleted || 0), 0);
    const avgFocusScore = data.reduce((sum, d) => sum + (d.focusScore || 0), 0) / data.length;
    const dailyAverage = totalMinutes / data.length;

    // Trend analysis
    const recentData = data.slice(-7); // Last 7 days
    const olderData = data.slice(0, -7);

    if (olderData.length > 0) {
      const recentAvg = recentData.reduce((sum, d) => sum + d.minutes, 0) / recentData.length;
      const olderAvg = olderData.reduce((sum, d) => sum + d.minutes, 0) / olderData.length;
      const trend = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (trend > 15) {
        insights.push({
          id: 'upward-trend',
          type: 'achievement',
          title: 'Study Time Increasing',
          description: `Your study time has improved by ${trend.toFixed(0)}% recently. Keep up the great momentum!`,
          priority: 'high',
          actionable: false,
          icon: <TrendingUp className="h-4 w-4 text-green-500" />,
        });
      } else if (trend < -15) {
        insights.push({
          id: 'downward-trend',
          type: 'warning',
          title: 'Study Time Declining',
          description: `Your study time has decreased by ${Math.abs(trend).toFixed(0)}% recently. Consider adjusting your schedule.`,
          priority: 'high',
          actionable: true,
          action: {
            label: 'Review Schedule',
            onClick: () => {/* Navigate to schedule */},
          },
          icon: <TrendingDown className="h-4 w-4 text-red-500" />,
        });
      }
    }

    // Focus score insights
    if (avgFocusScore < 70) {
      insights.push({
        id: 'low-focus',
        type: 'recommendation',
        title: 'Improve Focus Quality',
        description: `Your average focus score is ${avgFocusScore.toFixed(0)}%. Try the Pomodoro technique or study environment changes.`,
        priority: 'medium',
        actionable: true,
        action: {
          label: 'Focus Tools',
          onClick: () => {/* Navigate to focus tools */},
        },
        icon: <Brain className="h-4 w-4 text-blue-500" />,
      });
    } else if (avgFocusScore > 85) {
      insights.push({
        id: 'high-focus',
        type: 'achievement',
        title: 'Excellent Focus',
        description: `Outstanding focus score of ${avgFocusScore.toFixed(0)}%! Your concentration habits are paying off.`,
        priority: 'medium',
        actionable: false,
        icon: <Zap className="h-4 w-4 text-yellow-500" />,
      });
    }

    // Task completion patterns
    const taskCompletionRate = totalTasks / data.length;
    if (taskCompletionRate < 2) {
      insights.push({
        id: 'low-task-completion',
        type: 'recommendation',
        title: 'Increase Task Completion',
        description: `You're completing ${taskCompletionRate.toFixed(1)} tasks per day. Consider breaking larger tasks into smaller ones.`,
        priority: 'medium',
        actionable: true,
        action: {
          label: 'Task Strategy',
          onClick: () => {/* Navigate to task management */},
        },
        icon: <CheckCircle className="h-4 w-4 text-orange-500" />,
      });
    }

    // Study consistency
    const studyDays = data.filter(d => d.minutes > 0).length;
    const consistencyRate = (studyDays / data.length) * 100;

    if (consistencyRate < 70) {
      insights.push({
        id: 'inconsistent-study',
        type: 'recommendation',
        title: 'Build Study Consistency',
        description: `You studied on ${consistencyRate.toFixed(0)}% of days. Aim for daily study sessions, even if brief.`,
        priority: 'high',
        actionable: true,
        action: {
          label: 'Set Reminders',
          onClick: () => {/* Navigate to reminders */},
        },
        icon: <Calendar className="h-4 w-4 text-purple-500" />,
      });
    } else if (consistencyRate > 90) {
      insights.push({
        id: 'consistent-study',
        type: 'achievement',
        title: 'Amazing Consistency',
        description: `You've studied on ${consistencyRate.toFixed(0)}% of days! Your dedication is remarkable.`,
        priority: 'medium',
        actionable: false,
        icon: <Star className="h-4 w-4 text-gold-500" />,
      });
    }

    // Peak performance times
    const hourlyData = data.reduce((acc, d) => {
      const hour = new Date(d.date).getHours();
      acc[hour] = (acc[hour] || 0) + d.minutes;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(hourlyData).reduce((a, b) =>
      hourlyData[Number(a[0])] > hourlyData[Number(b[0])] ? a : b
    );

    if (peakHour && hourlyData[Number(peakHour[0])] > 0) {
      const hour = Number(peakHour[0]);
      const timeStr = hour < 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`;
      insights.push({
        id: 'peak-time',
        type: 'recommendation',
        title: 'Optimize Study Schedule',
        description: `You're most productive around ${timeStr}. Consider scheduling challenging subjects during this time.`,
        priority: 'low',
        actionable: true,
        action: {
          label: 'Update Schedule',
          onClick: () => {/* Navigate to schedule */},
        },
        icon: <Clock className="h-4 w-4 text-blue-500" />,
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [data]);

  // Goal progress analysis
  const goalInsights = useMemo(() => {
    return goals.map(goal => {
      const progress = (goal.current / goal.target) * 100;
      const daysInPeriod = goal.period === 'weekly' ? 7 : goal.period === 'monthly' ? 30 : 90;
      const daysElapsed = Math.floor((new Date().getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = (daysElapsed / daysInPeriod) * 100;

      return {
        ...goal,
        progress,
        expectedProgress,
        isOnTrack: progress >= expectedProgress * 0.9, // 10% tolerance
      };
    });
  }, [goals, dateRange]);

  const handleRefreshInsights = async () => {
    setRefreshing(true);
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const priorityColors = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const typeIcons = {
    recommendation: <Lightbulb className="h-4 w-4" />,
    achievement: <CheckCircle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    trend: <TrendingUp className="h-4 w-4" />,
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* AI Insights */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-500" />
                AI Insights
              </CardTitle>
              <CardDescription className="text-sm">
                Personalized recommendations based on your data
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshInsights}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-3 w-3', { 'animate-spin': refreshing })} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.slice(0, 4).map((insight, index) => (
                <div
                  key={insight.id}
                  className={cn(
                    'rounded-lg border p-3 transition-all hover:shadow-sm',
                    priorityColors[insight.priority]
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {insight.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0.5"
                        >
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-90 mb-2">
                        {insight.description}
                      </p>
                      {insight.actionable && insight.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={insight.action.onClick}
                        >
                          {insight.action.label}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {insights.length > 4 && (
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View {insights.length - 4} more insights
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                More data needed for insights
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Progress */}
      {goalInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Goal Progress
            </CardTitle>
            <CardDescription className="text-sm">
              Track your progress toward study goals
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {goalInsights.map((goal) => (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{goal.title}</h4>
                    <Badge
                      variant={goal.isOnTrack ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {goal.progress.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress
                    value={goal.progress}
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{goal.current} / {goal.target} {goal.unit}</span>
                    <span>{goal.period}</span>
                  </div>
                  {!goal.isOnTrack && (
                    <p className="text-xs text-orange-600">
                      Behind schedule - consider increasing daily effort
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Avg. Daily Study</span>
              </div>
              <span className="text-sm font-medium">
                {data.length > 0
                  ? `${Math.floor(data.reduce((sum, d) => sum + d.minutes, 0) / data.length)}m`
                  : '0m'
                }
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Tasks/Day</span>
              </div>
              <span className="text-sm font-medium">
                {data.length > 0
                  ? (data.reduce((sum, d) => sum + d.tasksCompleted, 0) / data.length).toFixed(1)
                  : '0'
                }
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Focus Score</span>
              </div>
              <span className="text-sm font-medium">
                {data.length > 0
                  ? `${(data.reduce((sum, d) => sum + (d.focusScore || 0), 0) / data.length).toFixed(0)}%`
                  : '0%'
                }
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Study Days</span>
              </div>
              <span className="text-sm font-medium">
                {data.filter(d => d.minutes > 0).length}/{data.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Best Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Next Best Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {insights
              .filter(insight => insight.actionable)
              .slice(0, 3)
              .map((insight) => (
                <Button
                  key={insight.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto p-2"
                  onClick={insight.action?.onClick}
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{insight.action?.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {insight.title}
                    </div>
                  </div>
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Button>
              ))}
            {insights.filter(i => i.actionable).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No actions needed right now. Great job! 🎉
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}