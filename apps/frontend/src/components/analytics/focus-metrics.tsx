'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FocusMetricsData {
  date: string;
  focusScore: number;
  distractions: number;
}

interface FocusMetricsProps {
  data: FocusMetricsData[];
}

export function FocusMetrics({ data }: FocusMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Focus Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="focusScore" stroke="#8884d8" name="Focus Score" />
            <Line type="monotone" dataKey="distractions" stroke="#82ca9d" name="Distractions" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default FocusMetrics;