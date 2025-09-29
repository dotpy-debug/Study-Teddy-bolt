'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Settings,
  Clock,
  Target,
  Calendar,
  TrendingUp,
  Bell,
  Minimize2,
  Volume2,
  VolumeX,
  RotateCcw,
  Plus,
  CheckCircle,
  AlertCircle,
  Flame,
  Award,
  Clock4,
  BookOpen,
  User,
  Sun,
  Moon,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTheme } from 'next-themes';
import { useNotifications } from '@/contexts/notification-context';

// Import focus components
import { AccessibleTimer } from './accessible-timer';
import { FocusPreset, FocusPresetCard } from './focus-preset-card';
import { TaskSubjectSelector } from './task-subject-selector';
import { BackgroundSounds, SoundType } from './background-sounds';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';

// Import API
import { focusSessionsApi, FocusSession, StartFocusSessionRequest } from '@/lib/api/focus';

// Types
interface Task {
  id: string;
  title: string;
  subject?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface SessionGoal {
  id: string;
  description: string;
  completed: boolean;
  createdAt: Date;
}

interface SessionStats {
  todayMinutes: number;
  todaySessions: number;
  weeklyMinutes: number;
  currentStreak: number;
  averageSession: number;
  completionRate: number;
}

interface SessionHistory {
  id: string;
  type: 'focus' | 'short-break' | 'long-break';
  duration: number;
  completedAt: Date;
  subject?: string;
  task?: string;
  completionRate: number;
}

interface NotificationSettings {
  sessionStart: boolean;
  sessionEnd: boolean;
  breakReminder: boolean;
  dailyGoal: boolean;
  sound: boolean;
  volume: number;
}

// Default presets
const defaultPresets: FocusPreset[] = [
  {
    id: '1',
    name: 'Pomodoro Classic',
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    color: 'blue',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Deep Work',
    focusDuration: 90,
    shortBreakDuration: 20,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 2,
    color: 'purple',
  },
  {
    id: '3',
    name: 'Quick Focus',
    focusDuration: 15,
    shortBreakDuration: 3,
    longBreakDuration: 10,
    sessionsBeforeLongBreak: 3,
    color: 'green',
  },
];

// Mock data
const mockTasks: Task[] = [
  { id: '1', title: 'Complete Math Assignment', subject: 'Mathematics', priority: 'high', estimatedMinutes: 60 },
  { id: '2', title: 'Read Chapter 5', subject: 'History', priority: 'medium', estimatedMinutes: 45 },
  { id: '3', title: 'Write Essay Introduction', subject: 'English', priority: 'high', estimatedMinutes: 30 },
  { id: '4', title: 'Practice Physics Problems', subject: 'Physics', priority: 'medium', estimatedMinutes: 90 },
];

const mockSubjects: Subject[] = [
  { id: '1', name: 'Mathematics', color: '#3b82f6' },
  { id: '2', name: 'History', color: '#ef4444' },
  { id: '3', name: 'English', color: '#10b981' },
  { id: '4', name: 'Physics', color: '#f59e0b' },
  { id: '5', name: 'Chemistry', color: '#8b5cf6' },
];

export interface FocusSessionDashboardProps {
  className?: string;
}

export function FocusSessionDashboard({ className }: FocusSessionDashboardProps) {
  const { theme, setTheme } = useTheme();
  const { showSuccess, showError, showInfo } = useNotifications();
  const prefersReducedMotion = useReducedMotion();

  // Session state
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'short-break' | 'long-break'>('focus');
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionGoals, setSessionGoals] = useState<SessionGoal[]>([]);
  const [newGoal, setNewGoal] = useState('');

