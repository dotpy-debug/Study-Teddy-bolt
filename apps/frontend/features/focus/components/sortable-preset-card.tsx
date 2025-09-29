'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Star, Clock, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FocusPresetCard } from './focus-preset-card';
import { FocusPreset, DEFAULT_PRESET_COLORS } from '../types/preset';
import { format } from 'date-fns';

interface SortablePresetCardProps {
  preset: FocusPreset;
  isSelected?: boolean;
  isActive?: boolean;
  onSelect: (preset: FocusPreset) => void;
  onEdit: (preset: FocusPreset) => void;
  onDelete: (preset: FocusPreset) => void;
  onStart: (preset: FocusPreset) => void;
  onToggleFavorite: (preset: FocusPreset) => void;
  viewMode?: 'grid' | 'list';
  showStats?: boolean;
  isDragDisabled?: boolean;
}

export function SortablePresetCard({
  preset,
  isSelected = false,
  isActive = false,
  onSelect,
  onEdit,
  onDelete,
  onStart,
  onToggleFavorite,
  viewMode = 'grid',
  showStats = false,
  isDragDisabled = false,
}: SortablePresetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: preset.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colors = DEFAULT_PRESET_COLORS[preset.color];

  if (viewMode === 'list') {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
          colors.bg,
          colors.border,
          isSelected && 'ring-2 ring-blue-500 ring-offset-2',
          isActive && 'ring-2 ring-green-500 ring-offset-2',
          isDragging && 'opacity-50 shadow-lg z-50',
          'cursor-pointer hover:shadow-md'
        )}
        onClick={() => onSelect(preset)}
      >
        {/* Drag Handle */}
        {!isDragDisabled && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Color Indicator */}
        <div className={cn('w-1 h-12 rounded-full', colors.accent)} />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {preset.name}
            </h3>
            {preset.isFavorite && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            )}
            {preset.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {preset.category}
            </Badge>
          </div>

          {preset.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
              {preset.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Focus: {preset.focusDuration}m</span>
            <span>Break: {preset.shortBreakDuration}m</span>
            <span>Long: {preset.longBreakDuration}m</span>
            {showStats && (
              <>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {preset.usageCount} uses
                </span>
                {preset.lastUsedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(preset.lastUsedAt, 'MMM d')}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(preset);
            }}
            className="h-8 w-8 p-0"
          >
            <Star
              className={cn(
                'h-4 w-4',
                preset.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'
              )}
            />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onStart(preset);
            }}
            className="h-8 w-8 p-0"
          >
            <Clock className="h-4 w-4" />
          </Button>

          {!preset.isDefault && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(preset);
                }}
                className="h-8 w-8 p-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(preset);
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </>
          )}
        </div>

        {/* Active Indicator */}
        {isActive && (
          <motion.div
            className="absolute top-2 right-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Grid view - enhanced version of the original card
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      {/* Drag Handle - only show on hover */}
      {!isDragDisabled && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'absolute top-2 left-2 z-10 cursor-grab hover:cursor-grabbing',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'p-1 rounded bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm'
          )}
        >
          <GripVertical className="h-4 w-4 text-gray-600" />
        </div>
      )}

      {/* Enhanced FocusPresetCard */}
      <div className="group">
        <FocusPresetCard
          preset={preset}
          isSelected={isSelected}
          isActive={isActive}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onStart={onStart}
        />

        {/* Additional overlay content */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {preset.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}

          {showStats && preset.usageCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {preset.usageCount}
            </Badge>
          )}
        </div>

        {/* Favorite toggle overlay */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(preset);
          }}
          className={cn(
            'absolute bottom-2 right-2 h-8 w-8 p-0',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm'
          )}
        >
          <Star
            className={cn(
              'h-4 w-4',
              preset.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'
            )}
          />
        </Button>
      </div>
    </motion.div>
  );
}