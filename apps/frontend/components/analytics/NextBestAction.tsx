import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  ArrowRight,
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  Coffee,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NextBestActionData {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: 'focus' | 'task' | 'goal' | 'study' | 'review' | 'break';
  context?: {
    relatedTaskId?: string;
    relatedSubjectId?: string;
    relatedGoalId?: string;
    timeEstimate?: number;
    deadline?: Date;
  };
  reasoning: string;
  impact: string;
  createdAt: Date;
}

interface NextBestActionProps {
  action?: NextBestActionData;
  onActionClick?: () => void;
  loading?: boolean;
}

const categoryIcons = {
  focus: Target,
  task: CheckCircle2,
  goal: Target,
  study: BookOpen,
  review: RefreshCw,
  break: Coffee,
};

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const categoryColors = {
  focus: 'bg-purple-500',
  task: 'bg-green-500',
  goal: 'bg-blue-500',
  study: 'bg-indigo-500',
  review: 'bg-orange-500',
  break: 'bg-pink-500',
};

export function NextBestAction({ action, onActionClick, loading }: NextBestActionProps) {
  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 animate-pulse" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted animate-pulse">
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded mt-1 animate-pulse" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!action) {
    return (
      <Card className="relative overflow-hidden border-dashed">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">No recommendations available</CardTitle>
              <CardDescription>Keep studying to get personalized suggestions</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const Icon = categoryIcons[action.category] || BookOpen;

  return (
    <Card className="relative overflow-hidden border-primary/20 shadow-sm hover:shadow-md transition-shadow">
      <div
        className={cn(
          'absolute top-0 left-0 w-1 h-full',
          categoryColors[action.category],
        )}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                categoryColors[action.category],
                'bg-opacity-10',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  categoryColors[action.category].replace('bg-', 'text-'),
                )}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{action.title}</CardTitle>
                <Badge
                  variant="outline"
                  className={cn('text-xs', priorityColors[action.priority])}
                >
                  {action.priority}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {action.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Lightbulb className="h-3 w-3" />
              Why this matters
            </div>
            <p className="text-sm text-muted-foreground">{action.reasoning}</p>
          </div>

          <div className="p-3 rounded-lg bg-primary/5">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Target className="h-3 w-3" />
              Expected impact
            </div>
            <p className="text-sm text-muted-foreground">{action.impact}</p>
          </div>

          {action.context?.timeEstimate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Estimated time: {action.context.timeEstimate} minutes</span>
            </div>
          )}

          <Button
            onClick={onActionClick}
            className="w-full"
            size="sm"
          >
            {action.action}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}