'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Calendar, History, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/contexts/notification-context';
import { useRouter } from 'next/navigation';

// Import all focus components
import { AnimatedTimer } from './animated-timer';
import { AccessibleTimer } from './accessible-timer';
import { FocusPreset, FocusPresetCard } from './focus-preset-card';
import { PresetEditorDialog } from './preset-editor-dialog';
import { BackgroundSounds, SoundType } from './background-sounds';
import { TaskSubjectSelector } from './task-subject-selector';
import { StreakTracker } from './streak-tracker';
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

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  weeklyMinutes: number;
  totalSessions: number;
  lastSessionDate?: string;
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

// Mock data - replace with real API calls
const mockTasks: Task[] = [
  { id: '1', title: 'Complete Math Assignment', subject: 'Mathematics', priority: 'high', estimatedMinutes: 60 },
  { id: '2', title: 'Read Chapter 5', subject: 'History', priority: 'medium', estimatedMinutes: 45 },
  { id: '3', title: 'Write Essay Introduction', subject: 'English', priority: 'high', estimatedMinutes: 30 },
];

const mockSubjects: Subject[] = [
  { id: '1', name: 'Mathematics', color: '#3b82f6' },
  { id: '2', name: 'History', color: '#ef4444' },
  { id: '3', name: 'English', color: '#10b981' },
  { id: '4', name: 'Science', color: '#f59e0b' },
];

