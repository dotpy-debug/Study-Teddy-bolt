// Analytics Hook Stub
import { useState, useEffect } from 'react';

export interface AnalyticsTile {
  id: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

export function useAnalytics() {
  const [tiles, setTiles] = useState<AnalyticsTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Stub implementation
    setTiles([
      { id: 'focused-minutes', value: '0', trend: 'stable' },
      { id: 'tasks-completed', value: '0', trend: 'stable' },
      { id: 'on-time-rate', value: '0%', trend: 'stable' }
    ]);
    setLoading(false);
  }, []);

  return { tiles, loading };
}

export async function fetchAnalyticsTiles(): Promise<AnalyticsTile[]> {
  return [
    { id: 'focused-minutes', value: '0', trend: 'stable' },
    { id: 'tasks-completed', value: '0', trend: 'stable' },
    { id: 'on-time-rate', value: '0%', trend: 'stable' }
  ];
}

export async function fetchNextBestAction(): Promise<{ action: string; reason: string }> {
  return {
    action: 'Start your first task',
    reason: 'You have pending tasks to complete'
  };
}