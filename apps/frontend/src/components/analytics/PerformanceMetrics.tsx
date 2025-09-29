import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle2,
  Target,
  Zap,
} from 'lucide-react';

interface PerformanceData {
  totalStudySessions: number;
  totalStudyMinutes: number;
  averageFocusScore: number;
  averageSessionDuration: number;
  longestSession: number;
  shortestSession: number;
  taskCompletionRate: number;
  averageTaskCompletionTime: number;
}

interface PerformanceMetricsProps {
  data?: PerformanceData;
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  if (!data) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading performance metrics...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const focusScoreData = [
    {
      name: 'Focus Score',
      value: data.averageFocusScore,
      fill: data.averageFocusScore > 70 ? '#10B981' : data.averageFocusScore > 50 ? '#F59E0B' : '#EF4444',
    },
  ];

  const completionRateData = [
    {
      name: 'Completion Rate',
      value: data.taskCompletionRate,
      fill: data.taskCompletionRate > 80 ? '#10B981' : data.taskCompletionRate > 60 ? '#F59E0B' : '#EF4444',
    },
  ];

  const sessionData = [
    { name: 'Average', value: data.averageSessionDuration },
    { name: 'Longest', value: data.longestSession },
    { name: 'Shortest', value: data.shortestSession },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Sessions"
          value={data.totalStudySessions}
          icon={<CheckCircle2 className="h-4 w-4" />}
          description="Study sessions completed"
        />
        <MetricCard
          title="Total Study Time"
          value={`${Math.round(data.totalStudyMinutes / 60)}h ${data.totalStudyMinutes % 60}m`}
          icon={<Clock className="h-4 w-4" />}
          description="Time invested in studying"
        />
        <MetricCard
          title="Avg Session Duration"
          value={`${Math.round(data.averageSessionDuration)}m`}
          icon={<Zap className="h-4 w-4" />}
          description="Minutes per session"
        />
        <MetricCard
          title="Task Completion Time"
          value={`${data.averageTaskCompletionTime.toFixed(1)}h`}
          icon={<Target className="h-4 w-4" />}
          description="Average time to complete"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Focus Score Radial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Average Focus Score
            </CardTitle>
            <CardDescription>
              Your concentration level during study sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  data={focusScoreData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill={focusScoreData[0].fill}
                    background={{ fill: '#f0f0f0' }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-3xl font-bold fill-current"
                  >
                    {Math.round(data.averageFocusScore)}%
                  </text>
                  <text
                    x="50%"
                    y="50%"
                    dy={25}
                    textAnchor="middle"
                    className="text-sm fill-muted-foreground"
                  >
                    Focus Score
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <PerformanceIndicator
                label="Excellent"
                range="80-100"
                active={data.averageFocusScore >= 80}
              />
              <PerformanceIndicator
                label="Good"
                range="60-79"
                active={data.averageFocusScore >= 60 && data.averageFocusScore < 80}
              />
              <PerformanceIndicator
                label="Needs Improvement"
                range="0-59"
                active={data.averageFocusScore < 60}
              />
            </div>
          </CardContent>
        </Card>

        {/* Task Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Task Completion Rate
            </CardTitle>
            <CardDescription>
              Percentage of tasks completed on time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  data={completionRateData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill={completionRateData[0].fill}
                    background={{ fill: '#f0f0f0' }}
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-3xl font-bold fill-current"
                  >
                    {Math.round(data.taskCompletionRate)}%
                  </text>
                  <text
                    x="50%"
                    y="50%"
                    dy={25}
                    textAnchor="middle"
                    className="text-sm fill-muted-foreground"
                  >
                    Completed
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <PerformanceIndicator
                label="Excellent"
                range="90-100"
                active={data.taskCompletionRate >= 90}
              />
              <PerformanceIndicator
                label="Good"
                range="70-89"
                active={data.taskCompletionRate >= 70 && data.taskCompletionRate < 90}
              />
              <PerformanceIndicator
                label="Needs Improvement"
                range="0-69"
                active={data.taskCompletionRate < 70}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Duration Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Session Duration Analysis</CardTitle>
          <CardDescription>
            Comparison of your study session durations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.5}
                />
                <YAxis
                  className="text-xs"
                  stroke="currentColor"
                  strokeOpacity={0.5}
                  label={{
                    value: 'Minutes',
                    angle: -90,
                    position: 'insideLeft',
                    className: 'text-xs',
                  }}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function PerformanceIndicator({
  label,
  range,
  active,
}: {
  label: string;
  range: string;
  active: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${active ? 'bg-primary/10' : 'bg-muted/50'}`}>
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            active
              ? label === 'Excellent'
                ? 'bg-green-500'
                : label === 'Good'
                ? 'bg-yellow-500'
                : 'bg-red-500'
              : 'bg-gray-300'
          }`}
        />
        <span className={`text-sm ${active ? 'font-medium' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{range}%</span>
    </div>
  );
}