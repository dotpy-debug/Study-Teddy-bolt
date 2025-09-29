'use client';

import React, { useState } from 'react';
import { FocusPresetManager } from '../components/focus-preset-manager';
import { FocusPreset } from '../types/preset';
import toast from 'react-hot-toast';

/**
 * Example usage of the FocusPresetManager component
 * This demonstrates how to integrate the preset manager into your application
 */
export function PresetManagerExample() {
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset | null>(null);
  const [activePreset, setActivePreset] = useState<FocusPreset | null>(null);

  const handlePresetSelect = (preset: FocusPreset) => {
    setSelectedPreset(preset);
    toast.success(`Selected preset: ${preset.name}`);
  };

  const handlePresetStart = (preset: FocusPreset) => {
    setActivePreset(preset);
    toast.success(`Started focus session with: ${preset.name}`);

    // Here you would typically:
    // 1. Start your focus timer
    // 2. Apply the preset settings (focus duration, break duration, etc.)
    // 3. Navigate to the timer page or update the UI state
    console.log('Starting focus session with preset:', preset);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Focus Preset Manager Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A comprehensive preset management system for focus sessions
          </p>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Selected Preset
            </h3>
            {selectedPreset ? (
              <div>
                <p className="text-lg font-medium">{selectedPreset.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedPreset.focusDuration}m focus / {selectedPreset.shortBreakDuration}m break
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Category: {selectedPreset.category}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No preset selected</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Active Session
            </h3>
            {activePreset ? (
              <div>
                <p className="text-lg font-medium text-green-600">
                  {activePreset.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Running focus session
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600">Active</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No active session</p>
            )}
          </div>
        </div>

        {/* Preset Manager */}
        <FocusPresetManager
          onPresetSelect={handlePresetSelect}
          onPresetStart={handlePresetStart}
          selectedPresetId={selectedPreset?.id}
          activePresetId={activePreset?.id}
          showQuickStart={true}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg border"
        />
      </div>
    </div>
  );
}

export default PresetManagerExample;