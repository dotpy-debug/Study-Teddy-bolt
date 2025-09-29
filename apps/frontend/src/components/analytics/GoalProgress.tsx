import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalData {
  goalId: string;
  title: string;
  type: string;
  progress: number;
  daysRemaining: number | null;
  onTrack: boolean;
  recommendation: string;
}

interface GoalProgressProps {
  data?: GoalData[];
}

const getStatusColor = (progress: number, onTrack: boolean) => {
  if (!onTrack) return 'text-red-600 bg-red-100';
  if (progress >= 80) return 'text-green-600 bg-green-100';
  if (progress >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-blue-600 bg-blue-100';
};

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-yellow-500';
  return 'bg-blue-500';
};

export function GoalProgress({ data }: GoalProgressProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Progress</CardTitle>
          <CardDescription>Track your study goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active goals</p>
            <p className="text-sm text-muted-foreground mt-2">
              Set goals to track your progress
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onTrackGoals = data.filter(g => g.onTrack).length;
  const completionRate = data.reduce((acc, g) => acc + g.progress, 0) / data.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.length}</div>
            <p className="text-sm text-muted-foreground">Currently tracking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">On Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {onTrackGoals}/{data.length}
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.round((onTrackGoals / data.length) * 100)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Avg Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Math.round(completionRate)}%</div>
            <p className="text-sm text-muted-foreground">Overall completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Goals */}
      <div className="space-y-4">
        {data.map(goal => (
          <Card key={goal.goalId} className="overflow-hidden">
            <div className={cn(
              'h-1',
              goal.onTrack ? 'bg-green-500' : 'bg-red-500'
            )} />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {goal.title}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        getStatusColor(goal.progress, goal.onTrack)
                      )}
                    >
                      {goal.onTrack ? 'On Track' : 'Behind Schedule'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {goal.type}
                  </CardDescription>
                </div>
                {goal.daysRemaining !== null && (
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {goal.daysRemaining > 0
                          ? `${goal.daysRemaining} days left`
                          : goal.daysRemaining === 0
                          ? 'Due today'
                          : `${Math.abs(goal.daysRemaining)} days overdue`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm font-bold">{goal.progress}%</span>
                  </div>
                  <Progress
                    value={goal.progress}
                    className="h-2"
                    indicatorClassName={getProgressColor(goal.progress)}
                  />
                </div>

                {/* Recommendation */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-2">
                    {goal.onTrack ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    )}
                    <p className="text-sm">{goal.recommendation}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                    View Details
                  </button>
                  <button className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                    Update Progress
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Goal Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Goal Achievement Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {onTrackGoals === data.length && (
              <InsightItem
                type="success"
                title="Excellent Progress!"
                description="All your goals are on track. Keep up the great work!"
              />
            )}
            {onTrackGoals < data.length / 2 && (
              <InsightItem
                type="warning"
                title="Attention Needed"
                description="More than half of your goals are behind schedule. Consider adjusting your daily targets."
              />
            )}
            {completionRate > 75 && (
              <InsightItem
                type="success"
                title="High Achievement"
                description="Your average progress is above 75%. You're doing exceptionally well!"
              />
            )}
            <InsightItem
              type="info"
              title="Tip"
              description="Break down large goals into smaller, daily tasks for better tracking and motivation."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightItem({
  type,
  title,
  description,
}: {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
}) {
  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    warning: <AlertCircle className="h-4 w-4 text-yellow-600" />,
    info: <TrendingUp className="h-4 w-4 text-blue-600" />,
  };

  const colors = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={cn('p-3 rounded-lg border', colors[type])}>
      <div className="flex items-start gap-2">
        {icons[type]}
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}