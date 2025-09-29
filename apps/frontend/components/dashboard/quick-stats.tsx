import React from 'react';
import { AlertTriangle, Calendar, RotateCcw, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface QuickStatsProps {
  overdueTasks: number;
  todayTasks: number;
  reviewDue: number;
  totalStudyTime: number;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  overdueTasks,
  todayTasks,
  reviewDue,
  totalStudyTime
}) => {
  const stats = [
    {
      icon: AlertTriangle,
      label: 'Overdue',
      value: overdueTasks,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    {
      icon: Calendar,
      label: 'Due Today',
      value: todayTasks,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      borderColor: 'border-orange-200 dark:border-orange-800'
    },
    {
      icon: RotateCcw,
      label: 'Reviews Due',
      value: reviewDue,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      icon: Clock,
      label: 'Study Time',
      value: `${Math.floor(totalStudyTime / 60)}h ${totalStudyTime % 60}m`,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className={`${stat.bgColor} ${stat.borderColor} border`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-background/50 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className={`text-sm ${stat.color} opacity-80`}>
                  {stat.label}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};