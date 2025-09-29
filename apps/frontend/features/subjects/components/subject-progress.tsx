"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  BarChart3Icon,
  CalendarIcon,
  ClockIcon,
  TargetIcon,
  FireIcon,
  TrophyIcon
} from "lucide-react";
import { useSubjectAnalytics } from "../hooks/useSubjects";
import { format, parseISO } from 'date-fns';

interface SubjectProgressProps {
  subjectId: string;
}

export const SubjectProgress = ({ subjectId }: SubjectProgressProps) => {
  const [timeWindow, setTimeWindow] = useState<'week' | 'month' | 'quarter' | 'year'>('week');

  const { data: analytics, isLoading, error } = useSubjectAnalytics(subjectId, { window: timeWindow });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading analytics data.</p>
      </div>
    );
  }

  const { metrics, dailyFocusTime, weeklyComparison } = analytics;

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <TrendingDownIcon className="h-4 w-4 text-red-500" />;
    } else {
      return <MinusIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getWeeklyChangeText = (change: number) => {
    if (change > 0) {
      return `+${Math.abs(change)}% from last ${timeWindow}`;
    } else if (change < 0) {
      return `-${Math.abs(change)}% from last ${timeWindow}`;
    } else {
      return `No change from last ${timeWindow}`;
    }
  };

  const timeWindowLabels = {
    week: 'Week',
    month: 'Month',
    quarter: 'Quarter',
    year: 'Year'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3Icon className="h-5 w-5" />
          Subject Analytics
        </h3>
        <Select value={timeWindow} onValueChange={(value: any) => setTimeWindow(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              Focus Time ({timeWindowLabels[timeWindow]})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatTime(metrics.totalFocusedMinutes)}
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              {getTrendIcon(weeklyComparison.change)}
              {getWeeklyChangeText(weeklyComparison.change)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TargetIcon className="h-4 w-4" />
              Completion Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.completionRate}%
            </div>
            <Progress value={metrics.completionRate} className="mt-2" />
            <div className="text-sm text-muted-foreground mt-1">
              {metrics.completedTasks} of {metrics.completedTasks + metrics.pendingTasks} tasks
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FireIcon className="h-4 w-4" />
              Study Streak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.currentStreak}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {metrics.currentStreak === 1 ? 'day' : 'days'} in a row
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Study Sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.sessionsCount}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Avg: {metrics.averageSessionDuration}min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Focus Time Chart */}
      {dailyFocusTime.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Focus Time</CardTitle>
            <CardDescription>Your study time over the past {timeWindow}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyFocusTime.slice(-14).map((day, index) => {
                const maxMinutes = Math.max(...dailyFocusTime.map(d => d.minutes));
                const widthPercentage = maxMinutes > 0 ? (day.minutes / maxMinutes) * 100 : 0;

                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-muted-foreground">
                      {format(parseISO(day.date), 'MMM dd')}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${widthPercentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-sm font-medium text-right">
                      {formatTime(day.minutes)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5" />
            Performance Insights
          </CardTitle>
          <CardDescription>Key metrics for this {timeWindow}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Study Activity</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sessions:</span>
                  <span className="font-medium">{metrics.sessionsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Session:</span>
                  <span className="font-medium">{metrics.averageSessionDuration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Focus Time:</span>
                  <span className="font-medium">{formatTime(metrics.totalFocusedMinutes)}</span>
                </div>
                {metrics.lastStudiedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Studied:</span>
                    <span className="font-medium">
                      {format(parseISO(metrics.lastStudiedAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Task Progress</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed Tasks:</span>
                  <span className="font-medium text-green-600">{metrics.completedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Tasks:</span>
                  <span className="font-medium text-orange-600">{metrics.pendingTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completion Rate:</span>
                  <span className="font-medium">{metrics.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Streak:</span>
                  <span className="font-medium">{metrics.currentStreak} days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Comparison */}
          {weeklyComparison && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">This {timeWindowLabels[timeWindow]} vs Last {timeWindowLabels[timeWindow]}</h4>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">This {timeWindow}: </span>
                  <span className="font-medium">{formatTime(weeklyComparison.thisWeek)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Last {timeWindow}: </span>
                  <span className="font-medium">{formatTime(weeklyComparison.lastWeek)}</span>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium">
                  {getTrendIcon(weeklyComparison.change)}
                  <span className={weeklyComparison.change > 0 ? 'text-green-600' : weeklyComparison.change < 0 ? 'text-red-600' : 'text-gray-600'}>
                    {Math.abs(weeklyComparison.change)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};