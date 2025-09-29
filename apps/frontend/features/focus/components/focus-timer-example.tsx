'use client';

import React from 'react';
import { FocusTimer } from './focus-timer';
import { toast } from 'react-hot-toast';

/**
 * Example usage component for the FocusTimer
 * This demonstrates how to integrate the FocusTimer component
 */
export function FocusTimerExample() {
  const handlePhaseComplete = (phase: { type: string; label: string }) => {
    toast.success(`${phase.label} completed! 🎉`);
  };

  const handleSessionComplete = () => {
    toast.success('Pomodoro session completed! Great work! 🍅');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Focus Timer</h1>
        <p className="text-muted-foreground">
          Start a Pomodoro session to see the timer in action
        </p>
      </div>

      <FocusTimer
        onPhaseComplete={handlePhaseComplete}
        onSessionComplete={handleSessionComplete}
        enableSounds={true}
        showMinimized={false}
        className="max-w-2xl mx-auto"
      />

      <div className="mt-12 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h3 className="font-medium">Timer Features</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Circular animated countdown</li>
              <li>• Phase management (Focus/Breaks)</li>
              <li>• Play/Pause/Stop controls</li>
              <li>• Skip to next phase</li>
              <li>• Session progress tracking</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Interactive Features</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Minimize/expand views</li>
              <li>• Sound notifications</li>
              <li>• Keyboard shortcuts</li>
              <li>• Responsive design</li>
              <li>• Real-time updates</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Keyboard Shortcuts</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div><kbd className="px-2 py-1 bg-background rounded">Space</kbd> - Play/Pause timer</div>
            <div><kbd className="px-2 py-1 bg-background rounded">Esc</kbd> - Stop timer</div>
          </div>
        </div>
      </div>
    </div>
  );
}