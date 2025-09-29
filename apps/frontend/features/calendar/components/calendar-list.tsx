"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  CheckCircle2,
  Circle,
  Crown,
  Users,
  Lock
} from "lucide-react";
import { GoogleCalendar } from "../types/google-calendar";
import { cn } from "@/lib/utils";

interface CalendarListProps {
  calendars: GoogleCalendar[];
  selectedCalendars: string[];
  onCalendarSelectionChange: (calendarIds: string[]) => void;
  onCalendarVisibilityToggle?: (calendarId: string, visible: boolean) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function CalendarList({
  calendars,
  selectedCalendars,
  onCalendarSelectionChange,
  onCalendarVisibilityToggle,
  onRefresh,
  isLoading = false,
  className
}: CalendarListProps) {
  const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(
    new Set(calendars.filter(cal => cal.selected).map(cal => cal.id))
  );

  const handleSelectAll = () => {
    if (selectedCalendars.length === calendars.length) {
      onCalendarSelectionChange([]);
    } else {
      onCalendarSelectionChange(calendars.map(cal => cal.id));
    }
  };

  const handleCalendarSelect = (calendarId: string, checked: boolean) => {
    if (checked) {
      onCalendarSelectionChange([...selectedCalendars, calendarId]);
    } else {
      onCalendarSelectionChange(selectedCalendars.filter(id => id !== calendarId));
    }
  };

  const handleVisibilityToggle = (calendarId: string) => {
    const isVisible = visibleCalendars.has(calendarId);
    const newVisible = new Set(visibleCalendars);

    if (isVisible) {
      newVisible.delete(calendarId);
    } else {
      newVisible.add(calendarId);
    }

    setVisibleCalendars(newVisible);
    onCalendarVisibilityToggle?.(calendarId, !isVisible);
  };

  const getAccessRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'writer':
        return <Settings className="h-3 w-3 text-blue-500" />;
      case 'reader':
        return <Lock className="h-3 w-3 text-gray-500" />;
      case 'freeBusyReader':
        return <Eye className="h-3 w-3 text-gray-400" />;
      default:
        return <Circle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getAccessRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'writer':
        return 'Editor';
      case 'reader':
        return 'Viewer';
      case 'freeBusyReader':
        return 'Free/Busy';
      default:
        return role;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendars
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendars ({calendars.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedCalendars.length === calendars.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {calendars.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No calendars found</p>
            <p className="text-sm">Connect a Google account to see calendars</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {calendars.map((calendar) => {
                const isSelected = selectedCalendars.includes(calendar.id);
                const isVisible = visibleCalendars.has(calendar.id);

                return (
                  <div
                    key={calendar.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                      isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleCalendarSelect(calendar.id, checked as boolean)
                      }
                      className="shrink-0"
                    />

                    <div
                      className="w-4 h-4 rounded-full shrink-0 border-2"
                      style={{
                        backgroundColor: calendar.backgroundColor || '#4285f4',
                        borderColor: calendar.foregroundColor || '#ffffff'
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">
                          {calendar.summary}
                        </p>
                        {calendar.primary && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Primary
                          </Badge>
                        )}
                      </div>

                      {calendar.description && (
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          {calendar.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {getAccessRoleIcon(calendar.accessRole)}
                          <span className="text-xs text-muted-foreground">
                            {getAccessRoleLabel(calendar.accessRole)}
                          </span>
                        </div>

                        {calendar.timeZone && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span className="text-xs text-muted-foreground">
                              {calendar.timeZone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVisibilityToggle(calendar.id)}
                      className="shrink-0 h-8 w-8 p-0"
                    >
                      {isVisible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {calendars.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {selectedCalendars.length} of {calendars.length} calendars selected
              </span>
              <span>
                {visibleCalendars.size} visible
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}