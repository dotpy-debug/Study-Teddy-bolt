'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Filter, Calendar as CalendarIcon, Grid, List, Search } from 'lucide-react';
import { TaskCard } from '@/components/tasks/task-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { tasksApi } from '@/lib/api/tasks';
import { useNotifications } from '@/contexts/notification-context';
import { TaskCalendar } from '@/components/tasks/task-calendar';
import { TaskForm } from '@/components/tasks/task-form';

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

type TaskFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';

type TaskSort = 'dueDate' | 'priority' | 'created' | 'title';

type ViewMode = 'list' | 'calendar';

interface CreateTaskData {
  title: string;
  description: string;
  subject: 'math' | 'science' | 'language' | 'history' | 'art';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  estimatedTime: number;
}

function TasksContent() {
  const searchParams = useSearchParams();
  const { showSuccess, showError, showWarning, addNotification } = useNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [sortBy, setSortBy] = useState<TaskSort>('dueDate');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  const [newTask, setNewTask] = useState<CreateTaskData>({
    title: '',
    description: '',
    subject: 'math',
    dueDate: '',
    priority: 'medium',
    estimatedTime: 30
  });

  useEffect(() => { fetchTasks(); }, []);

  // Initialize view from query param
  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'calendar') setViewMode('calendar');
  }, [searchParams]);

  useEffect(() => { filterAndSortTasks(); }, [tasks, searchQuery, activeFilter, sortBy]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await tasksApi.getTasks({ limit: 200, sortBy: 'dueDate', sortOrder: 'asc' });
      if (result.data) setTasks(result.data as any);
    } catch (error) {
      showError('Failed to load tasks. Using demo data for now.', 'Loading Error');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTasks = () => {
    let filtered = Array.isArray(tasks) ? [...tasks] : [];
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    switch (activeFilter) {
      case 'today':
        filtered = filtered.filter(task => {
          const dueDate = new Date(task.dueDate);
          return dueDate >= todayStart && dueDate <= today && !task.completed;
        });
        break;
      case 'upcoming':
        filtered = filtered.filter(task => new Date(task.dueDate) > today && !task.completed);
        break;
      case 'overdue':
        filtered = filtered.filter(task => new Date(task.dueDate) < todayStart && !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
    }
    filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    setFilteredTasks(filtered);
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      await tasksApi.updateTask(taskId, { completed: !task.completed });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    } catch { showError('Failed to update task.', 'Update Failed'); }
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.title || !newTask.dueDate) { showError('Title and due date are required', 'Validation Error'); return; }
      const result = await tasksApi.createTask(newTask as any);
      if (result.data) setTasks(prev => [...prev, result.data as any]);
      setShowCreateDialog(false);
      setNewTask({ title: '', description: '', subject: 'math', dueDate: '', priority: 'medium', estimatedTime: 30 });
    } catch { showError('Failed to create task.', 'API Error'); }
  };

  const handleDeleteTask = async (taskId: string) => {
    try { await tasksApi.deleteTask(taskId); setTasks(prev => prev.filter(t => t.id !== taskId)); }
    catch { showError('Failed to delete task.', 'Delete Failed'); }
  };

  const handleEditTask = (taskId: string, data: Partial<Task>) => {
    const base = tasks.find(t => t.id === taskId) || null;
    setEditingTask((data as Task) || base);
    setShowEditDialog(true);
  };

  const submitEditTask = async (formData: any) => {
    if (!editingTask) return;
    setSaving(true);
    try {
      const res = await tasksApi.updateTask(editingTask.id, formData);
      if (res.data) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...(res.data as any) } : t));
      } else {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...formData } : t));
      }
      showSuccess(`Task "${editingTask.title}" updated successfully`, 'Task Updated');
      setShowEditDialog(false);
      setEditingTask(null);
    } catch {
      showError('Failed to update task. Please try again.', 'Update Failed');
    } finally {
      setSaving(false);
    }
  };

  const filterCounts = (() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const arr = tasks;
    return {
      all: arr.length,
      today: arr.filter(t => { const d=new Date(t.dueDate); return d>=todayStart && d<=today && !t.completed }).length,
      upcoming: arr.filter(t => new Date(t.dueDate)>today && !t.completed).length,
      overdue: arr.filter(t => new Date(t.dueDate)<todayStart && !t.completed).length,
      completed: arr.filter(t => t.completed).length,
    };
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-muted-foreground">Manage your study tasks and deadlines</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="px-3">
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')} className="px-3">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Add a new study task to your schedule.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input placeholder="Enter task title" value={newTask.title} onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Task description (optional)" value={newTask.description} onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select value={newTask.subject} onValueChange={(value) => setNewTask(prev => ({ ...prev, subject: value as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="math">Mathematics</SelectItem>
                        <SelectItem value="science">Science</SelectItem>
                        <SelectItem value="language">Language</SelectItem>
                        <SelectItem value="history">History</SelectItem>
                        <SelectItem value="art">Art</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={newTask.priority} onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <Input type="datetime-local" value={newTask.dueDate} onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Est. Time (min)</label>
                    <Input type="number" placeholder="30" value={newTask.estimatedTime} onChange={(e) => setNewTask(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 30 }))} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateTask} disabled={!newTask.title || !newTask.dueDate}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Sort by {sortBy}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy('dueDate')}>Due Date</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('priority')}>Priority</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('title')}>Title</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('created')}>Created</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as TaskFilter)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">All<Badge variant="secondary" className="text-xs">{filterCounts.all}</Badge></TabsTrigger>
          <TabsTrigger value="today" className="flex items-center gap-2">Today<Badge variant="secondary" className="text-xs">{filterCounts.today}</Badge></TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">Upcoming<Badge variant="secondary" className="text-xs">{filterCounts.upcoming}</Badge></TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">Overdue<Badge variant="destructive" className="text-xs">{filterCounts.overdue}</Badge></TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">Completed<Badge variant="secondary" className="text-xs">{filterCounts.completed}</Badge></TabsTrigger>
        </TabsList>
        <TabsContent value={activeFilter} className="mt-6">
          {viewMode === 'list' ? (
            <div className="space-y-4">
              {Array.isArray(filteredTasks) && filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task as any} onToggleComplete={handleToggleTask} onDelete={handleDeleteTask} onEdit={handleEditTask} variant={new Date(task.dueDate) < new Date() && !task.completed ? 'urgent' : 'default'} />
                ))
              ) : (
                <Card><CardContent className="py-12 text-center">No tasks found</CardContent></Card>
              )}
            </div>
          ) : (
            <TaskCalendar tasks={tasks as any} />
          )}
        </TabsContent>
      </Tabs>

      <TaskForm
        isOpen={showEditDialog}
        onClose={() => { if (!saving) { setShowEditDialog(false); setEditingTask(null); } }}
        onSubmit={submitEditTask}
        task={editingTask as any}
        loading={saving}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading tasks...</div>}>
      <TasksContent />
    </Suspense>
  );
}