import { Suspense } from 'react';
import { TaskCard } from '@/components/tasks/task-card';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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

interface TasksListServerProps {
  filter?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
  searchQuery?: string;
  sortBy?: 'dueDate' | 'priority' | 'created' | 'title';
  limit?: number;
}

// Server component for fetching tasks
async function fetchTasks({ filter, searchQuery, sortBy, limit = 50 }: TasksListServerProps): Promise<Task[]> {
  try {
    // In production, this would be a direct database call or internal API call
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/tasks`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data for real-time updates
      // Alternative: cache: 'force-cache' with revalidate for better performance
    });

    if (!response.ok) {
      console.error('Failed to fetch tasks:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

function filterTasks(tasks: Task[], filter: string, searchQuery?: string): Task[] {
  let filtered = [...tasks];

  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply status filter
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  switch (filter) {
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
    default:
      // 'all' - no additional filtering
      break;
  }

  return filtered;
}

function sortTasks(tasks: Task[], sortBy: string): Task[] {
  switch (sortBy) {
    case 'priority':
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return tasks.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    case 'title':
      return tasks.sort((a, b) => a.title.localeCompare(b.title));
    case 'created':
      return tasks.sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());
    case 'dueDate':
    default:
      return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }
}

export async function TasksListServer(props: TasksListServerProps) {
  const { filter = 'all', searchQuery, sortBy = 'dueDate', limit } = props;

  const tasks = await fetchTasks({ filter, searchQuery, sortBy, limit });
  const filteredTasks = filterTasks(tasks, filter, searchQuery);
  const sortedTasks = sortTasks(filteredTasks, sortBy);

  if (sortedTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No tasks match your search.' : 'No tasks found.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedTasks.map((task) => {
        const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
        return (
          <TaskCard
            key={task.id}
            task={task}
            variant={isOverdue ? 'urgent' : 'default'}
            // These props will need to be handled by client components
            onToggleComplete={() => {}}
            onDelete={() => {}}
            onEdit={() => {}}
          />
        );
      })}
    </div>
  );
}

// Suspense wrapper component
export function TasksListServerWithSuspense(props: TasksListServerProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="md" />
        </div>
      }
    >
      <TasksListServer {...props} />
    </Suspense>
  );
}

// Cache configuration for better performance
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic'; // Force dynamic rendering for real-time updates