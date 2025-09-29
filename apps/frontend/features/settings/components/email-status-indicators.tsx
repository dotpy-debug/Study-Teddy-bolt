'use client';

import React from 'react';
import {
  Mail,
  Check,
  X,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useEmailStatus, useEmailStats } from '@/hooks/queries/use-email';

interface EmailStatusIndicatorsProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

interface StatusCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}

function StatusCard({
  title,
  value,
  icon,
  description,
  trend,
  trendValue,
  color = 'gray'
}: StatusCardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/20',
    yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    gray: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon()}
              <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmailStatusIndicators({
  className = '',
  showDetails = true,
  compact = false
}: EmailStatusIndicatorsProps) {
  const {
    unreadCount,
    hasUnread,
    deliveryRate,
    isDeliveryHealthy,
    totalSent,
    totalFailed,
    totalPending
  } = useEmailStatus();

  const { data: emailStats, isLoading, refetch } = useEmailStats();

  const getDeliveryStatus = () => {
    if (deliveryRate >= 95) return { status: 'excellent', color: 'green' as const };
    if (deliveryRate >= 90) return { status: 'good', color: 'blue' as const };
    if (deliveryRate >= 80) return { status: 'fair', color: 'yellow' as const };
    return { status: 'poor', color: 'red' as const };
  };

  const deliveryStatus = getDeliveryStatus();

  if (compact) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        {/* Delivery Rate Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isDeliveryHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {deliveryRate}% delivery
          </span>
        </div>

        {/* Unread Count */}
        {hasUnread && (
          <Badge variant="destructive" className="text-xs">
            {unreadCount} unread
          </Badge>
        )}

        {/* Pending Count */}
        {totalPending > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalPending} pending
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Status</h3>
          <p className="text-sm text-muted-foreground">
            Monitor your email delivery performance and activity
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="Delivery Rate"
          value={`${deliveryRate}%`}
          icon={<Shield className="h-4 w-4" />}
          description={`${deliveryStatus.status} performance`}
          color={deliveryStatus.color}
          trend={deliveryRate >= 95 ? 'up' : deliveryRate >= 80 ? 'neutral' : 'down'}
          trendValue={deliveryRate >= 95 ? 'Excellent' : deliveryRate >= 80 ? 'Good' : 'Needs attention'}
        />

        <StatusCard
          title="Emails Sent"
          value={totalSent}
          icon={<Check className="h-4 w-4" />}
          description="Successfully delivered"
          color="green"
        />

        <StatusCard
          title="Failed Emails"
          value={totalFailed}
          icon={<X className="h-4 w-4" />}
          description="Delivery failures"
          color={totalFailed > 0 ? 'red' : 'gray'}
        />

        <StatusCard
          title="Pending"
          value={totalPending}
          icon={<Clock className="h-4 w-4" />}
          description="Awaiting delivery"
          color={totalPending > 0 ? 'yellow' : 'gray'}
        />
      </div>

      {showDetails && emailStats && (
        <>
          <Separator />

          {/* Detailed Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Email Activity Details
              </CardTitle>
              <CardDescription>
                Breakdown of email performance by category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Health Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Health</span>
                  <Badge
                    variant={isDeliveryHealthy ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isDeliveryHealthy ? 'Healthy' : 'Needs Attention'}
                  </Badge>
                </div>
                <Progress
                  value={deliveryRate}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {deliveryRate}% of emails delivered successfully
                </p>
              </div>

              <Separator />

              {/* Category Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Performance by Category</h4>
                {emailStats.categoriesStats.map((category) => {
                  const total = category.sent + category.failed;
                  const successRate = total > 0 ? (category.sent / total) * 100 : 100;

                  return (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm capitalize">{category.category}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-600">{category.sent} sent</span>
                          {category.failed > 0 && (
                            <span className="text-red-600">{category.failed} failed</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={successRate}
                          className="h-1 flex-1"
                        />
                        <span className="text-xs text-muted-foreground w-12">
                          {successRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status Indicators */}
              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Status Indicators</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Check className="h-8 w-8 text-green-500 p-1 bg-green-100 rounded-full dark:bg-green-900/20" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Delivered</p>
                      <p className="text-xs text-muted-foreground">Successfully sent</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Clock className="h-8 w-8 text-yellow-500 p-1 bg-yellow-100 rounded-full dark:bg-yellow-900/20" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pending</p>
                      <p className="text-xs text-muted-foreground">Queued for delivery</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <X className="h-8 w-8 text-red-500 p-1 bg-red-100 rounded-full dark:bg-red-900/20" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Failed</p>
                      <p className="text-xs text-muted-foreground">Delivery errors</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {(totalFailed > 0 || !isDeliveryHealthy) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Recommended Actions
                    </h4>
                    <div className="space-y-2 text-sm">
                      {totalFailed > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <X className="h-4 w-4 text-red-500" />
                          <span>Review failed email addresses for validity</span>
                        </div>
                      )}
                      {!isDeliveryHealthy && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span>Check email service configuration</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Live Status Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Zap className="h-5 w-5 text-blue-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium">Email Service Status</p>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </div>
            </div>
            <Badge variant="default" className="bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              Online
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}