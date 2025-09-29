'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendChartProps {
  data: { date: string; value: number }[];
  metric: string;
  color?: string;
  type?: 'line' | 'area';
}

const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (active && payload && payload[0]) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">
          {format(parseISO(label), 'MMM dd, yyyy')}
        </p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value} {metric}
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({
  data,
  metric,
  color = '#3B82F6',
  type = 'area',
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  const formatXAxis = (tickItem: string) => {
    try {
      return format(parseISO(tickItem), 'MMM dd');
    } catch {
      return tickItem;
    }
  };

  const chartData = data.map(item => ({
    ...item,
    date: item.date.split('T')[0], // Ensure date is in correct format
  }));

  if (type === 'line') {
    return (
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              className="text-xs"
              stroke="currentColor"
              strokeOpacity={0.5}
            />
            <YAxis
              className="text-xs"
              stroke="currentColor"
              strokeOpacity={0.5}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip content={<CustomTooltip metric={metric} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            className="text-xs"
            stroke="currentColor"
            strokeOpacity={0.5}
          />
          <YAxis
            className="text-xs"
            stroke="currentColor"
            strokeOpacity={0.5}
            domain={['dataMin - 10', 'dataMax + 10']}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${color.replace('#', '')})`}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}