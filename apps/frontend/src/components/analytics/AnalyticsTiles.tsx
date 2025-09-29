import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Target,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DashboardTile {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  sparklineData?: { date: string; value: number }[];
  icon?: string;
  color?: string;
}

interface AnalyticsTilesProps {
  tiles: DashboardTile[];
  loading?: boolean;
}

const iconMap = {
  clock: Clock,
  'check-circle': CheckCircle2,
  target: Target,
  book: BookOpen,
};

const getTrendIcon = (direction: 'up' | 'down' | 'neutral' | undefined) => {
  switch (direction) {
    case 'up':
      return TrendingUp;
    case 'down':
      return TrendingDown;
    default:
      return Minus;
  }
};

const getTrendColor = (direction: 'up' | 'down' | 'neutral' | undefined) => {
  switch (direction) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-gray-500';
  }
};

export function AnalyticsTiles({ tiles, loading }: AnalyticsTilesProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon ? iconMap[tile.icon as keyof typeof iconMap] : Clock;
        const TrendIcon = getTrendIcon(tile.trendDirection);

        return (
          <Card key={tile.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tile.title}
                </CardTitle>
                <div
                  className="p-2 rounded-full"
                  style={{
                    backgroundColor: tile.color ? `${tile.color}20` : '#3B82F620',
                  }}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{ color: tile.color || '#3B82F6' }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{tile.value}</span>
                {tile.unit && (
                  <span className="text-sm text-muted-foreground">{tile.unit}</span>
                )}
              </div>
              {tile.trend !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendIcon
                    className={cn('h-4 w-4', getTrendColor(tile.trendDirection))}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      getTrendColor(tile.trendDirection)
                    )}
                  >
                    {tile.trend > 0 ? '+' : ''}
                    {tile.trend.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    vs last period
                  </span>
                </div>
              )}
              {tile.sparklineData && tile.sparklineData.length > 0 && (
                <div className="mt-3 h-12">
                  <MiniSparkline data={tile.sparklineData} color={tile.color} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Mini sparkline component
function MiniSparkline({
  data,
  color = '#3B82F6',
}: {
  data: { date: string; value: number }[];
  color?: string;
}) {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.value - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        fill={`url(#gradient-${color.replace('#', '')})`}
        stroke="none"
        points={`0,100 ${points} 100,100`}
      />
      <defs>
        <linearGradient
          id={`gradient-${color.replace('#', '')}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}