'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Clock,
  Target,
  Coffee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CircularProgress } from './circular-progress';
import { cn } from '@/lib/utils';
import {
  useActiveSession,
  usePomodoroSession,
  usePauseSession,
  useResumeSession,
  useEndSession,
  useCompletePomodoroPhase
} from '@/hooks/queries/use-focus-sessions';

// Types
interface FocusTimerProps {
  className?: string;
  onPhaseComplete?: (phase: PomodoroPhase) => void;
  onSessionComplete?: () => void;
  enableSounds?: boolean;
  showMinimized?: boolean;
}

interface PomodoroPhase {
  type: 'work' | 'short_break' | 'long_break';
  duration: number; // in minutes
  label: string;
}

interface TimerState {
  timeLeft: number; // in seconds
  isRunning: boolean;
  currentPhase: PomodoroPhase;
  sessionProgress: {
    current: number;
    total: number;
    pomodorosCompleted: number;
  };
}

// Phase definitions
const PHASES: Record<string, PomodoroPhase> = {
  work: { type: 'work', duration: 25, label: 'Focus Time' },
  short_break: { type: 'short_break', duration: 5, label: 'Short Break' },
  long_break: { type: 'long_break', duration: 15, label: 'Long Break' },
};

// Color schemes for different phases
const PHASE_COLORS = {
  work: {
    primary: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    progress: 'primary' as const,
  },
  short_break: {
    primary: 'green',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    progress: 'success' as const,
  },
  long_break: {
    primary: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    progress: 'warning' as const,
  },
};

// Phase icons
const PHASE_ICONS = {
  work: Clock,
  short_break: Coffee,
  long_break: Target,
};

