'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Award, Calendar, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  weeklyMinutes: number;
  totalSessions: number;
  lastSessionDate?: string;
}

interface StreakTrackerProps {
  streakData: StreakData;
  goalMinutes?: number;
  onStreakUpdate?: () => void;
  className?: string;
}

const streakMilestones = [
  { days: 3, title: 'Getting Started', emoji: '🌱' },
  { days: 7, title: 'One Week Warrior', emoji: '💪' },
  { days: 14, title: 'Two Week Champion', emoji: '🏆' },
  { days: 30, title: 'Monthly Master', emoji: '👑' },
  { days: 50, title: 'Focus Legend', emoji: '🌟' },
  { days: 100, title: 'Centurion', emoji: '⚡' },
];

export function StreakTracker({
  streakData,
  goalMinutes = 120, // Default 2 hours daily goal
  onStreakUpdate,
  className,
}: StreakTrackerProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastStreakCount, setLastStreakCount] = useState(streakData.currentStreak);

  // Check for streak milestone achievements
  useEffect(() => {
    if (streakData.currentStreak > lastStreakCount) {
      const milestone = streakMilestones.find(
        m => m.days === streakData.currentStreak
      );
      if (milestone) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }
    setLastStreakCount(streakData.currentStreak);
  }, [streakData.currentStreak, lastStreakCount]);

  const progressPercentage = Math.min((streakData.todayMinutes / goalMinutes) * 100, 100);
  const currentMilestone = streakMilestones
    .slice()
    .reverse()
    .find(m => streakData.currentStreak >= m.days);

  const nextMilestone = streakMilestones.find(
    m => m.days > streakData.currentStreak
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Streak Card */}
      <Card className="relative overflow-hidden">
        {/* Celebration Animation */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 z-10 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-6xl"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                🎉
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={
                streakData.currentStreak > 0
                  ? { rotate: [0, 10, -10, 0] }
                  : {}
              }
              transition={{
                repeat: streakData.currentStreak > 0 ? Infinity : 0,
                duration: 2,
                repeatDelay: 3,
              }}
            >
              <Flame className="h-5 w-5 text-orange-500" />
            </motion.div>
            Streak Tracker
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Streak */}
          <div className="text-center">
            <motion.div
              className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2"
              animate={
                streakData.currentStreak > 0
                  ? { scale: [1, 1.1, 1] }
                  : {}
              }
              transition={{
                repeat: streakData.currentStreak > 0 ? Infinity : 0,
                duration: 3,
                repeatDelay: 2,
              }}
            >
              {streakData.currentStreak}
            </motion.div>
            <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {streakData.currentStreak === 1 ? 'Day' : 'Days'} Streak
            </div>
            {currentMilestone && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-2"
              >
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {currentMilestone.emoji} {currentMilestone.title}
                </Badge>
              </motion.div>
            )}
          </div>

          {/* Today's Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Progress
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {streakData.todayMinutes} / {goalMinutes} min
              </span>
            </div>

            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />

              {/* Goal Achievement Sparkle */}
              <AnimatePresence>
                {progressPercentage >= 100 && (
                  <motion.div
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="text-yellow-400"
                    >
                      ⭐
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {progressPercentage >= 100 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-green-600 dark:text-green-400 font-medium text-sm"
              >
                🎯 Daily goal achieved!
              </motion.div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {streakData.longestStreak}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Best Streak
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {streakData.weeklyMinutes}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                This Week
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {streakData.totalSessions}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Total Sessions
              </div>
            </motion.div>
          </div>

          {/* Next Milestone */}
          {nextMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg"
            >
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Next Milestone
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                {nextMilestone.emoji} {nextMilestone.title}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {nextMilestone.days - streakData.currentStreak} more{' '}
                {nextMilestone.days - streakData.currentStreak === 1 ? 'day' : 'days'} to go!
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}