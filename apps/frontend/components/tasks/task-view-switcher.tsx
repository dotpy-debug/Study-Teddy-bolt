'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  Calendar,
  BarChart3,
  MoreHorizontal,
  Settings,
  Download,
  Filter,
  SortAsc,
  Bookmark,
} from 'lucide-react';
import { TasksDataTable } from './data-table';
import { KanbanBoard } from './kanban/kanban-board';
import { Task, Subject, TaskViewState } from '@/types/tasks';

interface TaskViewSwitcherProps {
  availableSubjects?: Subject[];
  onCreateTask?: (status?: Task['status']) => void;
  onEditTask?: (task: Task) => void;
  className?: string;
}

const VIEW_STORAGE_KEY = 'tasks-view-preferences';

export function TaskViewSwitcher({
  availableSubjects = [],
  onCreateTask,
  onEditTask,
  className,
}: TaskViewSwitcherProps) {
  const [viewState, setViewState] = useState<TaskViewState>(() => {
    // Load view preferences from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(VIEW_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            view: parsed.view || 'list',
            filters: parsed.filters || {},
            selectedTasks: [],
            sortBy: parsed.sortBy,
            sortOrder: parsed.sortOrder,
          };
        }
      } catch (error) {
        console.error('Failed to load view preferences:', error);
      }
    }

    return {
      view: 'list',
      filters: {},
      selectedTasks: [],
    };
  });

  // Persist view preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const toSave = {
          view: viewState.view,
          filters: viewState.filters,
          sortBy: viewState.sortBy,
          sortOrder: viewState.sortOrder,
        };
        localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(toSave));
      } catch (error) {
        console.error('Failed to save view preferences:', error);
      }
    }
  }, [viewState]);

  const handleViewChange = (view: 'list' | 'kanban') => {
    setViewState(prev => ({ ...prev, view }));
  };

  const handleFiltersChange = (filters: any) => {
    setViewState(prev => ({ ...prev, filters }));
  };

  const handleSelectionChange = (selectedTasks: string[]) => {
    setViewState(prev => ({ ...prev, selectedTasks }));
  };

  const handleExportTasks = () => {
    // Implement export functionality based on current view and filters
    console.log('Exporting tasks with state:', viewState);
  };

  const handleSaveView = () => {
    // Save current view as a preset
    console.log('Saving view preset:', viewState);
  };

  const getViewIcon = (view: string) => {
    switch (view) {
      case 'list':
        return <Table className="h-4 w-4" />;
      case 'kanban':
        return <BarChart3 className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Table className="h-4 w-4" />;
    }
  };

  const getActiveFilterCount = () => {
    const filters = viewState.filters;
    let count = 0;

    if (filters.search) count++;
    if (filters.status?.length) count++;
    if (filters.priority?.length) count++;
    if (filters.subjectIds?.length) count++;
    if (filters.dueDateFrom || filters.dueDateTo) count++;

    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-0">
          <Tabs
            value={viewState.view}
            onValueChange={(value) => handleViewChange(value as 'list' | 'kanban')}
            className="w-full"
          >
            {/* View switcher header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-4">
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="list" className="gap-2">
                    <Table className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Board View
                  </TabsTrigger>
                </TabsList>

                {/* Active filters indicator */}
                {activeFilterCount > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* View options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      View Options
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>View Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={handleSaveView}
                      className="gap-2"
                    >
                      <Bookmark className="h-4 w-4" />
                      Save Current View
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={handleExportTasks}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export Visible Tasks
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => handleFiltersChange({})}
                      className="gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Clear All Filters
                    </DropdownMenuItem>

                    {viewState.view === 'list' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setViewState(prev => ({
                              ...prev,
                              sortBy: 'dueDate',
                              sortOrder: 'asc'
                            }));
                          }}
                          className="gap-2"
                        >
                          <SortAsc className="h-4 w-4" />
                          Sort by Due Date
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setViewState(prev => ({
                              ...prev,
                              sortBy: 'priority',
                              sortOrder: 'desc'
                            }));
                          }}
                          className="gap-2"
                        >
                          <SortAsc className="h-4 w-4" />
                          Sort by Priority
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* View content */}
            <TabsContent value="list" className="m-0">
              <TasksDataTable
                availableSubjects={availableSubjects}
                onCreateTask={() => onCreateTask?.()}
                onEditTask={onEditTask}
              />
            </TabsContent>

            <TabsContent value="kanban" className="m-0 p-4">
              <KanbanBoard
                availableSubjects={availableSubjects}
                onCreateTask={onCreateTask}
                onEditTask={onEditTask}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View state debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <details>
              <summary className="text-sm font-medium cursor-pointer">View State (Dev)</summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(viewState, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}