"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  RefreshCw,
  Clock,
  AlertTriangle,
  Info,
  ArrowRightLeft,
  Download,
  Upload,
  RotateCcw,
  Calendar,
  Timer,
  Zap
} from "lucide-react";
import { SyncSettings } from "../types/google-calendar";
import { cn } from "@/lib/utils";

interface SyncSettingsProps {
  settings: SyncSettings;
  onSettingsChange: (settings: Partial<SyncSettings>) => void;
  onSave: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

export function SyncSettingsComponent({
  settings,
  onSettingsChange,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
  className
}: SyncSettingsProps) {
  const [activeTab, setActiveTab] = useState("general");

  const handleDirectionChange = (direction: 'import' | 'export' | 'bidirectional') => {
    onSettingsChange({ direction });
  };

  const handleFrequencyChange = (frequency: 'manual' | 'hourly' | 'daily' | 'weekly') => {
    onSettingsChange({ frequency });
  };

  const handleConflictResolutionChange = (conflictResolution: 'keep_google' | 'keep_local' | 'merge' | 'ask') => {
    onSettingsChange({ conflictResolution });
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'import':
        return <Download className="h-4 w-4" />;
      case 'export':
        return <Upload className="h-4 w-4" />;
      case 'bidirectional':
        return <ArrowRightLeft className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getDirectionDescription = (direction: string) => {
    switch (direction) {
      case 'import':
        return 'Import events from Google Calendar to Study Teddy';
      case 'export':
        return 'Export events from Study Teddy to Google Calendar';
      case 'bidirectional':
        return 'Sync events in both directions';
      default:
        return '';
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'manual':
        return <Settings className="h-4 w-4" />;
      case 'hourly':
        return <Zap className="h-4 w-4" />;
      case 'daily':
        return <Clock className="h-4 w-4" />;
      case 'weekly':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Timer className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sync Settings
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved changes
              </Badge>
            )}
            <Button
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              size="sm"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            {/* Sync Direction */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Sync Direction</Label>
              <RadioGroup
                value={settings.direction}
                onValueChange={handleDirectionChange}
                className="space-y-3"
              >
                {[
                  { value: 'import', label: 'Import Only', description: 'Import events from Google Calendar' },
                  { value: 'export', label: 'Export Only', description: 'Export events to Google Calendar' },
                  { value: 'bidirectional', label: 'Bidirectional', description: 'Sync events in both directions' }
                ].map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getDirectionIcon(option.value)}
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Auto Sync */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Auto Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync calendars based on frequency
                </p>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(autoSync) => onSettingsChange({ autoSync })}
              />
            </div>

            {/* Sync Frequency */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Sync Frequency</Label>
              <Select
                value={settings.frequency}
                onValueChange={handleFrequencyChange}
                disabled={!settings.autoSync}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: 'manual', label: 'Manual Only', icon: Settings },
                    { value: 'hourly', label: 'Every Hour', icon: Zap },
                    { value: 'daily', label: 'Daily', icon: Clock },
                    { value: 'weekly', label: 'Weekly', icon: Calendar }
                  ].map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!settings.autoSync && (
                <p className="text-xs text-muted-foreground">
                  Enable auto sync to set frequency
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timing" className="space-y-6 mt-6">
            {/* Past Events */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Sync Past Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Include events from the past
                  </p>
                </div>
                <Switch
                  checked={settings.syncPastEvents}
                  onCheckedChange={(syncPastEvents) => onSettingsChange({ syncPastEvents })}
                />
              </div>

              {settings.syncPastEvents && (
                <div className="ml-4 space-y-2">
                  <Label htmlFor="pastDays">Days in the past</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="pastDays"
                      type="number"
                      min="1"
                      max="365"
                      value={settings.pastEventsDays}
                      onChange={(e) => onSettingsChange({ pastEventsDays: parseInt(e.target.value) || 30 })}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Future Events */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Sync Future Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Include events in the future
                  </p>
                </div>
                <Switch
                  checked={settings.syncFutureEvents}
                  onCheckedChange={(syncFutureEvents) => onSettingsChange({ syncFutureEvents })}
                />
              </div>

              {settings.syncFutureEvents && (
                <div className="ml-4 space-y-2">
                  <Label htmlFor="futureDays">Days in the future</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="futureDays"
                      type="number"
                      min="1"
                      max="365"
                      value={settings.futureEventsDays}
                      onChange={(e) => onSettingsChange({ futureEventsDays: parseInt(e.target.value) || 90 })}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-6 mt-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Conflict Resolution</Label>
              <p className="text-sm text-muted-foreground">
                How to handle conflicts when the same event is modified in both places
              </p>

              <RadioGroup
                value={settings.conflictResolution}
                onValueChange={handleConflictResolutionChange}
                className="space-y-3"
              >
                {[
                  {
                    value: 'ask',
                    label: 'Ask me each time',
                    description: 'Review conflicts manually before resolving',
                    icon: AlertTriangle
                  },
                  {
                    value: 'keep_google',
                    label: 'Always keep Google Calendar version',
                    description: 'Google Calendar changes take precedence',
                    icon: Download
                  },
                  {
                    value: 'keep_local',
                    label: 'Always keep Study Teddy version',
                    description: 'Local changes take precedence',
                    icon: Upload
                  },
                  {
                    value: 'merge',
                    label: 'Try to merge automatically',
                    description: 'Attempt to combine changes when possible',
                    icon: RotateCcw
                  }
                ].map((option) => (
                  <div key={option.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {settings.conflictResolution === 'ask' && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Manual conflict resolution
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                      You'll be prompted to review and resolve conflicts individually.
                      This gives you the most control but requires manual intervention.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">Selected Calendars</Label>
                <p className="text-sm text-muted-foreground">
                  {settings.selectedCalendars.length === 0
                    ? 'No calendars selected for sync'
                    : `${settings.selectedCalendars.length} calendar(s) selected for sync`
                  }
                </p>
              </div>

              <Separator />

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Advanced Settings
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                      These settings affect how your calendar data is synchronized.
                      Changing them may require a full re-sync of your calendars.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}