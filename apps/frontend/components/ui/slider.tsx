'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, max = 100, min = 0, step = 1, className, disabled = false }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      onValueChange([newValue]);
    };

    const percentage = ((value[0] - min) / (max - min)) * 100;

    return (
      <div className={cn('relative flex items-center w-full', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
        />
        <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm cursor-pointer transition-all duration-200 hover:scale-110"
          style={{ left: `calc(${percentage}% - 8px)` }}
          onClick={(e) => {
            const rect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (rect) {
              const clickX = e.clientX - rect.left;
              const newValue = min + (clickX / rect.width) * (max - min);
              const steppedValue = Math.round(newValue / step) * step;
              const clampedValue = Math.max(min, Math.min(max, steppedValue));
              onValueChange([clampedValue]);
            }
          }}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };