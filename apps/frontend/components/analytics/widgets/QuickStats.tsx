import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, Target, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAnalyticsTiles } from '@/hooks/useAnalytics';

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

export function QuickStatsWidget() {
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const tiles = await fetchAnalyticsTiles('last_7_days');

        const quickStats: QuickStat[] = [
          {
            label: 'Study Time',
            value: tiles.find(t => t.id === 'focused-minutes')?.value || '0',
            change: tiles.find(t => t.id === 'focused-minutes')?.trend,
            icon: <Clock className="h-4 w-4" />,
            color: 'text-blue-600',
          },
          {
            label: 'Tasks Done',
            value: tiles.find(t => t.id === 'tasks-completed')?.value || '0',
            change: tiles.find(t => t.id === 'tasks-completed')?.trend,
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'text-green-600',
          },
          {
            label: 'On-time Rate',
            value: tiles.find(t => t.id === 'on-time-rate')?.value || '0%',
            change: tiles.find(t => t.id === 'on-time-rate')?.trend,
            icon: <Target className="h-4 w-4" />,
            color: 'text-yellow-600',
          },
        ];

        setStats(quickStats);
      } catch (error) {
        console.error('Failed to load quick stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Stats (This Week)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={stat.color}>{stat.icon}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stat.value}</span>
                {stat.change !== undefined && (
                  <span className={`text-xs flex items-center ${
                    stat.change > 0 ? 'text-green-600' : stat.change < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {stat.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(stat.change).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}