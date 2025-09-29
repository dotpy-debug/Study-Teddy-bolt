import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardCharts({ weekly }: { weekly: Array<{ date: string; minutes: number; tasksCompleted: number }> }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Study Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 items-end h-40">
            {weekly.map((d) => (
              <div key={d.date} className="text-center">
                <div className="bg-primary/70 w-full" style={{ height: `${Math.min(100, (d.minutes || 0) / 5)}%` }} />
                <div className="text-xs mt-1 text-muted-foreground">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tasks Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 items-end h-40">
            {weekly.map((d) => (
              <div key={d.date} className="text-center">
                <div className="bg-green-600/70 w-full" style={{ height: `${Math.min(100, (d.tasksCompleted || 0) * 20)}%` }} />
                <div className="text-xs mt-1 text-muted-foreground">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


