'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';

type Task = {
  id: string;
  title: string;
  subject?: string;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
};

interface TaskCalendarProps {
  tasks: Task[];
  onSelectDate?: (date: Date) => void;
}

export function TaskCalendar({ tasks, onSelectDate }: TaskCalendarProps) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks || []) {
      const d = new Date(t.dueDate);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const selectedKey = selected
    ? new Date(selected.getFullYear(), selected.getMonth(), selected.getDate()).toISOString()
    : '';
  const dayTasks = tasksByDate.get(selectedKey) || [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Select a Date</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            captionLayout="dropdown-buttons"
            onDayClick={(date) => {
              setSelected(date);
              onSelectDate?.(date);
            }}
            modifiers={{
              hasTasks: (day) => {
                const key = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
                return (tasksByDate.get(key)?.length || 0) > 0;
              },
            }}
            modifiersClassNames={{
              hasTasks: 'after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary',
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selected ? selected.toLocaleDateString() : 'Tasks on selected date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dayTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">No tasks for this day.</div>
          ) : (
            <ul className="space-y-3">
              {dayTasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    {t.subject && (
                      <div className="text-xs text-muted-foreground">{t.subject}</div>
                    )}
                  </div>
                  <div className="text-xs uppercase text-muted-foreground">
                    {t.priority}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


