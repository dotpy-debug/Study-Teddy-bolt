'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Calendar,
  Clock,
  Flag,
  Edit,
  Trash2,
  CheckCircle,
  User,
  MessageSquare,
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task } from '@/types/tasks';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: Task['status']) => void;
  isDragging?: boolean;
  className?: string;
}

const priorityConfig = {
  low: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Flag },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Flag },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Flag },
  urgent: { color: 'bg-red-100 text-red-800 border-red-200', icon: Flag },
};

export function TaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onStatusChange,
  isDragging = false,
  className,
}: TaskCardProps) {
  const PriorityIcon = priorityConfig[task.priority].icon;

  const formatDueDate = (dueDate: string | undefined) => {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const today = startOfDay(new Date());
    const dueDateStart = startOfDay(date);

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let prefix = '';

    if (isBefore(dueDateStart, today)) {
      variant = 'destructive';
      prefix = 'Overdue ';
    } else if (dueDateStart.getTime() === today.getTime()) {
      variant = 'default';
      prefix = 'Today ';
    }

    return (
      <div className="flex items-center space-x-1 text-xs">
        <Calendar className="h-3 w-3" />
        <Badge variant={variant} className="text-xs px-1 py-0">
          {prefix}{format(date, 'MMM d')}
        </Badge>
      </div>
    );
  };

  const getStatusActions = () => {
    const statuses: Array<{ value: Task['status']; label: string }> = [
      { value: 'pending', label: 'Pending' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ];

    return statuses.filter(status => status.value !== task.status);
  };

  return (
    <Card
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        task.priority === 'urgent' && 'ring-2 ring-red-200',
        className
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4
              className="font-medium truncate text-sm mb-1"
              title={task.title}
            >
              {task.title}
            </h4>
            {task.description && (
              <p
                className="text-xs text-muted-foreground line-clamp-2"
                title={task.description}
              >
                {task.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Status changes */}
              {onStatusChange && getStatusActions().map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => onStatusChange(task, status.value)}
                >
                  Move to {status.label}
                </DropdownMenuItem>
              ))}

              {onStatusChange && <DropdownMenuSeparator />}

              {onToggleComplete && (
                <DropdownMenuItem
                  onClick={() => onToggleComplete(task)}
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    {task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
                  </span>
                </DropdownMenuItem>
              )}

              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(task)}
                  className="flex items-center space-x-2"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(task)}
                  className="flex items-center space-x-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Subject */}
        {task.subject && (
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: task.subject.color }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {task.subject.name}
            </span>
          </div>
        )}

        {/* Priority and AI badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <PriorityIcon className="h-3 w-3" />
            <Badge
              variant="outline"
              className={cn('text-xs px-1 py-0', priorityConfig[task.priority].color)}
            >
              {task.priority}
            </Badge>
          </div>

          {task.aiGenerated && (
            <Badge variant="secondary" className="text-xs px-1 py-0">
              AI
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {task.progressPercentage > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Progress</span>
              <span>{task.progressPercentage}%</span>
            </div>
            <Progress
              value={task.progressPercentage}
              className="h-1.5"
            />
          </div>
        )}

        {/* Time estimation */}
        {task.estimatedMinutes && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{task.estimatedMinutes}m estimated</span>
          </div>
        )}

        {/* Due date */}
        {formatDueDate(task.dueDate)}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
          </span>

          {/* Quick complete button for non-completed tasks */}
          {task.status !== 'completed' && onToggleComplete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(task);
              }}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}