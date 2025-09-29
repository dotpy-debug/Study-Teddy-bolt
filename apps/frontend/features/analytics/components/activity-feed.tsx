'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  BookOpen,
  Target,
  TrendingUp,
  Award,
  Calendar,
  User,
  AlertCircle,
  Plus,
  MoreHorizontal,
  Filter,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';

interface Activity {
  id: string;
  type: 'study_session' | 'task_completed' | 'goal_achieved' | 'milestone' | 'streak' | 'subject_added' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    duration?: number;
    subject?: string;
    taskCount?: number;
    goalId?: string;
    streakCount?: number;
    points?: number;
  };
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  priority: 'high' | 'medium' | 'low';
}

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
  showFilter?: boolean;
  realTimeUpdates?: boolean;
}

export function ActivityFeed({
  className,
  maxItems = 10,
  showFilter = true,
  realTimeUpdates = true,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'study' | 'tasks' | 'achievements'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Mock data generator for demonstration
  const generateMockActivities = (): Activity[] => {
    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'study_session',
        title: 'Completed Study Session',
        description: 'Mathematics - Calculus fundamentals',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        metadata: { duration: 45, subject: 'Mathematics' },
        priority: 'medium',
      },
      {
        id: '2',
        type: 'task_completed',
        title: 'Task Completed',
        description: 'Finished practice problems for linear algebra',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        metadata: { taskCount: 3, subject: 'Mathematics' },
        priority: 'low',
      },
      {
        id: '3',
        type: 'goal_achieved',
        title: 'Weekly Goal Achieved!',
        description: 'Reached 10 hours of study time this week',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        metadata: { goalId: 'weekly-hours', duration: 600 },
        priority: 'high',
      },
      {
        id: '4',
        type: 'streak',
        title: '7-Day Study Streak!',
        description: 'You\'ve studied for 7 consecutive days',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        metadata: { streakCount: 7 },
        priority: 'high',
      },
      {
        id: '5',
        type: 'subject_added',
        title: 'New Subject Added',
        description: 'Started studying Physics - Quantum Mechanics',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { subject: 'Physics' },
        priority: 'low',
      },
      {
        id: '6',
        type: 'achievement',
        title: 'Achievement Unlocked',
        description: 'Early Bird - Studied before 8 AM for 5 days',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { points: 50 },
        priority: 'medium',
      },
      {
        id: '7',
        type: 'milestone',
        title: 'Milestone Reached',
        description: 'Completed 100 practice problems',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { taskCount: 100 },
        priority: 'medium',
      },
      {
        id: '8',
        type: 'study_session',
        title: 'Focus Session Completed',
        description: 'Deep work session - Chemistry organic compounds',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: { duration: 90, subject: 'Chemistry' },
        priority: 'medium',
      },
    ];

    return mockActivities;
  };

  // Fetch activities
  const fetchActivities = async (refresh = false) => {
    if (refresh) setRefreshing(true);

    try {
      // In a real app, this would be an API call
      // const response = await api.get('/activities/recent');
      // setActivities(response.data);

      // For demo, using mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      const mockData = generateMockActivities();
      setActivities(mockData);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
      if (refresh) setRefreshing(false);
    }
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (filter !== 'all') {
      const filterMap = {
        study: ['study_session'],
        tasks: ['task_completed'],
        achievements: ['goal_achieved', 'achievement', 'milestone', 'streak'],
      };
      filtered = activities.filter(activity =>
        filterMap[filter]?.includes(activity.type)
      );
    }

    return filtered.slice(0, maxItems);
  }, [activities, filter, maxItems]);

  // Get activity icon and color
  const getActivityIcon = (type: Activity['type']) => {
    const iconMap = {
      study_session: <Clock className="h-4 w-4" />,
      task_completed: <CheckCircle className="h-4 w-4" />,
      goal_achieved: <Target className="h-4 w-4" />,
      milestone: <TrendingUp className="h-4 w-4" />,
      streak: <Award className="h-4 w-4" />,
      subject_added: <BookOpen className="h-4 w-4" />,
      achievement: <Award className="h-4 w-4" />,
    };

    return iconMap[type] || <AlertCircle className="h-4 w-4" />;
  };

  const getActivityColor = (type: Activity['type'], priority: Activity['priority']) => {
    const baseColors = {
      study_session: 'text-blue-500',
      task_completed: 'text-green-500',
      goal_achieved: 'text-purple-500',
      milestone: 'text-orange-500',
      streak: 'text-yellow-500',
      subject_added: 'text-indigo-500',
      achievement: 'text-pink-500',
    };

    return baseColors[type] || 'text-gray-500';
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return activityTime.toLocaleDateString();
  };

  // Format metadata for display
  const formatMetadata = (activity: Activity) => {
    const { metadata, type } = activity;
    if (!metadata) return null;

    const parts = [];

    if (metadata.duration) {
      parts.push(`${metadata.duration}m`);
    }
    if (metadata.subject) {
      parts.push(metadata.subject);
    }
    if (metadata.taskCount && type === 'task_completed') {
      parts.push(`${metadata.taskCount} task${metadata.taskCount > 1 ? 's' : ''}`);
    }
    if (metadata.streakCount) {
      parts.push(`${metadata.streakCount} days`);
    }
    if (metadata.points) {
      parts.push(`+${metadata.points} points`);
    }

    return parts.join(' • ');
  };

  // Initialize data
  useEffect(() => {
    fetchActivities();
  }, []);

  // Real-time updates simulation
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      // Simulate new activity occasionally
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        const newActivity: Activity = {
          id: `${Date.now()}`,
          type: 'study_session',
          title: 'New Study Session',
          description: 'Real-time activity update',
          timestamp: new Date().toISOString(),
          metadata: { duration: 25, subject: 'Live Demo' },
          priority: 'medium',
        };
        setActivities(prev => [newActivity, ...prev]);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-sm">
              Your latest study activities and achievements
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {showFilter && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Filter className="h-3 w-3" />
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter Activities</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    All Activities
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('study')}>
                    Study Sessions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('tasks')}>
                    Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('achievements')}>
                    Achievements
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchActivities(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-3 w-3', { 'animate-spin': refreshing })} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          {filteredActivities.length > 0 ? (
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => (
                <div key={activity.id}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex-shrink-0 mt-1 p-1.5 rounded-full',
                      activity.priority === 'high' ? 'bg-red-50' :
                      activity.priority === 'medium' ? 'bg-yellow-50' : 'bg-blue-50'
                    )}>
                      <div className={getActivityColor(activity.type, activity.priority)}>
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-foreground">
                            {activity.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.description}
                          </p>
                          {formatMetadata(activity) && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {formatMetadata(activity)}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(activity.timestamp)}
                          </span>
                          {activity.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                              High
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < filteredActivities.length - 1 && (
                    <Separator className="my-3" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent activities found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start studying to see your activities here
              </p>
            </div>
          )}
        </ScrollArea>

        {activities.length > maxItems && (
          <div className="mt-4 pt-3 border-t">
            <Button variant="ghost" size="sm" className="w-full">
              View All Activities
              <MoreHorizontal className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}