export function FocusTimer({
  className,
  onPhaseComplete,
  onSessionComplete,
  enableSounds = true,
  showMinimized = false,
}: FocusTimerProps) {
  // State
  const [isMinimized, setIsMinimized] = useState(showMinimized);
  const [soundEnabled, setSoundEnabled] = useState(enableSounds);
  const [timerState, setTimerState] = useState<TimerState>({
    timeLeft: PHASES.work.duration * 60,
    isRunning: false,
    currentPhase: PHASES.work,
    sessionProgress: { current: 1, total: 4, pomodorosCompleted: 0 },
  });

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Queries and mutations
  const { data: activeSession, isLoading: loadingSession } = useActiveSession();
  const { data: pomodoroSession } = usePomodoroSession(
    activeSession?.id || '',
    !!activeSession?.id && activeSession?.type === 'pomodoro'
  );

  const pauseSessionMutation = usePauseSession();
  const resumeSessionMutation = useResumeSession();
  const endSessionMutation = useEndSession();
  const completePhaseMutation = useCompletePomodoroPhase();

  // Update timer state based on session data
  useEffect(() => {
    if (pomodoroSession && activeSession) {
      const phase = PHASES[pomodoroSession.phase];
      const phaseEndTime = new Date(pomodoroSession.expectedEndTime).getTime();
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((phaseEndTime - now) / 1000));

      setTimerState({
        timeLeft,
        isRunning: activeSession.status === 'active',
        currentPhase: phase,
        sessionProgress: {
          current: pomodoroSession.currentCycle,
          total: 4, // Default pomodoro cycle
          pomodorosCompleted: pomodoroSession.pomodorosCompleted,
        },
      });
    }
  }, [pomodoroSession, activeSession]);

  // Timer interval effect
  useEffect(() => {
    if (timerState.isRunning && timerState.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => {
          const newTimeLeft = prev.timeLeft - 1;

          // Handle phase completion
          if (newTimeLeft <= 0) {
            handlePhaseComplete();
            return prev;
          }

          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.timeLeft]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          toggleTimer();
          break;
        case 'Escape':
          event.preventDefault();
          handleStop();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [timerState.isRunning]);

  // Sound notification
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, [soundEnabled]);

  // Handler functions
  const toggleTimer = useCallback(async () => {
    if (!activeSession) return;

    try {
      if (timerState.isRunning) {
        await pauseSessionMutation.mutateAsync(activeSession.id);
        setTimerState(prev => ({ ...prev, isRunning: false }));
      } else {
        await resumeSessionMutation.mutateAsync(activeSession.id);
        setTimerState(prev => ({ ...prev, isRunning: true }));
      }
    } catch (error) {
      console.error('Error toggling timer:', error);
    }
  }, [activeSession, timerState.isRunning, pauseSessionMutation, resumeSessionMutation]);

  const handleStop = useCallback(async () => {
    if (!activeSession) return;

    try {
      await endSessionMutation.mutateAsync(activeSession.id);
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        timeLeft: PHASES.work.duration * 60,
        currentPhase: PHASES.work,
      }));
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  }, [activeSession, endSessionMutation]);

  const handleSkipPhase = useCallback(async () => {
    if (!activeSession) return;

    try {
      await completePhaseMutation.mutateAsync(activeSession.id);
      playNotificationSound();
      onPhaseComplete?.(timerState.currentPhase);
    } catch (error) {
      console.error('Error skipping phase:', error);
    }
  }, [activeSession, completePhaseMutation, timerState.currentPhase, playNotificationSound, onPhaseComplete]);

  const handlePhaseComplete = useCallback(async () => {
    if (!activeSession) return;

    try {
      playNotificationSound();
      onPhaseComplete?.(timerState.currentPhase);

      // Complete current phase
      await completePhaseMutation.mutateAsync(activeSession.id);

      // Check if session is complete
      if (timerState.sessionProgress.current >= timerState.sessionProgress.total) {
        onSessionComplete?.();
      }
    } catch (error) {
      console.error('Error completing phase:', error);
    }
  }, [activeSession, timerState.currentPhase, timerState.sessionProgress, completePhaseMutation, playNotificationSound, onPhaseComplete, onSessionComplete]);

  // Utility functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    const totalSeconds = timerState.currentPhase.duration * 60;
    return ((totalSeconds - timerState.timeLeft) / totalSeconds) * 100;
  };

  const colors = PHASE_COLORS[timerState.currentPhase.type];
  const PhaseIcon = PHASE_ICONS[timerState.currentPhase.type];

  // Loading state
  if (loadingSession) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No active session state
  if (!activeSession || activeSession.type !== 'pomodoro') {
    return (
      <div className={cn('text-center p-8', className)}>
        <p className="text-muted-foreground">
          No active Pomodoro session. Start a new session to use the timer.
        </p>
      </div>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <motion.div
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border',
          colors.bg,
          colors.border,
          className
        )}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <PhaseIcon className={cn('h-5 w-5', colors.text)} />
          <span className={cn('font-medium', colors.text)}>
            {timerState.currentPhase.label}
          </span>
        </div>

        <div className="font-mono text-2xl font-bold">
          {formatTime(timerState.timeLeft)}
        </div>

        <Progress
          value={getProgress()}
          className="flex-1 max-w-32"
        />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTimer}
            disabled={pauseSessionMutation.isPending || resumeSessionMutation.isPending}
          >
            {timerState.isRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Full view
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center space-y-8 p-8 rounded-xl border transition-all duration-500',
        colors.bg,
        colors.border,
        className
      )}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md">
        <motion.div
          className="flex items-center gap-3"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <PhaseIcon className={cn('h-6 w-6', colors.text)} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{timerState.currentPhase.label}</h2>
            <p className="text-sm text-muted-foreground">
              Session {timerState.sessionProgress.current} of {timerState.sessionProgress.total}
            </p>
          </div>
        </motion.div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Circular Timer */}
      <motion.div
        className="relative"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <CircularProgress
          progress={getProgress()}
          size={320}
          strokeWidth={16}
          color={colors.progress}
          animated={true}
        >
          <div className="text-center">
            {/* Time Display */}
            <motion.div
              className="text-6xl font-mono font-bold mb-4"
              animate={
                timerState.timeLeft <= 60 && timerState.isRunning
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={{
                repeat: timerState.timeLeft <= 60 && timerState.isRunning ? Infinity : 0,
                duration: 1,
                ease: "easeInOut"
              }}
            >
              {formatTime(timerState.timeLeft)}
            </motion.div>

            {/* Phase Badge */}
            <motion.div
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r text-white shadow-lg',
                colors.gradient
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {timerState.currentPhase.label}
            </motion.div>
          </div>
        </CircularProgress>

        {/* Pulse Effect when Running */}
        <AnimatePresence>
          {timerState.isRunning && (
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full border-4 opacity-20',
                `border-${colors.primary}-500`
              )}
              initial={{ scale: 1, opacity: 0.2 }}
              animate={{ scale: 1.1, opacity: 0 }}
              exit={{ scale: 1, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Session Progress */}
      <motion.div
        className="w-full max-w-md"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Session Progress</span>
          <span className="text-sm text-muted-foreground">
            {timerState.sessionProgress.pomodorosCompleted} Pomodoros completed
          </span>
        </div>
        <Progress
          value={(timerState.sessionProgress.current / timerState.sessionProgress.total) * 100}
          className="h-2"
        />
      </motion.div>

      {/* Controls */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        {/* Primary Action Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={toggleTimer}
            size="lg"
            variant={timerState.isRunning ? "outline" : "default"}
            className="px-8 py-3 text-lg font-medium"
            disabled={pauseSessionMutation.isPending || resumeSessionMutation.isPending}
          >
            {timerState.isRunning ? (
              <Pause className="h-6 w-6 mr-2" />
            ) : (
              <Play className="h-6 w-6 mr-2" />
            )}
            {timerState.isRunning ? 'Pause' : 'Start'}
          </Button>
        </motion.div>

        {/* Skip Phase Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleSkipPhase}
            size="lg"
            variant="outline"
            disabled={completePhaseMutation.isPending}
          >
            <SkipForward className="h-5 w-5 mr-2" />
            Skip Phase
          </Button>
        </motion.div>

        {/* Stop Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={handleStop}
            size="lg"
            variant="destructive"
            disabled={endSessionMutation.isPending}
          >
            <Square className="h-5 w-5 mr-2" />
            Stop
          </Button>
        </motion.div>
      </motion.div>

      {/* Keyboard Shortcuts Info */}
      <motion.div
        className="text-xs text-muted-foreground text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Press <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 rounded">Space</kbd> to play/pause,
        <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 rounded ml-1">Esc</kbd> to stop
      </motion.div>
    </motion.div>
  );
}