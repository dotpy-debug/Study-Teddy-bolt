'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  animated?: boolean;
}

const colorMap = {
  primary: 'stroke-blue-500',
  success: 'stroke-green-500',
  warning: 'stroke-orange-500',
  danger: 'stroke-red-500',
};

const colorMapBackground = {
  primary: 'stroke-blue-200 dark:stroke-blue-800',
  success: 'stroke-green-200 dark:stroke-green-800',
  warning: 'stroke-orange-200 dark:stroke-orange-800',
  danger: 'stroke-red-200 dark:stroke-red-800',
};

export function CircularProgress({
  progress,
  size = 200,
  strokeWidth = 8,
  className,
  children,
  color = 'primary',
  animated = true,
}: CircularProgressProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn('fill-transparent', colorMapBackground[color])}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('fill-transparent', colorMap[color])}
          style={{
            strokeDasharray: circumference,
          }}
          initial={shouldAnimate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={
            shouldAnimate
              ? {
                  duration: 0.8,
                  ease: [0.4, 0, 0.2, 1],
                }
              : { duration: 0 }
          }
        />
      </svg>

      {/* Content in center */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}