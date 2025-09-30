import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchNextBestAction } from '../hooks/use-analytics';
import { cn } from '@/lib/utils';

interface NextBestAction {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export function MiniNextBestActionWidget() {
  const [action, setAction] = useState<NextBestAction | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAction = async () => {
    setLoading(true);
    try {
      const data = await fetchNextBestAction();
      setAction(data);
    } catch (error) {
      console.error('Failed to load next best action:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAction();
  }, []);

  const priorityColors = {
    high: 'bg-red-100 border-red-300',
    medium: 'bg-yellow-100 border-yellow-300',
    low: 'bg-blue-100 border-blue-300',
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggested Action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 w-full bg-muted rounded mb-2" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!action) {
    return null;
  }

  return (
    <Card className={cn('border-2', priorityColors[action.priority])}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggested Action
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={loadAction}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-sm">{action.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {action.description}
            </p>
          </div>
          <Button size="sm" className="w-full">
            {action.action}
            <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}