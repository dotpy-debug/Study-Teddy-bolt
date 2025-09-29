import { Card, CardContent } from '@/components/ui/card';

interface DashboardStats {
  tasks: { total: number; completed: number; overdue: number; completionRate: number };
  studyTime: { thisWeek: number; daily: number };
  aiChats: number;
  streak: number;
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: 'Tasks', value: stats.tasks.total },
    { label: 'Completed', value: stats.tasks.completed },
    { label: 'Overdue', value: stats.tasks.overdue },
    { label: 'Completion', value: `${stats.tasks.completionRate}%` },
    { label: 'AI Chats', value: stats.aiChats },
    { label: 'Streak', value: `${stats.streak} days` },
    { label: 'Study This Week', value: `${Math.floor((stats.studyTime.thisWeek || 0)/60)}h ${(stats.studyTime.thisWeek||0)%60}m` },
    { label: 'Daily Avg', value: `${stats.studyTime.daily} min` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{it.label}</div>
            <div className="text-2xl font-bold">{it.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


