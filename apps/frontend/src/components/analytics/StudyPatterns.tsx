import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Heatmap,
} from 'recharts';
import { Calendar, Clock, TrendingUp, Activity } from 'lucide-react';

interface StudyPatternsData {
  bestStudyHour: number | null;
  bestStudyDay: string | null;
  hourlyDistribution: {
    hour: number;
    avgFocusScore: number;
    avgDuration: number;
    sessionCount: number;
  }[];
  weeklyDistribution: {
    day: string;
    avgFocusScore: number;
    totalMinutes: number;
    sessionCount: number;
  }[];
}

interface StudyPatternsProps {
  data?: StudyPatternsData;
}

// Generate heatmap data for study hours
function generateHeatmapData(hourlyData: any[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const heatmapData: any[] = [];
  days.forEach((day, dayIndex) => {
    hours.forEach(hour => {
      const dataPoint = hourlyData.find(d => d.hour === hour) || { sessionCount: 0 };
      heatmapData.push({
        day,
        hour: hour.toString().padStart(2, '0'),
        value: dataPoint.sessionCount,
        dayIndex,
        hourIndex: hour,
      });
    });
  });

  return heatmapData;
}

export function StudyPatterns({ data }: StudyPatternsProps) {
  if (!data) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading study patterns...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hourlyChartData = data.hourlyDistribution.map(h => ({
    hour: `${h.hour}:00`,
    sessions: h.sessionCount,
    focusScore: h.avgFocusScore,
    duration: h.avgDuration,
  }));

  const weeklyRadarData = data.weeklyDistribution.map(d => ({
    day: d.day.slice(0, 3),
    minutes: d.totalMinutes,
    focus: d.avgFocusScore,
    sessions: d.sessionCount * 10, // Scale for visibility
  }));

  return (
    <div className="space-y-6">
      {/* Best Times Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Peak Productivity Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.bestStudyHour !== null ? `${data.bestStudyHour}:00` : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              You're most focused at this time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Most Productive Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.bestStudyDay || 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your peak study day of the week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Study Time by Hour</CardTitle>
          <CardDescription>
            When you typically study throughout the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="hour"
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.5}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.5}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{payload[0].payload.hour}</p>
                          <p className="text-sm">Sessions: {payload[0].payload.sessions}</p>
                          <p className="text-sm">
                            Focus: {Math.round(payload[0].payload.focusScore)}%
                          </p>
                          <p className="text-sm">
                            Avg Duration: {Math.round(payload[0].payload.duration)}m
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="sessions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Pattern Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Study Pattern</CardTitle>
          <CardDescription>
            Your study distribution across the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={weeklyRadarData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis
                  dataKey="day"
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.5}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 'dataMax']}
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.5}
                />
                <Radar
                  name="Study Minutes"
                  dataKey="minutes"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Focus Score"
                  dataKey="focus"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Sessions (x10)"
                  dataKey="sessions"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Study Intensity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Study Intensity Heatmap</CardTitle>
          <CardDescription>
            Visual representation of your study patterns across the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudyHeatmap data={data.hourlyDistribution} />
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pattern-Based Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.bestStudyHour !== null && (
              <RecommendationItem
                title="Schedule Important Tasks"
                description={`Plan your most challenging tasks around ${data.bestStudyHour}:00 when you're most focused.`}
              />
            )}
            {data.bestStudyDay && (
              <RecommendationItem
                title="Maximize Your Peak Day"
                description={`${data.bestStudyDay} is your most productive day. Schedule difficult subjects on this day.`}
              />
            )}
            <RecommendationItem
              title="Maintain Consistency"
              description="Try to study at the same times each day to build a strong habit."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StudyHeatmap({ data }: { data: any[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Create a matrix for the heatmap
  const matrix = days.map(day => {
    return hours.map(hour => {
      const found = data.find(d => d.hour === hour);
      return found ? found.sessionCount : 0;
    });
  });

  const maxValue = Math.max(...data.map(d => d.sessionCount), 1);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="w-12" /> {/* Spacer for day labels */}
        <div className="flex flex-1 justify-between text-xs text-muted-foreground">
          <span>12AM</span>
          <span>6AM</span>
          <span>12PM</span>
          <span>6PM</span>
          <span>11PM</span>
        </div>
      </div>
      {days.map((day, dayIndex) => (
        <div key={day} className="flex gap-2 items-center">
          <div className="w-12 text-xs text-muted-foreground text-right">{day}</div>
          <div className="flex flex-1 gap-1">
            {hours.map((hour) => {
              const value = matrix[dayIndex][hour];
              const intensity = value / maxValue;
              return (
                <div
                  key={hour}
                  className="flex-1 h-5 rounded-sm transition-colors"
                  style={{
                    backgroundColor:
                      intensity > 0
                        ? `rgba(59, 130, 246, ${0.1 + intensity * 0.9})`
                        : 'rgb(243, 244, 246)',
                  }}
                  title={`${day} ${hour}:00 - ${value} sessions`}
                />
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-4 justify-center">
        <span className="text-xs text-muted-foreground">Less</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(intensity => (
            <div
              key={intensity}
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${intensity})`,
              }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">More</span>
      </div>
    </div>
  );
}

function RecommendationItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="p-1.5 rounded-full bg-primary/10">
        <Activity className="h-3 w-3 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}