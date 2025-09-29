'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, RotateCcw, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CircularProgress } from './circular-progress';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

interface AccessibleTimerProps {
  timeLeft: number; // in seconds
  totalDuration: number; // in seconds
  isRunning: boolean;
  sessionType: 'focus' | 'short-break' | 'long-break';
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onExtend?: (minutes: number) => void;
  className?: string;
}

const sessionColors = {
  focus: 'primary' as const,
  'short-break': 'success' as const,
  'long-break': 'warning' as const,
};

const sessionGradients = {
  focus: 'from-blue-500 to-blue-600',
  'short-break': 'from-green-500 to-green-600',
  'long-break': 'from-orange-500 to-orange-600',
};

export function AccessibleTimer({
  timeLeft,
  totalDuration,
  isRunning,
  sessionType,
  onStart,
  onPause,
  onStop,
  onReset,
  onExtend,
  className,
}: AccessibleTimerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [announceTime, setAnnounceTime] = useState(false);
  const [lastMinute, setLastMinute] = useState(Math.floor(timeLeft / 60));

  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Announce time changes for screen readers
  useEffect(() => {
    const currentMinute = Math.floor(timeLeft / 60);

    // Announce every minute change
    if (currentMinute !== lastMinute && isRunning) {
      setAnnounceTime(true);
      setLastMinute(currentMinute);

      // Clear announcement after a short delay
      setTimeout(() => setAnnounceTime(false), 100);
    }
  }, [timeLeft, lastMinute, isRunning]);

  // Blink animation when time is running low (last 5% of time) - but respect reduced motion
  const shouldBlink = timeLeft / totalDuration < 0.05 && timeLeft > 0 && isRunning && !prefersReducedMotion;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeForAnnouncement = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) {
      return `${secs} seconds remaining`;
    } else if (secs === 0) {
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'} remaining`;
    } else {
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'} and ${secs} seconds remaining`;
    }
  };

  const handleExtend = (minutes: number) => {
    if (onExtend) {
      onExtend(minutes);
    }
  };

  const getSessionTypeForAnnouncement = () => {
    switch (sessionType) {
      case 'focus':
        return 'focus session';
      case 'short-break':
        return 'short break';
      case 'long-break':
        return 'long break';
    }
  };

  return (
    <div className={cn('flex flex-col items-center space-y-8', className)}>
      {/* Screen reader announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {announceTime && `${formatTimeForAnnouncement(timeLeft)} in ${getSessionTypeForAnnouncement()}`}
      </div>

      {/* Timer status for screen readers */}
      <div className="sr-only" aria-live="polite">
        {isRunning ? `Timer is running` : `Timer is paused`}
      </div>

      {/* Circular Timer */}
      <div className="relative">
        <motion.div
          animate={shouldBlink ? { scale: [1, 1.05, 1] } : {}}
          transition={{
            repeat: shouldBlink ? Infinity : 0,
            duration: 1,
            ease: "easeInOut"
          }}
        >
          <CircularProgress
            progress={progress}
            size={280}
            strokeWidth={12}
            color={sessionColors[sessionType]}
            animated={!prefersReducedMotion}
          >
            <div className="text-center">
              {/* Time Display */}
              <div
                className={cn(
                  "text-5xl font-mono font-bold text-gray-900 dark:text-white mb-2",
                  shouldBlink && "animate-pulse"
                )}
                aria-label={formatTimeForAnnouncement(timeLeft)}
                role="timer"
                aria-live="off" // We handle announcements manually above
              >
                {formatTime(timeLeft)}
              </div>

              {/* Session Type */}
              <div
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r text-white',
                  sessionGradients[sessionType]
                )}
                role="status"
                aria-label={`Current session type: ${getSessionTypeForAnnouncement()}`}
              >
                {sessionType.replace('-', ' ').toUpperCase()}
              </div>
            </div>
          </CircularProgress>
        </motion.div>

        {/* Low time warning for screen readers */}
        {timeLeft <= 60 && timeLeft > 0 && isRunning && (
          <div className="sr-only" aria-live="assertive" role="alert">
            Warning: Less than one minute remaining
          </div>
        )}

        {/* Session complete announcement */}
        {timeLeft === 0 && (
          <div className="sr-only" aria-live="assertive" role="alert">
            {getSessionTypeForAnnouncement()} completed
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4" role="group" aria-label="Timer controls">
        {/* Primary Action Button */}
        {!isRunning ? (
          <Button
            onClick={onStart}
            size="lg"
            className="px-8 py-3 text-lg font-medium"
            aria-label={`Start ${getSessionTypeForAnnouncement()}`}
          >
            <Play className="h-6 w-6 mr-2" aria-hidden="true" />
            Start
          </Button>
        ) : (
          <Button
            onClick={onPause}
            size="lg"
            variant="outline"
            className="px-8 py-3 text-lg font-medium"
            aria-label={`Pause ${getSessionTypeForAnnouncement()}`}
          >
            <Pause className="h-6 w-6 mr-2" aria-hidden="true" />
            Pause
          </Button>
        )}

        {/* Secondary Controls */}
        <Button
          onClick={onReset}
          size="lg"
          variant="outline"
          aria-label={`Reset ${getSessionTypeForAnnouncement()} timer`}
        >
          <RotateCcw className="h-5 w-5 mr-2" aria-hidden="true" />
          Reset
        </Button>

        <Button
          onClick={onStop}
          size="lg"
          variant="destructive"
          aria-label={`Stop ${getSessionTypeForAnnouncement()}`}
        >
          <Square className="h-5 w-5 mr-2" aria-hidden="true" />
          Stop
        </Button>
      </div>

      {/* Time Extension Controls */}
      {onExtend && isRunning && (
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Extend session time"
        >
          <span className="text-sm text-gray-600 dark:text-gray-400 mr-3">
            Extend session:
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExtend(5)}
            className="h-8 px-3"
            aria-label="Extend session by 5 minutes"
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            5min
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExtend(10)}
            className="h-8 px-3"
            aria-label="Extend session by 10 minutes"
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            10min
          </Button>
        </div>
      )}

      {/* Progress description for screen readers */}
      <div className="sr-only" aria-live="polite">
        {Math.round(progress)}% of {getSessionTypeForAnnouncement()} completed
      </div>
    </div>
  );
}