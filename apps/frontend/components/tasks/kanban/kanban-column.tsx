'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  CheckCircle,
  Circle,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';
import { Task } from '@/types/tasks';

interface KanbanColumnProps {
  title: string;
  status: Task['status'];
  tasks: Task[];
  onTaskDrop?: (taskId: string, newStatus: Task['status']) => void;
  onCreateTask?: (status: Task['status']) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: Task['status']) => void;
  isLoading?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Circle,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    headerColor: 'border-gray-200',
  },
  in_progress: {
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    headerColor: 'border-blue-200',
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    headerColor: 'border-green-200',
  },
  cancelled: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    headerColor: 'border-red-200',
  },
};

export function KanbanColumn({
  title,
  status,
  tasks,
  onTaskDrop,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onStatusChange,
  isLoading = false,
  className,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const StatusIcon = statusConfig[status].icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onTaskDrop) {
      onTaskDrop(taskId, status);
    }
  };

  const sortTasks = (tasks: Task[]) => {
    const sorted = [...tasks].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'dueDate':
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        case 'created':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const sortedTasks = sortTasks(tasks);

  const getTaskCountByPriority = () => {
    const counts = {
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    };
    return counts;
  };

  const priorityCounts = getTaskCountByPriority();

  return (
    <Card
      className={cn(
        'h-full flex flex-col transition-all duration-200',
        isDragOver && 'ring-2 ring-primary/50 bg-primary/5',
        statusConfig[status].headerColor,
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge
              variant="outline"
              className={cn('text-xs', statusConfig[status].color)}
            >
              {tasks.length}
            </Badge>
          </div>

          <div className="flex items-center space-x-1">
            {/* Add task button */}
            {onCreateTask && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onCreateTask(status)}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}

            {/* Column options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={isLoading}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Column Options</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Sort options */}
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy('priority');
                    setSortOrder(sortBy === 'priority' && sortOrder === 'desc' ? 'asc' : 'desc');
                  }}
                  className="flex items-center justify-between"
                >
                  <span>Sort by Priority</span>
                  {sortBy === 'priority' && (
                    sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setSortBy('dueDate');
                    setSortOrder(sortBy === 'dueDate' && sortOrder === 'desc' ? 'asc' : 'desc');
                  }}
                  className="flex items-center justify-between"
                >
                  <span>Sort by Due Date</span>
                  {sortBy === 'dueDate' && (
                    sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setSortBy('created');
                    setSortOrder(sortBy === 'created' && sortOrder === 'desc' ? 'asc' : 'desc');
                  }}
                  className="flex items-center justify-between"
                >
                  <span>Sort by Created</span>
                  {sortBy === 'created' && (
                    sortOrder === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {onCreateTask && (
                  <DropdownMenuItem
                    onClick={() => onCreateTask(status)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Task</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Priority breakdown */}
        {(priorityCounts.urgent > 0 || priorityCounts.high > 0) && (
          <div className="flex items-center space-x-2 text-xs">
            {priorityCounts.urgent > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-1 py-0">
                {priorityCounts.urgent} urgent
              </Badge>
            )}
            {priorityCounts.high > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 px-1 py-0">
                {priorityCounts.high} high
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-3 pb-3">
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="mt-2 text-xs text-muted-foreground">Loading...</p>
              </div>
            ) : sortedTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2">
                  <StatusIcon className="h-8 w-8 mx-auto opacity-50" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">No {title.toLowerCase()} tasks</p>
                {onCreateTask && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCreateTask(status)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Task
                  </Button>
                )}
              </div>
            ) : (
              sortedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onToggleComplete={onToggleComplete}
                  onStatusChange={onStatusChange}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Drop zone indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-primary font-medium">Drop here</div>
            <div className="text-xs text-muted-foreground">Move to {title}</div>
          </div>
        </div>
      )}
    </Card>
  );
}