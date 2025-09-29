import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle, RotateCcw, Calendar, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  subject: 'math' | 'science' | 'language' | 'history' | 'art';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  estimatedTime: number;
  reviewCount?: number;
  lastReviewed?: string;
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (taskId: string, updatedData: Partial<Task>) => void;
  variant?: 'default' | 'urgent' | 'review';
}

const subjectConfig = {
  math: { label: 'Mathematics', className: 'subject-math' },
  science: { label: 'Science', className: 'subject-science' },
  language: { label: 'Language', className: 'subject-language' },
  history: { label: 'History', className: 'subject-history' },
  art: { label: 'Art', className: 'subject-art' }
};

const priorityConfig = {
  low: { label: 'Low', className: 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-300' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-300' },
  high: { label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-300' }
};

export function TaskCard({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
  variant = 'default'
}: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const dueDate = new Date(task.dueDate);
  const today = new Date();
  const isOverdue = dueDate < today && !task.completed;
  const isToday = dueDate.toDateString() === today.toDateString();
  const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

  const formatDueDate = () => {
    if (isOverdue) return 'Overdue';
    if (isToday) return 'Due Today';
    if (daysDiff === 1) return 'Due Tomorrow';
    if (daysDiff > 0) return `Due in ${daysDiff} days`;
    return dueDate.toLocaleDateString();
  };

  const cardVariants = {
    default: 'bg-card hover:bg-card-hover border-border',
    urgent: 'bg-red-50/80 hover:bg-red-100/80 border-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/40 dark:border-red-800',
    review: 'bg-orange-50/80 hover:bg-orange-100/80 border-orange-200 dark:bg-orange-950/30 dark:hover:bg-orange-950/40 dark:border-orange-800'
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete?.(task.id);
  };

  const handleEdit = () => {
    onEdit?.(task.id, task);
  };

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div
        className={cn(
          'p-4 rounded-lg border transition-all duration-200 hover-lift',
          cardVariants[variant],
          task.completed && 'opacity-60'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Completion Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'p-0 h-6 w-6 rounded-full hover:bg-transparent',
              task.completed ? 'text-green-600' : 'text-muted-foreground hover:text-primary'
            )}
            onClick={() => onToggleComplete(task.id)}
          >
            {task.completed ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Circle className="h-6 w-6" />
            )}
          </Button>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className={cn(
              'font-medium text-sm leading-tight',
              task.completed && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </h3>

            <div className="flex items-center gap-2">
              {variant === 'review' && (
                <RotateCcw className={cn(
                  'h-4 w-4 flex-shrink-0',
                  'text-orange-600 dark:text-orange-400'
                )} />
              )}

              {/* Action Menu */}
              {(onEdit || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Task
                      </DropdownMenuItem>
                    )}
                    {onEdit && onDelete && <DropdownMenuSeparator />}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Task Metadata */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className={cn('text-xs', subjectConfig[task.subject].className)}>
              {subjectConfig[task.subject].label}
            </Badge>
            
            <Badge 
              variant="outline" 
              className={cn('text-xs', priorityConfig[task.priority].className)}
            >
              {priorityConfig[task.priority].label}
            </Badge>
            
            {variant === 'review' && task.reviewCount && (
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300">
                Review #{task.reviewCount}
              </Badge>
            )}
          </div>

          {/* Due Date and Time */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span className={cn(
                isOverdue && 'text-red-600 font-medium',
                isToday && 'text-orange-600 font-medium'
              )}>
                {formatDueDate()}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedTime}min</span>
            </div>
          </div>

          {/* Urgent Indicators */}
          {(isOverdue || variant === 'urgent') && (
            <div className="flex items-center gap-1 mt-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">
                {isOverdue ? 'Past Due' : 'High Priority'}
              </span>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
};