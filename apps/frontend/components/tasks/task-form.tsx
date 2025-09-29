'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, BookOpen } from 'lucide-react';
import { isValidTaskTitle, isValidSubject, getDateForInput } from '@/lib/utils';
import { useNotifications } from '@/contexts/notification-context';
import type { Task, CreateTaskDto, UpdateTaskDto } from '@/types';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  task?: Task | null;
  loading?: boolean;
}

export function TaskForm({ isOpen, onClose, onSubmit, task, loading = false }: TaskFormProps) {
  const { showError, showWarning } = useNotifications();
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [error, setError] = useState('');

  // Initialize form when task changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title,
          subject: task.subject,
          description: task.description || '',
          dueDate: getDateForInput(task.dueDate),
          priority: task.priority,
        });
      } else {
        // Default to tomorrow for new tasks
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData({
          title: '',
          subject: '',
          description: '',
          dueDate: getDateForInput(tomorrow),
          priority: 'medium',
        });
      }
      setError('');
    }
  }, [isOpen, task]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }));
    if (error) setError('');
  };

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Title is required';
    }

    if (!isValidTaskTitle(formData.title)) {
      return 'Title must be between 3 and 100 characters';
    }

    if (!formData.subject.trim()) {
      return 'Subject is required';
    }

    if (!isValidSubject(formData.subject)) {
      return 'Subject must be between 2 and 50 characters';
    }

    if (!formData.dueDate) {
      return 'Due date is required';
    }

    const dueDate = new Date(formData.dueDate);
    if (isNaN(dueDate.getTime())) {
      return 'Please enter a valid due date';
    }

    // Check if due date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      return 'Due date cannot be in the past';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      showWarning(validationError, 'Validation Error');
      return;
    }

    try {
      const submitData = {
        title: formData.title.trim(),
        subject: formData.subject.trim(),
        description: formData.description.trim() || undefined,
        dueDate: new Date(formData.dueDate).toISOString(),
        priority: formData.priority,
      };

      await onSubmit(submitData);
      onClose();
    } catch (err: any) {
      const message = err.message || 'Failed to save task';
      setError(message);
      showError(message, 'Save Failed');
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {task
              ? 'Update your task details below.'
              : 'Add a new task to your study plan.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="subject"
                name="subject"
                placeholder="e.g., Mathematics, History"
                value={formData.subject}
                onChange={handleChange}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Add any additional details..."
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority *</Label>
            <Select
              value={formData.priority}
              onValueChange={handleSelectChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {task ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                task ? 'Update Task' : 'Create Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}