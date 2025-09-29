'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { api } from '@/lib/api/client';
import { tasksApi } from '@/lib/api/tasks';

interface DashboardStats {
  tasks: { total: number; completed: number; overdue: number; completionRate: number };
  studyTime: { thisWeek: number; daily: number };
  aiChats: number;
  streak: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<Array<{ date: string; minutes: number; tasksCompleted: number }>>([]);
  const [today, setToday] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const statsRes = await api.get('/dashboard/stats');
      const weeklyRes = await api.get('/dashboard/weekly');
      const todayRes = await tasksApi.getTodayTasks();
      setStats(statsRes.data);
      setWeekly(weeklyRes.data || []);
      if (todayRes.data) setToday((todayRes.data as any[]).map(t => ({ id: t.id, title: t.title, completed: t.completed })));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally { setLoading(false); }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {stats && <StatsCards stats={stats} />}
      {weekly.length > 0 && <DashboardCharts weekly={weekly} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Today's Tasks</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {today.length === 0 && (<li className="text-sm text-muted-foreground">No tasks due today</li>)}
              {today.map(t => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className={`inline-block h-2 w-2 rounded-full ${t.completed ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className={t.completed ? 'line-through text-muted-foreground' : ''}>{t.title}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
          <Card>
          <CardHeader><CardTitle>Study Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Weekly Study Time</p>
                <p className="text-2xl font-bold">{stats ? `${Math.floor((stats.studyTime.thisWeek || 0)/60)}h ${(stats.studyTime.thisWeek || 0)%60}m` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Streak</p>
                <p className="text-2xl font-bold">{stats?.streak || 0} days 🔥</p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}