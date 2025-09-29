'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SubjectData {
  subject: string;
  hours: number;
  tasks: number;
}

interface SubjectDistributionProps {
  data: SubjectData[];
}

export function SubjectDistribution({ data }: SubjectDistributionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subject" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#82ca9d" name="Hours" />
            <Bar dataKey="tasks" fill="#ffc658" name="Tasks" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default SubjectDistribution;