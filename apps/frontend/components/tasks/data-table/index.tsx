'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from './data-table';
import { DataTableFilters } from './data-table-filters';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Download } from 'lucide-react';
import { tasksApi, handleApiError } from '@/services/tasks';
import { Task, TaskQueryParams, Subject, UpdateTaskDto } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';

interface TasksDataTableProps {
  availableSubjects?: Subject[];
  onCreateTask?: () => void;
  onEditTask?: (task: Task) => void;
  className?: string;
}

export function TasksDataTable({
  availableSubjects = [],
  onCreateTask,
  onEditTask,
  className,
}: TasksDataTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [filters, setFilters] = useState<TaskQueryParams>({
    limit: 20,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Calculate offset based on pagination
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      offset: pageIndex * pageSize,
      limit: pageSize,
    }));
  }, [pageIndex, pageSize]);

  // Fetch tasks data
  const {
    data: tasksResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getTasks(filters),
    staleTime: 30000, // 30 seconds
  });

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskDto }) =>
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

  const batchUpdateMutation = useMutation({
    mutationFn: (data: { taskIds: string[]; updateData: Partial<UpdateTaskDto> }) =>
      tasksApi.batchUpdateTasks(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Success',
        description: `${data.updated} tasks updated successfully`,
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

  const batchDeleteMutation = useMutation({
    mutationFn: (taskIds: string[]) => tasksApi.batchDeleteTasks({ taskIds }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: 'Success',
        description: `${data.deleted} tasks deleted successfully`,
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

  // Event handlers
  const handleFiltersChange = useCallback((newFilters: TaskQueryParams) => {
    setFilters(prev => ({ ...prev, ...newFilters, offset: 0 }));
    setPageIndex(0);
  }, []);

  const handleSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy, sortOrder, offset: 0 }));
    setPageIndex(0);
  }, []);

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  }, []);

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setSelectedTaskIds(selectedIds);
  }, []);

  const handleBatchUpdate = useCallback(async (updateData: Partial<UpdateTaskDto>) => {
    if (selectedTaskIds.length === 0) return;

    await batchUpdateMutation.mutateAsync({
      taskIds: selectedTaskIds,
      updateData,
    });
  }, [selectedTaskIds, batchUpdateMutation]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedTaskIds.length === 0) return;

    await batchDeleteMutation.mutateAsync(selectedTaskIds);
  }, [selectedTaskIds, batchDeleteMutation]);

  const handleToggleComplete = useCallback(async (task: Task) => {
    await toggleCompleteMutation.mutateAsync(task.id);
  }, [toggleCompleteMutation]);

  const handleDeleteTask = useCallback(async (task: Task) => {
    await deleteTaskMutation.mutateAsync(task.id);
  }, [deleteTaskMutation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleExport = useCallback(() => {
    // Implement export functionality
    const selectedTasks = tasksResponse?.tasks.filter(task =>
      selectedTaskIds.includes(task.id)
    );

    if (selectedTasks && selectedTasks.length > 0) {
      const csvContent = [
        'Title,Status,Priority,Subject,Due Date,Progress,Created',
        ...selectedTasks.map(task => [
          task.title,
          task.status,
          task.priority,
          task.subject?.name || '',
          task.dueDate || '',
          `${task.progressPercentage}%`,
          new Date(task.createdAt).toLocaleDateString(),
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Tasks exported successfully',
      });
    }
  }, [tasksResponse?.tasks, selectedTaskIds, toast]);

  // Loading state
  if (isLoading && !tasksResponse) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-lg font-medium text-destructive">Failed to load tasks</p>
          <p className="text-sm text-muted-foreground mt-1">
            {handleApiError(error)}
          </p>
          <Button onClick={handleRefresh} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tasks = tasksResponse?.tasks || [];
  const totalCount = tasksResponse?.pagination.total || 0;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary">
                  {totalCount} total
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
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {onCreateTask && (
                <Button onClick={onCreateTask} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <DataTableFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            availableSubjects={availableSubjects}
            isLoading={isLoading}
          />

          {/* Batch operations toolbar */}
          <DataTableToolbar
            selectedCount={selectedTaskIds.length}
            onBatchUpdate={handleBatchUpdate}
            onBatchDelete={handleBatchDelete}
            onExport={handleExport}
            onDeselectAll={() => setSelectedTaskIds([])}
            isLoading={isLoading}
          />

          {/* Data table */}
          <DataTable
            data={tasks}
            loading={isLoading}
            onSort={handleSort}
            onEdit={onEditTask}
            onDelete={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onSelectionChange={handleSelectionChange}
            selectedIds={selectedTaskIds}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
          />

          {/* Pagination */}
          {totalCount > 0 && (
            <DataTablePagination
              pageIndex={pageIndex}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}