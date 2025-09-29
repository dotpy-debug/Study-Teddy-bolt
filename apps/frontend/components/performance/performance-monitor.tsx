'use client';

import { useEffect, useState } from 'react';
import { getStoredVitals, type WebVitalsMetrics } from '@/lib/web-vitals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';

interface PerformanceStats {
  averageLCP: number;
  averageFCP: number;
  averageCLS: number;
  averageINP: number;
  averageTTFB: number;
  totalMeasurements: number;
  lastUpdated: string;
}

export function PerformanceMonitor() {
  const [vitals, setVitals] = useState<WebVitalsMetrics[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;
    
    loadVitals();
    
    // Update every 30 seconds
    const interval = setInterval(loadVitals, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadVitals = () => {
    const storedVitals = getStoredVitals();
    setVitals(storedVitals);
    
    if (storedVitals.length > 0) {
      calculateStats(storedVitals);
    }
  };

  const calculateStats = (vitalsData: WebVitalsMetrics[]) => {
    const grouped = vitalsData.reduce((acc, vital) => {
      if (!acc[vital.name]) acc[vital.name] = [];
      acc[vital.name].push(vital.value);
      return acc;
    }, {} as Record<string, number[]>);

    const average = (arr: number[]) => 
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    setStats({
      averageLCP: average(grouped.LCP || []),
      averageFCP: average(grouped.FCP || []),
      averageCLS: average(grouped.CLS || []),
      averageINP: average(grouped.INP || []),
      averageTTFB: average(grouped.TTFB || []),
      totalMeasurements: vitalsData.length,
      lastUpdated: new Date().toLocaleTimeString(),
    });
  };

  const clearVitals = () => {
    localStorage.removeItem('webVitals');
    setVitals([]);
    setStats(null);
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'bg-green-500';
      case 'needs-improvement': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatValue = (name: string, value: number) => {
    if (name === 'CLS') return value.toFixed(3);
    return Math.round(value);
  };

  const getUnit = (name: string) => {
    return name === 'CLS' ? '' : 'ms';
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
        >
          Performance
        </Button>
      ) : (
        <Card className="w-80 bg-background/95 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Performance Monitor</CardTitle>
              <div className="flex gap-1">
                <Button
                  onClick={loadVitals}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  onClick={clearVitals}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => setIsVisible(false)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {stats ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-medium">LCP</div>
                    <div className="text-muted-foreground">
                      {formatValue('LCP', stats.averageLCP)}{getUnit('LCP')}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">FCP</div>
                    <div className="text-muted-foreground">
                      {formatValue('FCP', stats.averageFCP)}{getUnit('FCP')}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">CLS</div>
                    <div className="text-muted-foreground">
                      {formatValue('CLS', stats.averageCLS)}{getUnit('CLS')}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">INP</div>
                    <div className="text-muted-foreground">
                      {formatValue('INP', stats.averageINP)}{getUnit('INP')}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {stats.totalMeasurements} measurements
                  <br />
                  Updated: {stats.lastUpdated}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">
                No performance data available
              </div>
            )}

            {vitals.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Recent Metrics</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {vitals.slice(-5).reverse().map((vital, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span>{vital.name}</span>
                      <div className="flex items-center gap-1">
                        <span>{formatValue(vital.name, vital.value)}{getUnit(vital.name)}</span>
                        <Badge 
                          className={`h-2 w-2 p-0 ${getRatingColor(vital.rating)}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}