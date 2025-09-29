'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type TeddyMood = 'idle' | 'happy' | 'thinking' | 'encouraging' | 'celebrating' | 'concerned' | 'sleeping';

interface TeddyAssistantProps {
  mood?: TeddyMood;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
  showBubble?: boolean;
  animate?: boolean;
}

const moodEmojis: Record<TeddyMood, string> = {
  idle: '🧸',
  happy: '😊',
  thinking: '🤔',
  encouraging: '💪',
  celebrating: '🎉',
  concerned: '😟',
  sleeping: '😴'
};

const moodColors: Record<TeddyMood, string> = {
  idle: 'from-amber-200 to-amber-300',
  happy: 'from-yellow-200 to-yellow-300',
  thinking: 'from-blue-200 to-blue-300',
  encouraging: 'from-green-200 to-green-300',
  celebrating: 'from-purple-200 to-pink-300',
  concerned: 'from-gray-200 to-gray-300',
  sleeping: 'from-indigo-200 to-indigo-300'
};

const sizeClasses = {
  small: 'w-10 h-10 text-2xl',
  medium: 'w-20 h-20 text-5xl',
  large: 'w-32 h-32 text-7xl'
};

const bubbleSizeClasses = {
  small: 'text-xs px-2 py-1',
  medium: 'text-sm px-3 py-2',
  large: 'text-base px-4 py-2'
};

export function TeddyAssistant({
  mood = 'idle',
  message,
  size = 'medium',
  onClick,
  className,
  showBubble = true,
  animate = true
}: TeddyAssistantProps) {
  const [currentMood, setCurrentMood] = useState<TeddyMood>(mood);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (mood !== currentMood) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentMood(mood);
        setIsAnimating(false);
      }, 300);
    }
  }, [mood, currentMood]);

  const getAnimationClass = useCallback(() => {
    if (!animate) return '';

    switch (currentMood) {
      case 'idle':
        return 'animate-teddy-breathe';
      case 'happy':
        return 'animate-teddy-bounce';
      case 'thinking':
        return 'animate-teddy-think';
      case 'encouraging':
        return 'animate-teddy-nod';
      case 'celebrating':
        return 'animate-teddy-celebrate';
      case 'concerned':
        return 'animate-teddy-sway';
      case 'sleeping':
        return 'animate-teddy-sleep';
      default:
        return '';
    }
  }, [currentMood, animate]);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        onClick={onClick}
        className={cn(
          'relative rounded-full bg-gradient-to-br shadow-lg transition-all duration-300',
          'hover:scale-110 hover:shadow-xl cursor-pointer',
          'flex items-center justify-center',
          moodColors[currentMood],
          sizeClasses[size],
          getAnimationClass(),
          isAnimating && 'scale-95 opacity-80'
        )}
        aria-label={`Study Teddy is ${currentMood}`}
      >
        <span className="select-none">{moodEmojis[currentMood]}</span>

        {/* Mood indicator sparkles */}
        {currentMood === 'celebrating' && (
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute top-0 left-0 animate-ping">✨</span>
            <span className="absolute top-0 right-0 animate-ping animation-delay-200">✨</span>
            <span className="absolute bottom-0 left-0 animate-ping animation-delay-400">✨</span>
            <span className="absolute bottom-0 right-0 animate-ping animation-delay-600">✨</span>
          </div>
        )}

        {/* Thinking dots */}
        {currentMood === 'thinking' && (
          <div className="absolute -top-2 -right-2">
            <div className="flex space-x-1">
              <span className="w-1 h-1 bg-gray-600 rounded-full animate-bounce animation-delay-0"></span>
              <span className="w-1 h-1 bg-gray-600 rounded-full animate-bounce animation-delay-200"></span>
              <span className="w-1 h-1 bg-gray-600 rounded-full animate-bounce animation-delay-400"></span>
            </div>
          </div>
        )}
      </button>

      {/* Message bubble */}
      {showBubble && message && (
        <div
          className={cn(
            'absolute -top-2 left-full ml-2 z-10',
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg',
            'border border-gray-200 dark:border-gray-700',
            'animate-fade-in-up whitespace-nowrap',
            bubbleSizeClasses[size]
          )}
        >
          <div className="relative">
            {/* Bubble tail */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0
                          border-t-[6px] border-t-transparent
                          border-r-[8px] border-r-white dark:border-r-gray-800
                          border-b-[6px] border-b-transparent">
            </div>
            <p className="text-gray-700 dark:text-gray-200 font-medium">
              {message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeddyMoodSelector({
  currentMood,
  onMoodChange
}: {
  currentMood: TeddyMood;
  onMoodChange: (mood: TeddyMood) => void;
}) {
  const moods: TeddyMood[] = ['idle', 'happy', 'thinking', 'encouraging', 'celebrating', 'concerned', 'sleeping'];

  return (
    <div className="flex gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {moods.map((mood) => (
        <button
          key={mood}
          onClick={() => onMoodChange(mood)}
          className={cn(
            'px-3 py-2 rounded-md text-sm font-medium transition-all',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            currentMood === mood
              ? 'bg-primary text-primary-foreground'
              : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
          )}
        >
          {moodEmojis[mood]} {mood}
        </button>
      ))}
    </div>
  );
}

export default TeddyAssistant;