export function EnhancedFocusPage() {
  const { showSuccess, showError, showInfo } = useNotifications();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Session state
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'short-break' | 'long-break'>('focus');
  const [sessionCount, setSessionCount] = useState(0);

  // Configuration state
  const [presets, setPresets] = useState<FocusPreset[]>(defaultPresets);
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset>(defaultPresets[0]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Audio state
  const [selectedSound, setSelectedSound] = useState<SoundType>('none');
  const [volume, setVolume] = useState(50);

  // UI state
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<FocusPreset | null>(null);
  const [activeTab, setActiveTab] = useState('timer');

  // Mock streak data
  const [streakData] = useState<StreakData>({
    currentStreak: 7,
    longestStreak: 21,
    todayMinutes: 85,
    weeklyMinutes: 420,
    totalSessions: 156,
    lastSessionDate: new Date().toISOString(),
  });

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

  // Load current session on mount
  useEffect(() => {
    loadCurrentSession();
  }, []);

  const loadCurrentSession = async () => {
    try {
      const session = await focusSessionsApi.getCurrentSession();
      if (session) {
        setCurrentSession(session);
        // Calculate time left based on session data
        const now = new Date();
        const startTime = new Date(session.startedAt || session.createdAt);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const remaining = Math.max(0, (session.plannedDuration * 60) - elapsed);
        setTimeLeft(remaining);
        setIsRunning(session.status === 'active');
      }
    } catch (error) {
      console.error('Failed to load current session:', error);
    }
  };

  const handleSessionComplete = async () => {
    setIsRunning(false);

    if (currentSession) {
      try {
        await focusSessionsApi.stopSession({
          sessionId: currentSession.id,
          completionReason: 'completed',
          effectiveMinutes: selectedPreset.focusDuration,
        });
      } catch (error) {
        console.error('Failed to stop session:', error);
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
      showInfo(`Starting ${sessionType.replace('-', ' ')}...`, 'Timer Started');
    } catch (error) {
      showError('Failed to start session', 'Error');
      console.error('Failed to start session:', error);
    }
  };

  const pauseTimer = async () => {
    if (currentSession) {
      try {
        await focusSessionsApi.pauseSession(currentSession.id);
        setIsRunning(false);
        showInfo('Timer paused', 'Paused');
      } catch (error) {
        console.error('Failed to pause session:', error);
      }
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    const duration = sessionType === 'focus'
      ? selectedPreset.focusDuration
      : sessionType === 'short-break'
        ? selectedPreset.shortBreakDuration
        : selectedPreset.longBreakDuration;
    setTimeLeft(duration * 60);
    showInfo('Timer reset', 'Reset');
  };

  const stopSession = async () => {
    if (currentSession) {
      try {
        await focusSessionsApi.stopSession({
          sessionId: currentSession.id,
          completionReason: 'interrupted',
        });
      } catch (error) {
        console.error('Failed to stop session:', error);
      }
    }

    setIsRunning(false);
    setCurrentSession(null);
    setSessionType('focus');
    setTimeLeft(selectedPreset.focusDuration * 60);
    showInfo('Session stopped', 'Stopped');
  };

  const extendSession = async (minutes: number) => {
    if (currentSession) {
      try {
        await focusSessionsApi.extendSession(currentSession.id, minutes);
        setTimeLeft(prev => prev + (minutes * 60));
        showSuccess(`Session extended by ${minutes} minutes`, 'Extended');
      } catch (error) {
        showError('Failed to extend session', 'Error');
        console.error('Failed to extend session:', error);
      }
    }
  };

  const handlePresetSelect = (preset: FocusPreset) => {
    if (!isRunning) {
      setSelectedPreset(preset);
      setTimeLeft(preset.focusDuration * 60);
      setSessionType('focus');
    }
  };

  const handlePresetStart = (preset: FocusPreset) => {
    setSelectedPreset(preset);
    setTimeLeft(preset.focusDuration * 60);
    setSessionType('focus');
    if (!isRunning) {
      startTimer();
    }
  };

  const handlePresetSave = (presetData: Omit<FocusPreset, 'id' | 'isDefault'>) => {
    if (editingPreset) {
      // Update existing preset
      setPresets(prev => prev.map(p =>
        p.id === editingPreset.id
          ? { ...p, ...presetData }
          : p
      ));
      showSuccess('Preset updated successfully', 'Updated');
    } else {
      // Create new preset
      const newPreset: FocusPreset = {
        ...presetData,
        id: Date.now().toString(),
        isDefault: false,
      };
      setPresets(prev => [...prev, newPreset]);
      showSuccess('Preset created successfully', 'Created');
    }
    setEditingPreset(null);
  };

  const handlePresetEdit = (preset: FocusPreset) => {
    setEditingPreset(preset);
    setPresetDialogOpen(true);
  };

  const handlePresetDelete = (preset: FocusPreset) => {
    if (!preset.isDefault) {
      setPresets(prev => prev.filter(p => p.id !== preset.id));
      showSuccess('Preset deleted', 'Deleted');
    }
  };

  const totalDuration = sessionType === 'focus'
    ? selectedPreset.focusDuration * 60
    : sessionType === 'short-break'
      ? selectedPreset.shortBreakDuration * 60
      : selectedPreset.longBreakDuration * 60;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Focus Sessions
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Boost your productivity with timed study blocks and advanced features
        </p>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="timer" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Timer */}
            <div className="lg:col-span-2">
              <motion.div
                initial={!prefersReducedMotion ? { opacity: 0, scale: 0.95 } : {}}
                animate={{ opacity: 1, scale: 1 }}
                transition={!prefersReducedMotion ? { duration: 0.3 } : { duration: 0 }}
              >
                {prefersReducedMotion ? (
                  <AccessibleTimer
                    timeLeft={timeLeft}
                    totalDuration={totalDuration}
                    isRunning={isRunning}
                    sessionType={sessionType}
                    onStart={startTimer}
                    onPause={pauseTimer}
                    onStop={stopSession}
                    onReset={resetTimer}
                    onExtend={extendSession}
                    className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border"
                  />
                ) : (
                  <AnimatedTimer
                    timeLeft={timeLeft}
                    totalDuration={totalDuration}
                    isRunning={isRunning}
                    sessionType={sessionType}
                    onStart={startTimer}
                    onPause={pauseTimer}
                    onStop={stopSession}
                    onReset={resetTimer}
                    onExtend={extendSession}
                    className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border"
                  />
                )}
              </motion.div>

              {/* Background Sounds */}
              <motion.div
                initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={!prefersReducedMotion ? { delay: 0.2 } : { duration: 0 }}
                className="mt-6"
              >
                <BackgroundSounds
                  selectedSound={selectedSound}
                  volume={volume}
                  onSoundChange={setSelectedSound}
                  onVolumeChange={setVolume}
                  isPlaying={isRunning}
                />
              </motion.div>
            </div>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Task/Subject Selector */}
              <motion.div
                initial={!prefersReducedMotion ? { opacity: 0, x: 20 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={!prefersReducedMotion ? { delay: 0.1 } : { duration: 0 }}
              >
                <TaskSubjectSelector
                  selectedTask={selectedTask}
                  selectedSubject={selectedSubject}
                  tasks={mockTasks}
                  subjects={mockSubjects}
                  onTaskSelect={setSelectedTask}
                  onSubjectSelect={setSelectedSubject}
                />
              </motion.div>

              {/* Streak Tracker */}
              <motion.div
                initial={!prefersReducedMotion ? { opacity: 0, x: 20 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={!prefersReducedMotion ? { delay: 0.2 } : { duration: 0 }}
              >
                <StreakTracker streakData={streakData} />
              </motion.div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="presets" className="space-y-6">
          {/* Preset Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Focus Presets</h2>
            <Button
              onClick={() => {
                setEditingPreset(null);
                setPresetDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Preset
            </Button>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presets.map((preset, index) => (
              <motion.div
                key={preset.id}
                initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={!prefersReducedMotion ? { delay: index * 0.1 } : { duration: 0 }}
              >
                <FocusPresetCard
                  preset={preset}
                  isSelected={selectedPreset.id === preset.id}
                  isActive={currentSession?.presetId === preset.id && isRunning}
                  onSelect={handlePresetSelect}
                  onEdit={handlePresetEdit}
                  onDelete={handlePresetDelete}
                  onStart={handlePresetStart}
                />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Statistics Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Detailed analytics and insights about your focus sessions
            </p>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Session History
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              View your past focus sessions and performance
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/focus/schedule')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule New Session
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preset Editor Dialog */}
      <PresetEditorDialog
        open={presetDialogOpen}
        onOpenChange={setPresetDialogOpen}
        preset={editingPreset}
        onSave={handlePresetSave}
      />
    </div>
  );
}