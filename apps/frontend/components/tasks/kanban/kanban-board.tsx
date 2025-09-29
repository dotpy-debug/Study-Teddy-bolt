'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  RefreshCw,
  Filter,
  Search,
  Plus,
  MoreHorizontal,
  BookOpen,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { KanbanColumn } from './kanban-column';
import { tasksApi, handleApiError } from '@/services/tasks';
import { Task, TaskQueryParams, Subject } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';

interface KanbanBoardProps {
  availableSubjects?: Subject[];
  onCreateTask?: (status?: Task['status']) => void;
  onEditTask?: (task: Task) => void;
  className?: string;
}

const columns: Array<{
  status: Task['status'];
  title: string;
  description: string;
}> = [
  {
    status: 'pending',
    title: 'To Do',
    description: 'Tasks ready to be started',
  },
  {
    status: 'in_progress',
    title: 'In Progress',
    description: 'Tasks currently being worked on',
  },
  {
    status: 'completed',
    title: 'Completed',
    description: 'Tasks that have been finished',
  },
  {
    status: 'cancelled',
    title: 'Cancelled',
    description: 'Tasks that have been cancelled',
  },
];

export function KanbanBoard({
  availableSubjects = [],
  onCreateTask,
  onEditTask,
  className,
}: KanbanBoardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters state
  const [filters, setFilters] = useState<TaskQueryParams>({
    limit: 1000, // Get all tasks for kanban view
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  // Fetch tasks
  const {
    data: tasksResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getTasks(filters),
    staleTime: 30000,
  });

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: handleApiError(error),
        variant: 'destructive',
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: handleApiError(error),
        variant: 'destructive',
      });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.toggleTaskCompletion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Success',
        description: 'Task status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: handleApiError(error),
        variant: 'destructive',
      });
    },
  });

  // Filter and group tasks
  const { tasksByStatus, totalTasks, filteredTasksCount } = useMemo(() => {
    const allTasks = tasksResponse?.tasks || [];

    // Apply local filters
    let filtered = allTasks;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.title.toLowerCase().includes(term) ||
          task.description?.toLowerCase().includes(term) ||
          task.subject?.name.toLowerCase().includes(term)
      );
    }

    if (selectedSubject) {
      filtered = filtered.filter(task => task.subject?.id === selectedSubject);
    }

    if (selectedPriority) {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }

    // Group by status
    const grouped: Record<Task['status'], Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    filtered.forEach(task => {
      grouped[task.status].push(task);
    });

    return {
      tasksByStatus: grouped,
      totalTasks: allTasks.length,
      filteredTasksCount: filtered.length,
    };
  }, [tasksResponse?.tasks, searchTerm, selectedSubject, selectedPriority]);

  // Event handlers
  const handleTaskDrop = async (taskId: string, newStatus: Task['status']) => {
    const task = tasksResponse?.tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: { status: newStatus },
    });
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    if (task.status === newStatus) return;

    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: { status: newStatus },
    });
  };

  const handleToggleComplete = async (task: Task) => {
    await toggleCompleteMutation.mutateAsync(task.id);
  };

  const handleDeleteTask = async (task: Task) => {
    await deleteTaskMutation.mutateAsync(task.id);
  };

  const handleCreateTask = (status?: Task['status']) => {
    onCreateTask?.(status);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSubject('');
    setSelectedPriority('');
  };

  const hasActiveFilters = searchTerm || selectedSubject || selectedPriority;

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-lg font-medium text-destructive">Failed to load tasks</p>
          <p className="text-sm text-muted-foreground mt-1">
            {handleApiError(error)}
          </p>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header with filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Task Board
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary">
                  {filteredTasksCount} of {totalTasks} tasks
                </Badge>
                {isLoading && (
                  <Badge variant="outline">
                    Updating...
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {onCreateTask && (
                <Button onClick={() => handleCreateTask()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isLoading}
              />
            </div>

            {/* Subject filter */}
            {availableSubjects.length > 0 && (
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                disabled={isLoading}
              >
                <SelectTrigger className="w-48">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <SelectValue placeholder="All subjects" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All subjects</SelectItem>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span>{subject.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Priority filter */}
            <Select
              value={selectedPriority}
              onValueChange={setSelectedPriority}
              disabled={isLoading}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4">
            {columns.map((column) => {
              const count = tasksByStatus[column.status].length;
              const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;

              return (
                <div key={column.status} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{column.title}</div>
                  <div className="text-xs text-muted-foreground">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)]">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status}
            title={column.title}
            status={column.status}
            tasks={tasksByStatus[column.status]}
            onTaskDrop={handleTaskDrop}
            onCreateTask={() => handleCreateTask(column.status)}
            onEditTask={onEditTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onStatusChange={handleStatusChange}
            isLoading={isLoading}
            className="min-h-0"
          />
        ))}
      </div>
    </div>
  );
}