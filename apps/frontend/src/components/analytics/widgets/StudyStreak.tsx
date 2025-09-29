import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, TrendingUp, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  lastStudyDate: string | null;
}

export function StudyStreakWidget() {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStreakData() {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/analytics/streaks`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        setStreakData(response.data);
      } catch (error) {
        console.error('Failed to load streak data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStreakData();
  }, []);

  if (loading || !streakData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak === 0) return 'text-gray-400';
    if (streak < 7) return 'text-orange-500';
    if (streak < 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return 'Start your streak today!';
    if (streak === 1) return 'Great start! Keep it going!';
    if (streak < 7) return `${streak} days strong!`;
    if (streak < 30) return `Amazing ${streak}-day streak!`;
    return `Incredible ${streak}-day streak! 🔥`;
  };

  return (
    <Card className="overflow-hidden">
      <div className={cn(
        'h-1',
        streakData.currentStreak > 0 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gray-200'
      )} />
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-base">Study Streak</span>
          <Flame className={cn('h-5 w-5', getStreakColor(streakData.currentStreak))} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{streakData.currentStreak}</span>
              <span className="text-sm text-muted-foreground">
                {streakData.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getStreakMessage(streakData.currentStreak)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Longest Streak
              </div>
              <p className="text-lg font-semibold">{streakData.longestStreak} days</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Total Days
              </div>
              <p className="text-lg font-semibold">{streakData.totalStudyDays}</p>
            </div>
          </div>

          {/* Visual streak indicator */}
          <div className="flex gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-2 rounded-full',
                  i < Math.min(streakData.currentStreak, 7)
                    ? 'bg-gradient-to-r from-orange-400 to-red-500'
                    : 'bg-gray-200'
                )}
              />
            ))}
          </div>

          {streakData.lastStudyDate && (
            <p className="text-xs text-muted-foreground text-center">
              Last studied: {new Date(streakData.lastStudyDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}