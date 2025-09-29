'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, CheckCircle, Circle } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks';
import { useNotifications } from '@/contexts/notification-context';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskActionsClientProps {
  task: Task;
}

export function TaskActionsClient({ task }: TaskActionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const { showSuccess, showError } = useNotifications();

  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      await tasksApi.updateTask(task.id, { completed: !task.completed });
      showSuccess(
        `Task ${task.completed ? 'marked as incomplete' : 'completed'}!`,
        'Task Updated'
      );

      // Trigger revalidation using router refresh
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      showError('Failed to update task', 'Update Error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await tasksApi.deleteTask(task.id);
      showSuccess('Task deleted successfully', 'Task Deleted');

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      showError('Failed to delete task', 'Delete Error');
    }
  };

  const handleEdit = () => {
    // Navigate to edit page or open edit modal
    router.push(`/tasks/${task.id}/edit`);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleComplete}
        disabled={isUpdating || isPending}
        className="p-1 h-8 w-8"
      >
        {task.completed ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleEdit}
        disabled={isPending}
        className="p-1 h-8 w-8"
      >
        <Edit className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}