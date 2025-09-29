'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Clock,
  Volume2,
  Settings,
  CalendarClock,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationPreferences {
  // Channel preferences
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;

  // Email notification type preferences
  emailWelcomeEnabled: boolean;
  emailVerificationEnabled: boolean;
  emailPasswordResetEnabled: boolean;
  emailTaskRemindersEnabled: boolean;
  emailWeeklyDigestEnabled: boolean;
  emailFocusSessionAlertsEnabled: boolean;
  emailAchievementsEnabled: boolean;

  // Notification type preferences (in-app)
  taskReminders: boolean;
  goalReminders: boolean;
  achievements: boolean;
  aiSuggestions: boolean;
  systemAlerts: boolean;

  // Timing preferences
  reminderLeadTimeMinutes: number;
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: number;
  weeklyDigestTime: string;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;

  // Frequency settings
  reminderFrequency: 'immediate' | 'daily' | 'weekly';
  digestFrequency: 'daily' | 'weekly' | 'monthly';

  // Sound preferences
  soundEnabled: boolean;
  soundVolume: number;
}

interface SettingSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SettingSection({ title, description, icon, children }: SettingSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface ToggleSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ id, label, description, checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id} className={`text-base font-medium ${disabled ? 'text-muted-foreground' : ''}`}>
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
      </label>
    </div>
  );
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    emailWelcomeEnabled: true,
    emailVerificationEnabled: true,
    emailPasswordResetEnabled: true,
    emailTaskRemindersEnabled: true,
    emailWeeklyDigestEnabled: true,
    emailFocusSessionAlertsEnabled: false,
    emailAchievementsEnabled: true,
    taskReminders: true,
    goalReminders: true,
    achievements: true,
    aiSuggestions: true,
    systemAlerts: true,
    reminderLeadTimeMinutes: 15,
    dailySummaryEnabled: true,
    dailySummaryTime: '08:00',
    weeklyDigestEnabled: true,
    weeklyDigestDay: 1,
    weeklyDigestTime: '08:00',
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    quietHoursTimezone: 'UTC',
    reminderFrequency: 'immediate',
    digestFrequency: 'weekly',
    soundEnabled: true,
    soundVolume: 50,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load preferences from API
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notification-preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPreferences(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setAlert({ type: 'error', message: 'Failed to load notification preferences' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlert({ type: 'success', message: 'Notification preferences saved successfully!' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setAlert({ type: 'error', message: 'Failed to save notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  const disableAllEmails = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/notification-preferences/disable-all-emails', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPreferences(prev => ({ ...prev, emailEnabled: false }));
        setAlert({ type: 'success', message: 'All email notifications disabled' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to disable email notifications' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to disable email notifications' });
    } finally {
      setSaving(false);
    }
  };

  const enableAllEmails = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/notification-preferences/enable-all-emails', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await loadPreferences(); // Reload to get updated preferences
        setAlert({ type: 'success', message: 'All email notifications enabled' });
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to enable email notifications' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to enable email notifications' });
    } finally {
      setSaving(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setAlert({ type: 'success', message: 'Browser notifications enabled successfully!' });
      } else {
        setAlert({ type: 'error', message: 'Browser notification permission denied' });
      }
    } else {
      setAlert({ type: 'error', message: 'Browser notifications not supported' });
    }
  };

  const weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                      <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">
          Manage how and when you receive notifications from Study Teddy.
        </p>
      </div>

      {alert && (
        <Alert className={alert.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          {alert.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
          <AlertDescription className={alert.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4 flex-wrap">
        <Button onClick={savePreferences} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button onClick={requestNotificationPermission} variant="outline">
          <Smartphone className="w-4 h-4 mr-2" />
          Enable Browser Notifications
        </Button>
        <Button onClick={disableAllEmails} variant="outline" disabled={saving}>
          Disable All Emails
        </Button>
        <Button onClick={enableAllEmails} variant="outline" disabled={saving}>
          Enable All Emails
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Channel Preferences */}
        <SettingSection
          title="Notification Channels"
          description="Choose how you want to receive notifications"
          icon={<Settings className="w-5 h-5" />}
        >
          <ToggleSwitch
            id="email-enabled"
            label="Email Notifications"
            description="Receive notifications via email"
            checked={preferences.emailEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailEnabled: value }))}
          />
          <ToggleSwitch
            id="push-enabled"
            label="Push Notifications"
            description="Browser and mobile push notifications"
            checked={preferences.pushEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, pushEnabled: value }))}
          />
          <ToggleSwitch
            id="inapp-enabled"
            label="In-App Notifications"
            description="Notifications within the Study Teddy app"
            checked={preferences.inAppEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, inAppEnabled: value }))}
          />
        </SettingSection>

        {/* Email Notifications */}
        <SettingSection
          title="Email Notifications"
          description="Configure which emails you want to receive"
          icon={<Mail className="w-5 h-5" />}
        >
          <ToggleSwitch
            id="email-welcome"
            label="Welcome Email"
            description="Welcome message when you join Study Teddy"
            checked={preferences.emailWelcomeEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailWelcomeEnabled: value }))}
            disabled={!preferences.emailEnabled}
          />
          <ToggleSwitch
            id="email-verification"
            label="Email Verification"
            description="Email address verification notifications"
            checked={preferences.emailVerificationEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailVerificationEnabled: value }))}
            disabled={!preferences.emailEnabled}
          />
          <ToggleSwitch
            id="email-password-reset"
            label="Password Reset"
            description="Password reset and security notifications"
            checked={preferences.emailPasswordResetEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailPasswordResetEnabled: value }))}
            disabled={!preferences.emailEnabled}
          />
          <ToggleSwitch
            id="email-task-reminders"
            label="Task Reminders"
            description="Get reminded about upcoming task deadlines"
            checked={preferences.emailTaskRemindersEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailTaskRemindersEnabled: value }))}
            disabled={!preferences.emailEnabled}
          />
          <ToggleSwitch
            id="email-weekly-digest"
            label="Weekly Digest"
            description="Weekly summary of your study progress and achievements"
            checked={preferences.emailWeeklyDigestEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailWeeklyDigestEnabled: value }))}
            disabled={!preferences.emailEnabled}
          />
          <ToggleSwitch
            id="email-focus-session-alerts"
            label="Focus Session Alerts"
            description="Notifications about completed focus sessions"
            checked={preferences.emailFocusSessionAlertsEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailFocusSessionAlertsEnabled: value }))}
            disabled={!preferences.emailEnabled}
          />
          <ToggleSwitch
            id="email-achievements"
            label="Achievement Notifications"
            description="Celebrate your study milestones and achievements"
            checked={preferences.emailAchievementsEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, emailAchievementsEnabled: value }))}
            disabled={!preferences.emailEnabled}
          />
        </SettingSection>

        {/* In-App Notifications */}
        <SettingSection
          title="In-App Notifications"
          description="Notifications within the Study Teddy app"
          icon={<Monitor className="w-5 h-5" />}
        >
          <ToggleSwitch
            id="inapp-task-reminders"
            label="Task Reminders"
            description="Notifications about task deadlines and updates"
            checked={preferences.taskReminders}
            onChange={(value) => setPreferences(prev => ({ ...prev, taskReminders: value }))}
            disabled={!preferences.inAppEnabled}
          />
          <ToggleSwitch
            id="inapp-goal-reminders"
            label="Goal Reminders"
            description="Reminders about your study goals and progress"
            checked={preferences.goalReminders}
            onChange={(value) => setPreferences(prev => ({ ...prev, goalReminders: value }))}
            disabled={!preferences.inAppEnabled}
          />
          <ToggleSwitch
            id="inapp-achievements"
            label="Achievement Celebrations"
            description="In-app celebrations when you reach study milestones"
            checked={preferences.achievements}
            onChange={(value) => setPreferences(prev => ({ ...prev, achievements: value }))}
            disabled={!preferences.inAppEnabled}
          />
          <ToggleSwitch
            id="inapp-ai-suggestions"
            label="AI Suggestions"
            description="Personalized study tips and insights from AI"
            checked={preferences.aiSuggestions}
            onChange={(value) => setPreferences(prev => ({ ...prev, aiSuggestions: value }))}
            disabled={!preferences.inAppEnabled}
          />
          <ToggleSwitch
            id="inapp-system-alerts"
            label="System Alerts"
            description="Important system messages and maintenance notifications"
            checked={preferences.systemAlerts}
            onChange={(value) => setPreferences(prev => ({ ...prev, systemAlerts: value }))}
            disabled={!preferences.inAppEnabled}
          />
        </SettingSection>

        {/* Timing and Schedule */}
        <SettingSection
          title="Timing & Schedule"
          description="Configure when and how often you receive notifications"
          icon={<Clock className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Reminder Lead Time</Label>
              <p className="text-sm text-muted-foreground mb-2">
                How many minutes before a deadline should we remind you?
              </p>
              <div className="flex items-center gap-4">
                <Slider
                  value={[preferences.reminderLeadTimeMinutes]}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, reminderLeadTimeMinutes: value[0] }))}
                  max={120}
                  min={5}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{preferences.reminderLeadTimeMinutes}min</span>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Reminder Frequency</Label>
              <p className="text-sm text-muted-foreground mb-2">
                How often should we send you reminders?
              </p>
              <Select
                value={preferences.reminderFrequency}
                onValueChange={(value: 'immediate' | 'daily' | 'weekly') =>
                  setPreferences(prev => ({ ...prev, reminderFrequency: value }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground mb-2">
                When should we send your weekly progress summary?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Day of the week</Label>
                  <Select
                    value={preferences.weeklyDigestDay.toString()}
                    onValueChange={(value) =>
                      setPreferences(prev => ({ ...prev, weeklyDigestDay: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekDays.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Time</Label>
                  <Input
                    type="time"
                    value={preferences.weeklyDigestTime}
                    onChange={(e) => setPreferences(prev => ({ ...prev, weeklyDigestTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingSection>

        {/* Quiet Hours */}
        <SettingSection
          title="Quiet Hours"
          description="Disable non-urgent notifications during these hours"
          icon={<CalendarClock className="w-5 h-5" />}
        >
          <ToggleSwitch
            id="quiet-hours-enabled"
            label="Enable Quiet Hours"
            description="Automatically silence notifications during specified hours"
            checked={preferences.quietHoursEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, quietHoursEnabled: value }))}
          />

          {preferences.quietHoursEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Start Time</Label>
                  <Input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => setPreferences(prev => ({ ...prev, quietHoursStart: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-sm">End Time</Label>
                  <Input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => setPreferences(prev => ({ ...prev, quietHoursEnd: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Timezone</Label>
                <Input
                  value={preferences.quietHoursTimezone}
                  onChange={(e) => setPreferences(prev => ({ ...prev, quietHoursTimezone: e.target.value }))}
                  placeholder="e.g., America/New_York, Europe/London, Asia/Tokyo"
                />
              </div>
            </div>
          )}
        </SettingSection>

        {/* Sound Settings */}
        <SettingSection
          title="Sound Settings"
          description="Configure notification sounds and volume"
          icon={<Volume2 className="w-5 h-5" />}
        >
          <ToggleSwitch
            id="sound-enabled"
            label="Enable Sounds"
            description="Play sounds for notifications"
            checked={preferences.soundEnabled}
            onChange={(value) => setPreferences(prev => ({ ...prev, soundEnabled: value }))}
          />

          {preferences.soundEnabled && (
            <div className="pl-4 border-l-2 border-gray-200">
              <Label className="text-base font-medium">Volume</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  value={[preferences.soundVolume]}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, soundVolume: value[0] }))}
                  max={100}
                  min={0}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{preferences.soundVolume}%</span>
              </div>
            </div>
          )}
        </SettingSection>
      </div>

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}