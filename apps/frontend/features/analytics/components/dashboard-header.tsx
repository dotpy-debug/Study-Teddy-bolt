'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Download,
  Share2,
  RefreshCw,
  Maximize2,
  Minimize2,
  BarChart3,
  Printer,
  Settings,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  dateRange: '7d' | '30d' | '90d' | 'custom';
  fromDate: string;
  toDate: string;
  onDateRangeChange: (range: '7d' | '30d' | '90d' | 'custom') => void;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'csv' | 'json') => void;
  onShare: () => void;
  onPrint: () => void;
  onToggleFullscreen: () => void;
  onToggleComparison: () => void;
  isRefreshing?: boolean;
  isFullscreen?: boolean;
  comparisonMode?: boolean;
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  dateRange,
  fromDate,
  toDate,
  onDateRangeChange,
  onFromDateChange,
  onToDateChange,
  onRefresh,
  onExport,
  onShare,
  onPrint,
  onToggleFullscreen,
  onToggleComparison,
  isRefreshing = false,
  isFullscreen = false,
  comparisonMode = false,
  className,
}: DashboardHeaderProps) {
  const [customDateOpen, setCustomDateOpen] = useState(false);

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom range' },
  ];

  const handleDateRangeChange = (value: string) => {
    const newRange = value as '7d' | '30d' | '90d' | 'custom';
    onDateRangeChange(newRange);
    if (newRange === 'custom') {
      setCustomDateOpen(true);
    }
  };

  const formatDateRange = () => {
    if (!fromDate || !toDate) return 'Select date range';

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric'
    };

    if (from.getFullYear() !== to.getFullYear()) {
      return `${from.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' })} - ${to.toLocaleDateString('en-US', { ...formatOptions, year: 'numeric' })}`;
    }

    return `${from.toLocaleDateString('en-US', formatOptions)} - ${to.toLocaleDateString('en-US', formatOptions)}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {comparisonMode && (
              <Badge variant="secondary" className="text-xs">
                Comparison Mode
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="hidden sm:flex"
          >
            <RefreshCw className={cn('h-4 w-4', { 'animate-spin': isRefreshing })} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {/* Comparison Toggle */}
          <Button
            variant={comparisonMode ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleComparison}
            className="hidden md:flex"
          >
            <BarChart3 className="h-4 w-4" />
            Compare
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFullscreen}
            className="hidden lg:flex"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Export Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Export</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('json')}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share Button */}
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Share</span>
          </Button>

          {/* More Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="sm:hidden">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuItem onClick={onRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn('h-4 w-4 mr-2', { 'animate-spin': isRefreshing })} />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleComparison}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {comparisonMode ? 'Exit Compare' : 'Compare'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleFullscreen}>
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4 mr-2" />
                ) : (
                  <Maximize2 className="h-4 w-4 mr-2" />
                )}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        {/* Date Range Selector */}
        <div className="space-y-2">
          <Label htmlFor="dateRange" className="text-sm font-medium">
            Time Period
          </Label>
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger id="dateRange" className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="flex gap-2 items-end">
            <div className="space-y-2">
              <Label htmlFor="fromDate" className="text-sm font-medium">
                From
              </Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate" className="text-sm font-medium">
                To
              </Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className="w-[140px]"
              />
            </div>
          </div>
        )}

        {/* Date Range Display */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDateRange()}</span>
        </div>
      </div>

      {/* Comparison Period Selector (when in comparison mode) */}
      {comparisonMode && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Comparison Settings</h3>
              <p className="text-sm text-muted-foreground">
                Compare current period with previous data
              </p>
            </div>
            <Select defaultValue="previous-period">
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="previous-period">Previous Period</SelectItem>
                <SelectItem value="previous-week">Previous Week</SelectItem>
                <SelectItem value="previous-month">Previous Month</SelectItem>
                <SelectItem value="previous-quarter">Previous Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="text-xs text-muted-foreground hidden lg:block">
        Keyboard shortcuts: Ctrl+R (refresh), Ctrl+P (print), Ctrl+E (export), Ctrl+F (fullscreen)
      </div>
    </div>
  );
}