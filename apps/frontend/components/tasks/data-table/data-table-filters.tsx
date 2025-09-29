'use client';

import React, { useState, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  Filter,
  X,
  Calendar,
  Flag,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskQueryParams, Subject } from '@/types/tasks';

interface DataTableFiltersProps {
  filters: TaskQueryParams;
  onFiltersChange: (filters: TaskQueryParams) => void;
  availableSubjects?: Subject[];
  isLoading?: boolean;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export function DataTableFilters({
  filters,
  onFiltersChange,
  availableSubjects = [],
  isLoading = false,
}: DataTableFiltersProps) {
  const [localFilters, setLocalFilters] = useState<TaskQueryParams>(filters);

  // Quick filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const updateFilters = useCallback((newFilters: Partial<TaskQueryParams>) => {
    const updated = { ...localFilters, ...newFilters };
    setLocalFilters(updated);
    onFiltersChange(updated);
  }, [localFilters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    const cleared: TaskQueryParams = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  }, [onFiltersChange]);

  const hasActiveFilters = Object.keys(localFilters).some(
    key => localFilters[key as keyof TaskQueryParams] !== undefined &&
    localFilters[key as keyof TaskQueryParams] !== ''
  );

  const handleSearchChange = useCallback((value: string) => {
    updateFilters({ search: value || undefined });
  }, [updateFilters]);

  const handleStatusChange = useCallback((status: string, checked: boolean) => {
    const currentStatus = localFilters.status || [];
    const newStatus = checked
      ? [...currentStatus, status]
      : currentStatus.filter(s => s !== status);

    updateFilters({ status: newStatus.length > 0 ? newStatus : undefined });
  }, [localFilters.status, updateFilters]);

  const handlePriorityChange = useCallback((priority: string, checked: boolean) => {
    const currentPriority = localFilters.priority || [];
    const newPriority = checked
      ? [...currentPriority, priority]
      : currentPriority.filter(p => p !== priority);

    updateFilters({ priority: newPriority.length > 0 ? newPriority : undefined });
  }, [localFilters.priority, updateFilters]);

  const handleSubjectChange = useCallback((subjectId: string, checked: boolean) => {
    const currentSubjects = localFilters.subjectIds || [];
    const newSubjects = checked
      ? [...currentSubjects, subjectId]
      : currentSubjects.filter(s => s !== subjectId);

    updateFilters({ subjectIds: newSubjects.length > 0 ? newSubjects : undefined });
  }, [localFilters.subjectIds, updateFilters]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.status?.length) count++;
    if (localFilters.priority?.length) count++;
    if (localFilters.subjectIds?.length) count++;
    if (localFilters.dueDateFrom || localFilters.dueDateTo) count++;
    return count;
  };

  const renderActiveFilterBadges = () => {
    const badges = [];

    if (localFilters.search) {
      badges.push(
        <Badge key="search" variant="secondary" className="gap-1">
          <Search className="h-3 w-3" />
          Search: {localFilters.search}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => updateFilters({ search: undefined })}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    if (localFilters.status?.length) {
      badges.push(
        <Badge key="status" variant="secondary" className="gap-1">
          Status: {localFilters.status.length}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => updateFilters({ status: undefined })}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    if (localFilters.priority?.length) {
      badges.push(
        <Badge key="priority" variant="secondary" className="gap-1">
          <Flag className="h-3 w-3" />
          Priority: {localFilters.priority.length}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => updateFilters({ priority: undefined })}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    if (localFilters.subjectIds?.length) {
      badges.push(
        <Badge key="subjects" variant="secondary" className="gap-1">
          <BookOpen className="h-3 w-3" />
          Subjects: {localFilters.subjectIds.length}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => updateFilters({ subjectIds: undefined })}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    if (localFilters.dueDateFrom || localFilters.dueDateTo) {
      badges.push(
        <Badge key="dates" variant="secondary" className="gap-1">
          <Calendar className="h-3 w-3" />
          Date Range
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => updateFilters({ dueDateFrom: undefined, dueDateTo: undefined })}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-4">
      {/* Main filter controls */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={localFilters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            disabled={isLoading}
          />
        </div>

        {/* Quick status filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              Status
              {localFilters.status?.length && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0">
                  {localFilters.status.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filter by Status</Label>
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={localFilters.status?.includes(option.value) || false}
                    onCheckedChange={(checked) =>
                      handleStatusChange(option.value, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Quick priority filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Flag className="h-4 w-4" />
              Priority
              {localFilters.priority?.length && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0">
                  {localFilters.priority.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="start">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filter by Priority</Label>
              {priorityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${option.value}`}
                    checked={localFilters.priority?.includes(option.value) || false}
                    onCheckedChange={(checked) =>
                      handlePriorityChange(option.value, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`priority-${option.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Advanced filters */}
        <Sheet open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Apply advanced filters to narrow down your tasks.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Subjects filter */}
              {availableSubjects.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Subjects</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableSubjects.map((subject) => (
                      <div key={subject.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject.id}`}
                          checked={localFilters.subjectIds?.includes(subject.id) || false}
                          onCheckedChange={(checked) =>
                            handleSubjectChange(subject.id, checked === true)
                          }
                        />
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          <Label
                            htmlFor={`subject-${subject.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {subject.name}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date range filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Due Date Range</Label>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="dueDateFrom" className="text-xs text-muted-foreground">
                      From
                    </Label>
                    <Input
                      id="dueDateFrom"
                      type="date"
                      value={localFilters.dueDateFrom || ''}
                      onChange={(e) =>
                        updateFilters({ dueDateFrom: e.target.value || undefined })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDateTo" className="text-xs text-muted-foreground">
                      To
                    </Label>
                    <Input
                      id="dueDateTo"
                      type="date"
                      value={localFilters.dueDateTo || ''}
                      onChange={(e) =>
                        updateFilters({ dueDateTo: e.target.value || undefined })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Sort options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sort By</Label>
                <Select
                  value={localFilters.sortBy || ''}
                  onValueChange={(value) =>
                    updateFilters({ sortBy: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sort field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={localFilters.sortOrder || 'asc'}
                  onValueChange={(value) =>
                    updateFilters({ sortOrder: value as 'asc' | 'desc' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear all filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {renderActiveFilterBadges()}
        </div>
      )}
    </div>
  );
}