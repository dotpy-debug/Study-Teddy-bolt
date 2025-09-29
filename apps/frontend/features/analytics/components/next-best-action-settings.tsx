'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Brain,
  Clock,
  Bell,
  BookOpen,
  Calendar,
  Target,
  Coffee,
  RefreshCw,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences } from '../hooks/useNextBestAction';
import type { UserPreferences, ActionCategory, ActionPriority } from '../types/next-best-action';

interface NextBestActionSettingsProps {
  className?: string;
  trigger?: React.ReactNode;
}

const categoryConfig = {
  study: { icon: BookOpen, label: 'Study Sessions', color: 'bg-blue-500' },
  review: { icon: RefreshCw, label: 'Review & Practice', color: 'bg-green-500' },
  break: { icon: Coffee, label: 'Breaks & Rest', color: 'bg-orange-500' },
  goal: { icon: Target, label: 'Goal Management', color: 'bg-purple-500' },
  schedule: { icon: Calendar, label: 'Scheduling', color: 'bg-indigo-500' }
};

const priorityConfig = {
  high: { label: 'High Priority', color: 'text-red-600' },
  medium: { label: 'Medium Priority', color: 'text-yellow-600' },
  low: { label: 'Low Priority', color: 'text-green-600' }
};

export const NextBestActionSettings: React.FC<NextBestActionSettingsProps> = ({
  className,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const { preferences, isLoading, error, updatePreferences, resetToDefaults } = usePreferences();

  const [localPreferences, setLocalPreferences] = useState<UserPreferences | null>(null);

  // Initialize local preferences when preferences are loaded
  React.useEffect(() => {
    if (preferences && !localPreferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences, localPreferences]);

  const handlePreferenceChange = useCallback((
    section: keyof UserPreferences,
    field: string,
    value: any
  ) => {
    if (!localPreferences) return;

    const newPreferences = {
      ...localPreferences,
      [section]: {
        ...localPreferences[section],
        [field]: value
      }
    };

    setLocalPreferences(newPreferences);
    setHasChanges(true);
  }, [localPreferences]);

  const handleCategoryToggle = useCallback((category: ActionCategory) => {
    if (!localPreferences) return;

    const isEnabled = localPreferences.enabledCategories.includes(category);
    const newCategories = isEnabled
      ? localPreferences.enabledCategories.filter(c => c !== category)
      : [...localPreferences.enabledCategories, category];

    setLocalPreferences({
      ...localPreferences,
      enabledCategories: newCategories
    });
    setHasChanges(true);
  }, [localPreferences]);

  const handleSave = useCallback(async () => {
    if (!localPreferences || !hasChanges) return;

    setSaveStatus('saving');
    try {
      await updatePreferences(localPreferences);
      setSaveStatus('saved');
      setHasChanges(false);

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [localPreferences, hasChanges, updatePreferences]);

  const handleReset = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await resetToDefaults();
      setSaveStatus('saved');
      setHasChanges(false);
      setLocalPreferences(null); // Will be reloaded from preferences

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [resetToDefaults]);

  const defaultTrigger = (
    <Button variant="ghost" size="icon">
      <Settings className="w-4 h-4" />
    </Button>
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="w-4 h-4" />
        <div>
          <h4>Settings Error</h4>
          <p className="text-sm mt-1">Unable to load NBA settings. Please try again.</p>
        </div>
      </Alert>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Next Best Action Settings
          </DialogTitle>
          <DialogDescription>
            Customize how AI recommendations are generated and displayed.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {localPreferences && (
          <div className="space-y-6">
            {/* Recommendation Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Recommendation Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose which types of recommendations you want to receive.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(categoryConfig).map(([category, config]) => {
                    const CategoryIcon = config.icon;
                    const isEnabled = localPreferences.enabledCategories.includes(category as ActionCategory);

                    return (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.color} bg-opacity-10`}>
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <Label className="font-medium">{config.label}</Label>
                            <p className="text-xs text-muted-foreground">
                              {category === 'study' && 'Focused study sessions and learning activities'}
                              {category === 'review' && 'Review sessions and practice exercises'}
                              {category === 'break' && 'Rest periods and wellness activities'}
                              {category === 'goal' && 'Goal tracking and milestone management'}
                              {category === 'schedule' && 'Planning and time management'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleCategoryToggle(category as ActionCategory)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Priority Filter */}
                <div className="space-y-2">
                  <Label>Priority Filter</Label>
                  <Select
                    value={localPreferences.priorityFilter}
                    onValueChange={(value) => setLocalPreferences({
                      ...localPreferences,
                      priorityFilter: value as 'all' | ActionPriority
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High Priority Only</SelectItem>
                      <SelectItem value="medium">Medium Priority and Above</SelectItem>
                      <SelectItem value="low">Low Priority Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Filter recommendations by priority level.
                  </p>
                </div>

                <Separator />

                {/* Max Recommendations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Maximum Recommendations</Label>
                    <Badge variant="outline">{localPreferences.maxRecommendations}</Badge>
                  </div>
                  <Slider
                    value={[localPreferences.maxRecommendations]}
                    onValueChange={([value]) => setLocalPreferences({
                      ...localPreferences,
                      maxRecommendations: value
                    })}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of recommendations to show at once.
                  </p>
                </div>

                <Separator />

                {/* Refresh Interval */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Auto Refresh Interval</Label>
                    <Badge variant="outline">{localPreferences.refreshInterval}m</Badge>
                  </div>
                  <Slider
                    value={[localPreferences.refreshInterval]}
                    onValueChange={([value]) => setLocalPreferences({
                      ...localPreferences,
                      refreshInterval: value
                    })}
                    min={5}
                    max={60}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How often to automatically refresh recommendations.
                  </p>
                </div>

                <Separator />

                {/* Auto Refresh */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Refresh</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically refresh recommendations in the background.
                    </p>
                  </div>
                  <Switch
                    checked={localPreferences.autoRefresh}
                    onCheckedChange={(checked) => setLocalPreferences({
                      ...localPreferences,
                      autoRefresh: checked
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries({
                  highPriority: {
                    label: 'High Priority Alerts',
                    description: 'Get notified about urgent recommendations'
                  },
                  deadlineAlerts: {
                    label: 'Deadline Alerts',
                    description: 'Reminders about upcoming deadlines'
                  },
                  optimalTimingAlerts: {
                    label: 'Optimal Timing Alerts',
                    description: 'Notifications about best times to study'
                  },
                  breakReminders: {
                    label: 'Break Reminders',
                    description: 'Reminders to take breaks'
                  },
                  goalMilestones: {
                    label: 'Goal Milestones',
                    description: 'Notifications when you reach goal milestones'
                  },
                  adaptiveReminders: {
                    label: 'Adaptive Reminders',
                    description: 'Smart reminders based on your patterns'
                  }
                }).map(([key, config]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label>{config.label}</Label>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                    <Switch
                      checked={localPreferences.notificationSettings[key as keyof typeof localPreferences.notificationSettings]}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange('notificationSettings', key, checked)
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Learning Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Learning Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preferred Session Length */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Preferred Session Length</Label>
                    <Badge variant="outline">{localPreferences.learningPreferences.preferredSessionLength}m</Badge>
                  </div>
                  <Slider
                    value={[localPreferences.learningPreferences.preferredSessionLength]}
                    onValueChange={([value]) =>
                      handlePreferenceChange('learningPreferences', 'preferredSessionLength', value)
                    }
                    min={15}
                    max={120}
                    step={15}
                    className="w-full"
                  />
                </div>

                <Separator />

                {/* Break Frequency */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Break Frequency</Label>
                    <Badge variant="outline">Every {localPreferences.learningPreferences.breakFrequency}m</Badge>
                  </div>
                  <Slider
                    value={[localPreferences.learningPreferences.breakFrequency]}
                    onValueChange={([value]) =>
                      handlePreferenceChange('learningPreferences', 'breakFrequency', value)
                    }
                    min={30}
                    max={180}
                    step={15}
                    className="w-full"
                  />
                </div>

                <Separator />

                {/* Toggle Settings */}
                <div className="space-y-4">
                  {[
                    {
                      key: 'difficultSubjectsFirst',
                      label: 'Difficult Subjects First',
                      description: 'Prioritize challenging subjects when energy is high'
                    },
                    {
                      key: 'adaptToPerformance',
                      label: 'Adapt to Performance',
                      description: 'Adjust recommendations based on your performance'
                    },
                    {
                      key: 'energyBasedScheduling',
                      label: 'Energy-Based Scheduling',
                      description: 'Schedule activities based on your energy patterns'
                    }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <Label>{label}</Label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                      <Switch
                        checked={localPreferences.learningPreferences[key as keyof typeof localPreferences.learningPreferences] as boolean}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange('learningPreferences', key, checked)
                        }
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Context Switching Tolerance */}
                <div className="space-y-2">
                  <Label>Context Switching Tolerance</Label>
                  <Select
                    value={localPreferences.learningPreferences.contextSwitchingTolerance}
                    onValueChange={(value) =>
                      handlePreferenceChange('learningPreferences', 'contextSwitchingTolerance', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Prefer focused sessions</SelectItem>
                      <SelectItem value="medium">Medium - Some variety is okay</SelectItem>
                      <SelectItem value="high">High - Enjoy switching between topics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saveStatus === 'saving'}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>

              <div className="flex items-center gap-2">
                {saveStatus === 'saved' && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Saved
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Error
                  </div>
                )}
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NextBestActionSettings;