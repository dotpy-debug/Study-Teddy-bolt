"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  ClockIcon,
  PlusIcon,
  BarChart3Icon,
  BookOpenIcon,
  EditIcon,
  PlayIcon,
  ArchiveIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  CalendarIcon,
  FileTextIcon,
  ExternalLinkIcon,
  LoaderIcon,
} from "lucide-react";
import { Subject } from "../types";
import { useSubjectOperations } from "../hooks/useSubjects";
import { useCreateTask } from "@/hooks/queries/use-tasks";
import { useStartSession } from "@/hooks/queries/use-focus-sessions";
import { SubjectForm } from "./subject-form";
import { cn } from "@/lib/utils";

interface SubjectQuickActionsProps {
  subject: Subject;
  variant?: 'default' | 'compact' | 'minimal';
  showAnalytics?: boolean;
  className?: string;
}

interface QuickTaskFormProps {
  subjectId: string;
  onClose: () => void;
}

const QuickTaskForm = ({ subjectId, onClose }: QuickTaskFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const createTask = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTask.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      subjectId,
      status: 'pending',
      type: 'study'
    }, {
      onSuccess: () => {
        onClose();
        setTitle('');
        setDescription('');
        setPriority('medium');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Task Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Priority</label>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                priority === p
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
        >
          {createTask.isPending && <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />}
          Create Task
        </Button>
      </div>
    </form>
  );
};

interface StartSessionFormProps {
  subjectId: string;
  onClose: () => void;
}

