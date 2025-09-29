import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar, Clock, BookOpen } from 'lucide-react';
import { TaskActionsClient } from './task-actions-client';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  subject: 'math' | 'science' | 'language' | 'history' | 'art';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  estimatedTime: number;
  description?: string;
}

interface TaskCardServerProps {
  task: Task;
  variant?: 'default' | 'urgent';
}

const subjectColors = {
  math: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  science: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  language: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  history: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  art: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function formatDueDate(dateString: string): { formatted: string; isOverdue: boolean; isToday: boolean } {
  const dueDate = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const isOverdue = dueDate < now;
  const isToday = taskDate.getTime() === today.getTime();

  const timeStr = dueDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return { formatted: `Today at ${timeStr}`, isOverdue, isToday };
  }

  const dateStr = dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return { formatted: `${dateStr} at ${timeStr}`, isOverdue, isToday };
}

export function TaskCardServer({ task, variant = 'default' }: TaskCardServerProps) {
  const { formatted: dueDateFormatted, isOverdue, isToday } = formatDueDate(task.dueDate);

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        variant === 'urgent' && 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
        task.completed && 'opacity-75'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'font-semibold text-sm leading-tight',
                task.completed && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <TaskActionsClient task={task} />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={subjectColors[task.subject]}>
              <BookOpen className="h-3 w-3 mr-1" />
              {task.subject.charAt(0).toUpperCase() + task.subject.slice(1)}
            </Badge>

            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>

            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {task.estimatedTime}m
            </div>
          </div>

          <div
            className={cn(
              'flex items-center text-xs',
              isOverdue && !task.completed
                ? 'text-red-600 dark:text-red-400'
                : isToday
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-muted-foreground'
            )}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {dueDateFormatted}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}