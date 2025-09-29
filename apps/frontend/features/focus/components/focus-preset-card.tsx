'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Timer, Edit, Trash2, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FocusPreset {
  id: string;
  name: string;
  focusDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsBeforeLongBreak: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  isDefault?: boolean;
}

interface FocusPresetCardProps {
  preset: FocusPreset;
  isSelected?: boolean;
  isActive?: boolean;
  onSelect: (preset: FocusPreset) => void;
  onEdit: (preset: FocusPreset) => void;
  onDelete: (preset: FocusPreset) => void;
  onStart: (preset: FocusPreset) => void;
  className?: string;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    accent: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    accent: 'bg-green-500',
    text: 'text-green-700 dark:text-green-300',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
    accent: 'bg-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-200 dark:border-orange-800',
    accent: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    accent: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
};

export function FocusPresetCard({
  preset,
  isSelected = false,
  isActive = false,
  onSelect,
  onEdit,
  onDelete,
  onStart,
  className,
}: FocusPresetCardProps) {
  const colors = colorMap[preset.color];

  return (
    <motion.div
      className={className}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 relative overflow-hidden',
          colors.bg,
          colors.border,
          isSelected && 'ring-2 ring-blue-500 ring-offset-2',
          isActive && 'ring-2 ring-green-500 ring-offset-2'
        )}
        onClick={() => onSelect(preset)}
      >
        {/* Accent Bar */}
        <div className={cn('h-1 w-full', colors.accent)} />

        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', colors.accent)}>
                <Timer className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {preset.name}
                </h3>
                {preset.isDefault && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Default
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStart(preset);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </motion.div>

              {!preset.isDefault && (
                <>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(preset);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(preset);
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </>
              )}
            </div>
          </div>

          {/* Timer Details */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {preset.focusDuration}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Focus mins
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {preset.shortBreakDuration}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Break mins
              </div>
            </div>
          </div>

          {/* Long Break Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Long break:</span>
            <Badge className={colors.badge}>
              {preset.longBreakDuration}min after {preset.sessionsBeforeLongBreak} sessions
            </Badge>
          </div>

          {/* Active Indicator */}
          {isActive && (
            <motion.div
              className="absolute top-4 right-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}