const StartSessionForm = ({ subjectId, onClose }: StartSessionFormProps) => {
  const [type, setType] = useState<'focus' | 'pomodoro' | 'deepwork'>('focus');
  const [duration, setDuration] = useState(25);
  const [goal, setGoal] = useState('');
  const startSession = useStartSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startSession.mutate({
      type,
      subjectId,
      plannedDuration: duration,
      goal: goal.trim() || undefined,
      settings: type === 'pomodoro' ? {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        cyclesUntilLongBreak: 4
      } : undefined
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Session Type</label>
        <div className="flex gap-2">
          {([
            { value: 'focus', label: 'Focus Session' },
            { value: 'pomodoro', label: 'Pomodoro' },
            { value: 'deepwork', label: 'Deep Work' }
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                type === value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="duration" className="block text-sm font-medium mb-2">
          Duration (minutes)
        </label>
        <input
          id="duration"
          type="number"
          min="5"
          max="180"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value) || 25)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="goal" className="block text-sm font-medium mb-2">
          Session Goal (optional)
        </label>
        <input
          id="goal"
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What do you want to accomplish?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={startSession.isPending}
        >
          {startSession.isPending && <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />}
          Start Session
        </Button>
      </div>
    </form>
  );
};

export const SubjectQuickActions = ({
  subject,
  variant = 'default',
  showAnalytics = true,
  className
}: SubjectQuickActionsProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const { updateSubject, isLoading } = useSubjectOperations();

  const handleArchiveToggle = () => {
    updateSubject({
      id: subject.id,
      data: { isArchived: !subject.isArchived }
    });
  };

  const handleViewAnalytics = () => {
    // This would typically navigate to analytics page or open analytics modal
    window.open(`/subjects/${subject.id}/analytics`, '_blank');
  };

  const handleViewResources = () => {
    // This would typically navigate to resources page or open resources modal
    window.open(`/subjects/${subject.id}/resources`, '_blank');
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSessionDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <PlayIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start Focus Session</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTaskDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Task</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <EditIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit Subject</TooltipContent>
        </Tooltip>

        {/* Dialogs */}
        <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Study Session</DialogTitle>
            </DialogHeader>
            <StartSessionForm subjectId={subject.id} onClose={() => setSessionDialogOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <QuickTaskForm subjectId={subject.id} onClose={() => setTaskDialogOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
            </DialogHeader>
            <SubjectForm
              subject={subject}
              onSubmit={() => setEditDialogOpen(false)}
              onCancel={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <span className="font-medium">{subject.name}</span>
              {subject.isArchived && (
                <Badge variant="secondary" className="text-xs">
                  Archived
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={() => setSessionDialogOpen(true)}
              className="w-full"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Focus
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTaskDialogOpen(true)}
              className="w-full"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Task
            </Button>
          </div>

          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleViewAnalytics}
              className="flex-1"
            >
              <BarChart3Icon className="h-4 w-4 mr-1" />
              Analytics
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleViewResources}
              className="flex-1"
            >
              <BookOpenIcon className="h-4 w-4 mr-1" />
              Resources
            </Button>
          </div>

          {/* Dialogs */}
          <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start Study Session</DialogTitle>
              </DialogHeader>
              <StartSessionForm subjectId={subject.id} onClose={() => setSessionDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <QuickTaskForm subjectId={subject.id} onClose={() => setTaskDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Default variant - full featured
  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </div>
            {subject.isArchived && (
              <Badge variant="secondary">
                <ArchiveIcon className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Primary Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => setSessionDialogOpen(true)}
              disabled={subject.isArchived}
              className="h-12 justify-start"
            >
              <PlayIcon className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Start Focus Session</div>
                <div className="text-xs opacity-80">Begin studying this subject</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setTaskDialogOpen(true)}
              disabled={subject.isArchived}
              className="h-12 justify-start"
            >
              <PlusIcon className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Add Task</div>
                <div className="text-xs opacity-80">Create a new study task</div>
              </div>
            </Button>
          </div>

          <Separator />

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {showAnalytics && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewAnalytics}
                    className="h-16 flex-col gap-1"
                  >
                    <BarChart3Icon className="h-4 w-4" />
                    <span className="text-xs">Analytics</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View performance analytics</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewResources}
                  className="h-16 flex-col gap-1"
                >
                  <BookOpenIcon className="h-4 w-4" />
                  <span className="text-xs">Resources</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View study resources</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="h-16 flex-col gap-1"
                >
                  <EditIcon className="h-4 w-4" />
                  <span className="text-xs">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit subject details</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleArchiveToggle}
                  disabled={isLoading}
                  className="h-16 flex-col gap-1"
                >
                  {isLoading ? (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  ) : subject.isArchived ? (
                    <AlertCircleIcon className="h-4 w-4" />
                  ) : (
                    <ArchiveIcon className="h-4 w-4" />
                  )}
                  <span className="text-xs">
                    {subject.isArchived ? 'Restore' : 'Archive'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {subject.isArchived ? 'Restore subject' : 'Archive subject'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Quick Stats (if analytics available) */}
          {showAnalytics && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Study Time:</span>
                  <span className="font-medium">
                    {Math.floor((subject.totalStudyMinutes || 0) / 60)}h{' '}
                    {(subject.totalStudyMinutes || 0) % 60}m
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Study:</span>
                  <span className="font-medium">
                    {subject.lastStudiedAt
                      ? new Date(subject.lastStudiedAt).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Resource Links Preview */}
          {subject.resources?.links && subject.resources.links.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ExternalLinkIcon className="h-4 w-4" />
                  Quick Links
                </div>
                <div className="flex flex-wrap gap-1">
                  {subject.resources.links.slice(0, 3).map((link, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(link.url, '_blank')}
                      className="h-7 text-xs"
                    >
                      {link.title}
                    </Button>
                  ))}
                  {subject.resources.links.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewResources}
                      className="h-7 text-xs text-muted-foreground"
                    >
                      +{subject.resources.links.length - 3} more
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Study Session for {subject.name}</DialogTitle>
          </DialogHeader>
          <StartSessionForm
            subjectId={subject.id}
            onClose={() => setSessionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task for {subject.name}</DialogTitle>
          </DialogHeader>
          <QuickTaskForm
            subjectId={subject.id}
            onClose={() => setTaskDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <SubjectForm
            subject={subject}
            onSubmit={() => setEditDialogOpen(false)}
            onCancel={() => setEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubjectQuickActions;