'use client';

import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';
import { useNotifications } from '@/contexts/notification-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function NotificationDemo() {
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    addNotification
  } = useNotifications();

  const demoToastNotifications = () => {
    showSuccess('Task completed successfully!', 'Well done!');

    setTimeout(() => {
      showInfo('You have 3 upcoming deadlines this week', 'Study Reminder');
    }, 1000);

    setTimeout(() => {
      showWarning('Your study session has been running for 2 hours', 'Take a Break');
    }, 2000);

    setTimeout(() => {
      showError('Failed to save changes. Please try again.', 'Save Error');
    }, 3000);
  };

  const demoPersistentNotifications = () => {
    // High priority task reminder
    addNotification({
      type: 'warning',
      title: 'Assignment Due Tomorrow',
      message: 'Your calculus homework is due tomorrow at 11:59 PM. Don\'t forget to submit it!',
      priority: 'high',
      actionUrl: '/tasks',
      actionLabel: 'View Task',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Success achievement
    addNotification({
      type: 'success',
      title: 'Study Streak Achievement',
      message: 'Congratulations! You\'ve maintained a 7-day study streak. Keep up the great work!',
      priority: 'medium',
      actionUrl: '/analytics',
      actionLabel: 'View Progress',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // AI insight
    addNotification({
      type: 'info',
      title: 'AI Study Tip',
      message: 'Based on your recent study patterns, taking breaks every 45 minutes could improve your retention by 15%.',
      priority: 'low',
      actionUrl: '/ai',
      actionLabel: 'Chat with AI',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    });

    // Urgent system alert
    setTimeout(() => {
      addNotification({
        type: 'error',
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM. Some features may be unavailable.',
        priority: 'urgent',
        actionUrl: '/settings',
        actionLabel: 'Learn More',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      });
    }, 1000);
  };

  const demoMixedNotifications = () => {
    // Immediate toast
    showInfo('Starting notification demonstration...', 'Demo Mode');

    // Add some persistent notifications
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'New Feature Available',
        message: 'We\'ve added a new AI-powered study planner to help you organize your schedule more effectively.',
        priority: 'medium',
        actionUrl: '/dashboard',
        actionLabel: 'Try Now',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }, 500);

    setTimeout(() => {
      addNotification({
        type: 'warning',
        title: 'Low Study Time This Week',
        message: 'You\'ve only studied 8 hours this week. Your weekly goal is 15 hours.',
        priority: 'medium',
        actionUrl: '/analytics',
        actionLabel: 'View Analytics',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }, 1000);

    // Final toast
    setTimeout(() => {
      showSuccess('Demo completed! Check your notification center.', 'Demo Complete');
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification System Demo
        </CardTitle>
        <CardDescription>
          Test different types of notifications to see how the system works
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Toast Notifications
            </h4>
            <p className="text-sm text-muted-foreground">
              Temporary notifications that appear briefly and disappear automatically
            </p>
            <Button
              onClick={demoToastNotifications}
              variant="outline"
              className="w-full"
            >
              Show Toast Examples
            </Button>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Persistent Notifications
            </h4>
            <p className="text-sm text-muted-foreground">
              Notifications that stay in your notification center until dismissed
            </p>
            <Button
              onClick={demoPersistentNotifications}
              variant="outline"
              className="w-full"
            >
              Add Persistent Examples
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Mixed Demonstration
            </h4>
            <p className="text-sm text-muted-foreground">
              Experience both toast and persistent notifications together
            </p>
            <Button
              onClick={demoMixedNotifications}
              className="w-full"
            >
              Run Full Demo
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Notification Types:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Success
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Error
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              Warning
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Info
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}