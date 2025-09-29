'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, RotateCcw, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CircularProgress } from './circular-progress';
import { cn } from '@/lib/utils';

interface AnimatedTimerProps {
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

export function AnimatedTimer({
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
}: AnimatedTimerProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  // Blink animation when time is running low (last 5% of time)
  useEffect(() => {
    const shouldBlink = timeLeft / totalDuration < 0.05 && timeLeft > 0 && isRunning;
    setIsBlinking(shouldBlink);
  }, [timeLeft, totalDuration, isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExtend = (minutes: number) => {
    if (onExtend) {
      onExtend(minutes);
    }
  };

  return (
    <div className={cn('flex flex-col items-center space-y-8', className)}>
      {/* Circular Timer */}
      <motion.div
        className="relative"
        animate={isBlinking ? { scale: [1, 1.05, 1] } : {}}
        transition={{
          repeat: isBlinking ? Infinity : 0,
          duration: 1,
          ease: "easeInOut"
        }}
      >
        <CircularProgress
          progress={progress}
          size={280}
          strokeWidth={12}
          color={sessionColors[sessionType]}
          animated={true}
        >
          <div className="text-center">
            {/* Time Display */}
            <motion.div
              className="text-5xl font-mono font-bold text-gray-900 dark:text-white mb-2"
              animate={isBlinking ? { opacity: [1, 0.5, 1] } : {}}
              transition={{
                repeat: isBlinking ? Infinity : 0,
                duration: 1,
                ease: "easeInOut"
              }}
            >
              {formatTime(timeLeft)}
            </motion.div>

            {/* Session Type */}
            <motion.div
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r text-white',
                sessionGradients[sessionType]
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {sessionType.replace('-', ' ').toUpperCase()}
            </motion.div>
          </div>
        </CircularProgress>

        {/* Pulse Effect when Running */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full border-2 opacity-30',
                sessionType === 'focus' ? 'border-blue-500' :
                sessionType === 'short-break' ? 'border-green-500' :
                'border-orange-500'
              )}
              initial={{ scale: 1, opacity: 0.3 }}
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

      {/* Controls */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {/* Primary Action Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {!isRunning ? (
            <Button
              onClick={onStart}
              size="lg"
              className="px-8 py-3 text-lg font-medium"
            >
              <Play className="h-6 w-6 mr-2" />
              Start
            </Button>
          ) : (
            <Button
              onClick={onPause}
              size="lg"
              variant="outline"
              className="px-8 py-3 text-lg font-medium"
            >
              <Pause className="h-6 w-6 mr-2" />
              Pause
            </Button>
          )}
        </motion.div>

        {/* Secondary Controls */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button onClick={onReset} size="lg" variant="outline">
            <RotateCcw className="h-5 w-5 mr-2" />
            Reset
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button onClick={onStop} size="lg" variant="destructive">
            <Square className="h-5 w-5 mr-2" />
            Stop
          </Button>
        </motion.div>
      </motion.div>

      {/* Time Extension Controls */}
      {onExtend && isRunning && (
        <motion.div
          className="flex items-center gap-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="text-sm text-gray-600 dark:text-gray-400 mr-3">
            Extend session:
          </span>

          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExtend(5)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>

          <span className="text-sm font-medium min-w-[40px] text-center">
            5min
          </span>

          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExtend(10)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>

          <span className="text-sm font-medium min-w-[40px] text-center">
            10min
          </span>
        </motion.div>
      )}
    </div>
  );
}