  // Configuration state
  const [presets] = useState<FocusPreset[]>(defaultPresets);
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset>(defaultPresets[0]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Audio state
  const [selectedSound, setSelectedSound] = useState<SoundType>('none');
  const [volume, setVolume] = useState(50);

  // UI state
  const [focusMode, setFocusMode] = useState(false);
  const [breakReminderInterval, setBreakReminderInterval] = useState(20);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    sessionStart: true,
    sessionEnd: true,
    breakReminder: true,
    dailyGoal: true,
    sound: true,
    volume: 70,
  });

  // Mock data state
  const [sessionStats] = useState<SessionStats>({
    todayMinutes: 125,
    todaySessions: 5,
    weeklyMinutes: 890,
    currentStreak: 7,
    averageSession: 32,
    completionRate: 87,
  });

  const [recentSessions] = useState<SessionHistory[]>([
    {
      id: '1',
      type: 'focus',
      duration: 25,
      completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      subject: 'Mathematics',
      task: 'Complete Math Assignment',
      completionRate: 100,
    },
    {
      id: '2',
      type: 'short-break',
      duration: 5,
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completionRate: 100,
    },
    {
      id: '3',
      type: 'focus',
      duration: 90,
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      subject: 'History',
      task: 'Read Chapter 5',
      completionRate: 95,
    },
    {
      id: '4',
      type: 'long-break',
      duration: 15,
      completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      completionRate: 100,
    },
    {
      id: '5',
      type: 'focus',
      duration: 25,
      completedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      subject: 'English',
      completionRate: 80,
    },
  ]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleSessionComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Load session from localStorage on mount
  useEffect(() => {
    loadPersistedSession();
  }, []);

  // Persist session state
  useEffect(() => {
    if (currentSession || timeLeft > 0) {
      const sessionState = {
        currentSession,
        timeLeft,
        isRunning,
        sessionType,
        sessionCount,
        selectedPreset,
        selectedTask,
        selectedSubject,
        sessionGoals,
        timestamp: Date.now(),
      };
      localStorage.setItem('focusSessionState', JSON.stringify(sessionState));
    }
  }, [currentSession, timeLeft, isRunning, sessionType, sessionCount, selectedPreset, selectedTask, selectedSubject, sessionGoals]);

  const loadPersistedSession = () => {
    try {
      const saved = localStorage.getItem('focusSessionState');
      if (saved) {
        const state = JSON.parse(saved);
        const now = Date.now();
        const timeDiff = Math.floor((now - state.timestamp) / 1000);

        // Only restore if less than 1 hour has passed
        if (timeDiff < 3600) {
          setCurrentSession(state.currentSession);
          setTimeLeft(Math.max(0, state.timeLeft - timeDiff));
          setIsRunning(state.isRunning && state.timeLeft - timeDiff > 0);
          setSessionType(state.sessionType);
          setSessionCount(state.sessionCount);
          setSelectedPreset(state.selectedPreset || defaultPresets[0]);
          setSelectedTask(state.selectedTask);
          setSelectedSubject(state.selectedSubject);
          setSessionGoals(state.sessionGoals || []);
        }
      }
    } catch (error) {
      console.error('Failed to load persisted session:', error);
    }
  };

  const handleSessionComplete = async () => {
    setIsRunning(false);

    if (currentSession && notificationSettings.sessionEnd) {
      if (notificationSettings.sound) {
        // Play completion sound
        const audio = new Audio('/sounds/session-complete.mp3');
        audio.volume = notificationSettings.volume / 100;
        audio.play().catch(() => {});
      }
    }

    if (sessionType === 'focus') {
      setSessionCount(prev => prev + 1);
      showSuccess(
        `Great! You completed a ${selectedPreset.focusDuration}-minute focus session.`,
        'Session Complete'
      );

      // Start break
      const nextSession = sessionCount > 0 && (sessionCount + 1) % selectedPreset.sessionsBeforeLongBreak === 0
        ? 'long-break'
        : 'short-break';

      const breakDuration = nextSession === 'long-break'
        ? selectedPreset.longBreakDuration
        : selectedPreset.shortBreakDuration;

      setSessionType(nextSession);
      setTimeLeft(breakDuration * 60);
    } else {
      showInfo('Break time is over! Ready for another focus session?', 'Break Complete');
      setSessionType('focus');
      setTimeLeft(selectedPreset.focusDuration * 60);
    }

    setCurrentSession(null);
  };

  const startTimer = async () => {
    try {
      const sessionData: StartFocusSessionRequest = {
        type: 'pomodoro',
        plannedDuration: sessionType === 'focus'
          ? selectedPreset.focusDuration
          : sessionType === 'short-break'
            ? selectedPreset.shortBreakDuration
            : selectedPreset.longBreakDuration,
        taskId: selectedTask?.id,
        subjectId: selectedSubject?.id,
        presetId: selectedPreset.id,
        targetSessions: selectedPreset.sessionsBeforeLongBreak,
      };

      const session = await focusSessionsApi.startSession(sessionData);
      setCurrentSession(session);
      setIsRunning(true);

      if (notificationSettings.sessionStart) {
        showInfo(`Starting ${sessionType.replace('-', ' ')}...`, 'Timer Started');

        if (notificationSettings.sound) {
          const audio = new Audio('/sounds/session-start.mp3');
          audio.volume = notificationSettings.volume / 100;
          audio.play().catch(() => {});
        }
      }
    } catch (error) {
      showError('Failed to start session', 'Error');
      console.error('Failed to start session:', error);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
    showInfo('Timer paused', 'Paused');
  };

  const resetTimer = () => {
    setIsRunning(false);
    const duration = sessionType === 'focus'
      ? selectedPreset.focusDuration
      : sessionType === 'short-break'
        ? selectedPreset.shortBreakDuration
        : selectedPreset.longBreakDuration;
    setTimeLeft(duration * 60);
    setCurrentSession(null);
    showInfo('Timer reset', 'Reset');
  };

  const stopSession = () => {
    setIsRunning(false);
    setCurrentSession(null);
    setSessionType('focus');
    setTimeLeft(selectedPreset.focusDuration * 60);
    showInfo('Session stopped', 'Stopped');
  };

  const handlePresetSelect = (preset: FocusPreset) => {
    if (!isRunning) {
      setSelectedPreset(preset);
      setTimeLeft(preset.focusDuration * 60);
      setSessionType('focus');
    }
  };

  const handlePresetStart = async (preset: FocusPreset) => {
    setSelectedPreset(preset);
    setTimeLeft(preset.focusDuration * 60);
    setSessionType('focus');
    if (!isRunning) {
      await startTimer();
    }
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      const goal: SessionGoal = {
        id: Date.now().toString(),
        description: newGoal.trim(),
        completed: false,
        createdAt: new Date(),
      };
      setSessionGoals(prev => [...prev, goal]);
      setNewGoal('');
    }
  };

  const toggleGoal = (goalId: string) => {
    setSessionGoals(prev =>
      prev.map(goal =>
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const removeGoal = (goalId: string) => {
    setSessionGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case 'focus':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'short-break':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'long-break':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const totalDuration = sessionType === 'focus'
    ? selectedPreset.focusDuration * 60
    : sessionType === 'short-break'
      ? selectedPreset.shortBreakDuration * 60
      : selectedPreset.longBreakDuration * 60;

  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Focus Session Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive focus management with advanced tracking and analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Focus Mode Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="focus-mode" className="text-sm">Focus Mode</Label>
            <Switch
              id="focus-mode"
              checked={focusMode}
              onCheckedChange={setFocusMode}
            />
            <Minimize2 className="h-4 w-4 text-gray-500" />
          </div>

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Main Dashboard Grid */}
      <div className={`grid gap-6 ${focusMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {/* Active Session Section */}
        <div className={`space-y-6 ${focusMode ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
          {/* Timer Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-8">
                <AccessibleTimer
                  timeLeft={timeLeft}
                  totalDuration={totalDuration}
                  isRunning={isRunning}
                  sessionType={sessionType}
                  onStart={startTimer}
                  onPause={pauseTimer}
                  onStop={stopSession}
                  onReset={resetTimer}
                />

                {/* Session Context */}
                {(selectedTask || selectedSubject) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        Current Focus
                      </span>
                    </div>
                    {selectedTask && (
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        Task: {selectedTask.title}
                      </div>
                    )}
                    {selectedSubject && (
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        Subject: {selectedSubject.name}
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quick Start Presets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {presets.slice(0, 3).map((preset) => (
                  <motion.div
                    key={preset.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant={selectedPreset.id === preset.id ? "default" : "outline"}
                      className="w-full h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => handlePresetStart(preset)}
                      disabled={isRunning}
                    >
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-sm opacity-70">
                        {preset.focusDuration}m focus
                      </span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Background Sounds */}
          {!focusMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Background Sounds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BackgroundSounds
                  selectedSound={selectedSound}
                  volume={volume}
                  onSoundChange={setSelectedSound}
                  onVolumeChange={setVolume}
                  isPlaying={isRunning}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Today's Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatDuration(sessionStats.todayMinutes)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Time
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {sessionStats.todaySessions}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Sessions
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Current Streak</span>
                  </div>
                  <Badge variant="secondary">{sessionStats.currentStreak} days</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Completion Rate</span>
                  </div>
                  <Badge variant="secondary">{sessionStats.completionRate}%</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock4 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Avg Session</span>
                  </div>
                  <Badge variant="secondary">{sessionStats.averageSession}m</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Goals */}
          {!focusMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Session Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a goal for this session..."
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                  />
                  <Button size="sm" onClick={addGoal}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {sessionGoals.map((goal) => (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleGoal(goal.id)}
                        >
                          <CheckCircle
                            className={`h-4 w-4 ${
                              goal.completed
                                ? 'text-green-600'
                                : 'text-gray-400'
                            }`}
                          />
                        </Button>
                        <span
                          className={`text-sm flex-1 ${
                            goal.completed
                              ? 'line-through text-gray-500'
                              : ''
                          }`}
                        >
                          {goal.description}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                          onClick={() => removeGoal(goal.id)}
                        >
                          ×
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task & Subject Selector */}
          <TaskSubjectSelector
            selectedTask={selectedTask}
            selectedSubject={selectedSubject}
            tasks={mockTasks}
            subjects={mockSubjects}
            onTaskSelect={setSelectedTask}
            onSubjectSelect={setSelectedSubject}
          />

          {/* Settings Panel */}
          {!focusMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Quick Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="break-reminder" className="text-sm">
                      Break Reminders
                    </Label>
                    <Switch
                      id="break-reminder"
                      checked={notificationSettings.breakReminder}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({
                          ...prev,
                          breakReminder: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="session-sounds" className="text-sm">
                      Session Sounds
                    </Label>
                    <Switch
                      id="session-sounds"
                      checked={notificationSettings.sound}
                      onCheckedChange={(checked) =>
                        setNotificationSettings(prev => ({
                          ...prev,
                          sound: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Notification Volume</Label>
                    <Slider
                      value={[notificationSettings.volume]}
                      onValueChange={(value) =>
                        setNotificationSettings(prev => ({
                          ...prev,
                          volume: value[0],
                        }))
                      }
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Session History */}
      {!focusMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={getSessionTypeColor(session.type)}>
                      {session.type.replace('-', ' ')}
                    </Badge>
                    <div>
                      <div className="font-medium text-sm">
                        {session.task || `${session.duration}m ${session.type} session`}
                      </div>
                      {session.subject && (
                        <div className="text-xs text-gray-500">
                          {session.subject}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {session.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Intl.DateTimeFormat('en', {
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(session.completedAt)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}