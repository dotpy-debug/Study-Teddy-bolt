'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  Clock,
  ArrowUpDown,
  Calendar,
  Flag,
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Task, TaskQueryParams } from '@/types/tasks';

interface DataTableProps {
  data: Task[];
  loading?: boolean;
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onFilter?: (filters: TaskQueryParams) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedIds?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  showSelection?: boolean;
  showActions?: boolean;
}

const priorityConfig = {
  low: { color: 'bg-blue-100 text-blue-800', icon: Flag, label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-800', icon: Flag, label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', icon: Flag, label: 'High' },
  urgent: { color: 'bg-red-100 text-red-800', icon: Flag, label: 'Urgent' },
};

const statusConfig = {
  pending: { color: 'bg-gray-100 text-gray-800', icon: Circle, label: 'Pending' },
  in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'In Progress' },
  completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800', icon: Circle, label: 'Cancelled' },
};

export function DataTable({
  data,
  loading = false,
  onSort,
  onFilter,
  onEdit,
  onDelete,
  onToggleComplete,
  onSelectionChange,
  selectedIds = [],
  sortBy,
  sortOrder,
  showSelection = true,
  showActions = true,
}: DataTableProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // Update local selection when prop changes
  React.useEffect(() => {
    setLocalSelectedIds(selectedIds);
  }, [selectedIds]);

  const handleSort = useCallback((column: string) => {
    if (!onSort) return;

    const newSortOrder =
      sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column, newSortOrder);
  }, [onSort, sortBy, sortOrder]);

  const handleSelectAll = useCallback((checked: boolean) => {
    const newSelection = checked ? data.map(task => task.id) : [];
    setLocalSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  }, [data, onSelectionChange]);

  const handleSelectRow = useCallback((taskId: string, checked: boolean) => {
    const newSelection = checked
      ? [...localSelectedIds, taskId]
      : localSelectedIds.filter(id => id !== taskId);

    setLocalSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  }, [localSelectedIds, onSelectionChange]);

  const isAllSelected = data.length > 0 && localSelectedIds.length === data.length;
  const isIndeterminate = localSelectedIds.length > 0 && localSelectedIds.length < data.length;

  const SortableHeader = ({ children, column, className = '' }: {
    children: React.ReactNode;
    column: string;
    className?: string;
  }) => (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50', className)}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {sortBy === column ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  const formatDueDate = (dueDate: string | undefined) => {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const today = startOfDay(new Date());
    const dueDateStart = startOfDay(date);

    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
    let prefix = '';

    if (isBefore(dueDateStart, today)) {
      variant = 'destructive';
      prefix = 'Overdue: ';
    } else if (dueDateStart.getTime() === today.getTime()) {
      variant = 'default';
      prefix = 'Today: ';
    }

    return (
      <div className="flex items-center space-x-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Badge variant={variant} className="text-xs">
          {prefix}{format(date, 'MMM d, yyyy')}
        </Badge>
      </div>
    );
  };

  const formatProgress = (task: Task) => {
    const percentage = task.progressPercentage || 0;
    const isCompleted = task.status === 'completed';

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span>{percentage}%</span>
          {task.estimatedMinutes && (
            <span className="text-muted-foreground">
              {task.estimatedMinutes}m est.
            </span>
          )}
        </div>
        <Progress
          value={percentage}
          className={cn(
            'h-2',
            isCompleted && 'bg-green-100'
          )}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first task to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showSelection && (
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all tasks"
                />
              </TableHead>
            )}
            <SortableHeader column="status" className="w-32">
              Status
            </SortableHeader>
            <SortableHeader column="title" className="min-w-[200px]">
              Title
            </SortableHeader>
            <SortableHeader column="subject" className="w-40">
              Subject
            </SortableHeader>
            <SortableHeader column="priority" className="w-32">
              Priority
            </SortableHeader>
            <SortableHeader column="dueDate" className="w-40">
              Due Date
            </SortableHeader>
            <TableHead className="w-48">Progress</TableHead>
            <SortableHeader column="createdAt" className="w-32">
              Created
            </SortableHeader>
            {showActions && (
              <TableHead className="w-16">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((task) => {
            const isSelected = localSelectedIds.includes(task.id);
            const StatusIcon = statusConfig[task.status].icon;
            const PriorityIcon = priorityConfig[task.priority].icon;

            return (
              <TableRow
                key={task.id}
                data-state={isSelected ? 'selected' : undefined}
                className={cn(
                  'hover:bg-muted/50',
                  isSelected && 'bg-muted'
                )}
              >
                {showSelection && (
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleSelectRow(task.id, checked === true)
                      }
                      aria-label={`Select task: ${task.title}`}
                    />
                  </TableCell>
                )}

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <StatusIcon className="h-4 w-4" />
                    <Badge
                      variant="outline"
                      className={cn('text-xs', statusConfig[task.status].color)}
                    >
                      {statusConfig[task.status].label}
                    </Badge>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium truncate max-w-[200px]" title={task.title}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div
                        className="text-xs text-muted-foreground truncate max-w-[200px]"
                        title={task.description}
                      >
                        {task.description}
                      </div>
                    )}
                    {task.aiGenerated && (
                      <Badge variant="secondary" className="text-xs">
                        AI Generated
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {task.subject ? (
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.subject.color }}
                      />
                      <span className="text-sm truncate" title={task.subject.name}>
                        {task.subject.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <PriorityIcon className="h-4 w-4" />
                    <Badge
                      variant="outline"
                      className={cn('text-xs', priorityConfig[task.priority].color)}
                    >
                      {priorityConfig[task.priority].label}
                    </Badge>
                  </div>
                </TableCell>

                <TableCell>
                  {formatDueDate(task.dueDate)}
                </TableCell>

                <TableCell>
                  {formatProgress(task)}
                </TableCell>

                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </span>
                </TableCell>

                {showActions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label={`Actions for task: ${task.title}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}