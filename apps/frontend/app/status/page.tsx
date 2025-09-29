import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  message: string;
  services: ServiceStatus[];
  uptime: {
    uptime: number;
    uptimePercentage: number;
    healthChecksPassed: number;
    healthChecksFailed: number;
  };
}

async function getSystemStatus(): Promise<SystemStatus> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${base}/monitoring/status`, {
      next: { revalidate: 10 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }
    
    return response.json();
  } catch (error) {
    // Return degraded status if we can't reach the API
    return {
      status: 'degraded',
      message: 'Unable to fetch system status',
      services: [],
      uptime: {
        uptime: 0,
        uptimePercentage: 0,
        healthChecksPassed: 0,
        healthChecksFailed: 0,
      },
    };
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'operational':
    case 'healthy':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'degraded':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'down':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants = {
    operational: 'bg-green-100 text-green-800',
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  };

  return (
    <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m ${seconds % 60}s`;
  }
}

function formatResponseTime(responseTime?: number): string {
  if (!responseTime) return 'N/A';
  return responseTime < 1000 ? `${Math.round(responseTime)}ms` : `${(responseTime / 1000).toFixed(1)}s`;
}

async function StatusContent() {
  const systemStatus = await getSystemStatus();

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <StatusIcon status={systemStatus.status} />
                Study Teddy Status
              </CardTitle>
              <CardDescription>{systemStatus.message}</CardDescription>
            </div>
            <StatusBadge status={systemStatus.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {systemStatus.uptime.uptimePercentage.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatUptime(systemStatus.uptime.uptime)}
              </div>
              <div className="text-sm text-gray-600">Current Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {systemStatus.uptime.healthChecksPassed}
              </div>
              <div className="text-sm text-gray-600">Health Checks Passed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Current status of all Study Teddy services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {systemStatus.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={service.status} />
                  <div>
                    <div className="font-medium capitalize">{service.name}</div>
                    {service.error && (
                      <div className="text-sm text-red-600">{service.error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {service.responseTime && (
                    <div className="text-sm text-gray-600">
                      {formatResponseTime(service.responseTime)}
                    </div>
                  )}
                  <StatusBadge status={service.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
          <CardDescription>Latest system updates and maintenance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">System Monitoring Implemented</div>
                <div className="text-sm text-gray-600">
                  Added comprehensive monitoring and alerting system
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Performance Optimizations</div>
                <div className="text-sm text-gray-600">
                  Improved database query performance and API response times
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(Date.now() - 86400000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StatusPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Study Teddy Status</h1>
          <p className="text-gray-600 mt-2">
            Real-time status and performance metrics for Study Teddy services
          </p>
        </div>

        <Suspense fallback={<StatusSkeleton />}>
          <StatusContent />
        </Suspense>
      </div>
    </div>
  );
}