'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  FocusPreset,
  PresetTemplate,
  PresetExportData,
  PresetImportResult,
  DEFAULT_PRESETS
} from '../types/preset';

const STORAGE_KEYS = {
  PRESETS: 'focus-presets',
  USAGE_DATA: 'focus-preset-usage',
  SETTINGS: 'focus-preset-settings',
} as const;

interface PresetStorageSettings {
  autoBackup: boolean;
  lastBackup?: Date;
  defaultCategory: string;
}

export function usePresetStorage() {
  const [isLoading, setIsLoading] = useState(true);
  const [presets, setPresets] = useState<FocusPreset[]>([]);
  const [settings, setSettings] = useState<PresetStorageSettings>({
    autoBackup: true,
    defaultCategory: 'Study',
  });

  // Initialize presets from storage or create defaults
  useEffect(() => {
    const initializePresets = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.PRESETS);
        const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }

        if (stored) {
          const parsedPresets = JSON.parse(stored).map((preset: any) => ({
            ...preset,
            createdAt: new Date(preset.createdAt),
            updatedAt: new Date(preset.updatedAt),
            lastUsedAt: preset.lastUsedAt ? new Date(preset.lastUsedAt) : undefined,
          }));
          setPresets(parsedPresets);
        } else {
          // Create default presets from templates
          const defaultPresets = DEFAULT_PRESETS.map((template) => ({
            ...template,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isFavorite: false,
            isTemplate: undefined,
            templateId: undefined,
          })) as FocusPreset[];

          setPresets(defaultPresets);
          localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(defaultPresets));
        }
      } catch (error) {
        console.error('Failed to initialize presets:', error);
        // Fallback to empty array if parsing fails
        setPresets([]);
      } finally {
        setIsLoading(false);
      }
    };

    initializePresets();
  }, []);

  // Save presets to localStorage whenever they change
  const savePresets = useCallback((newPresets: FocusPreset[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(newPresets));
      setPresets(newPresets);
    } catch (error) {
      console.error('Failed to save presets:', error);
      throw new Error('Failed to save presets to storage');
    }
  }, []);

  // Save settings
  const saveSettings = useCallback((newSettings: PresetStorageSettings) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  // Create a new preset
  const createPreset = useCallback((presetData: Omit<FocusPreset, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsedAt'>) => {
    const newPreset: FocusPreset = {
      ...presetData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isFavorite: presetData.isFavorite || false,
    };

    const updatedPresets = [...presets, newPreset];
    savePresets(updatedPresets);
    return newPreset;
  }, [presets, savePresets]);

  // Update an existing preset
  const updatePreset = useCallback((id: string, updates: Partial<FocusPreset>) => {
    const updatedPresets = presets.map(preset =>
      preset.id === id
        ? { ...preset, ...updates, updatedAt: new Date() }
        : preset
    );
    savePresets(updatedPresets);
  }, [presets, savePresets]);

  // Delete a preset
  const deletePreset = useCallback((id: string) => {
    const updatedPresets = presets.filter(preset => preset.id !== id);
    savePresets(updatedPresets);
  }, [presets, savePresets]);

  // Toggle favorite status
  const toggleFavorite = useCallback((id: string) => {
    updatePreset(id, { isFavorite: !presets.find(p => p.id === id)?.isFavorite });
  }, [presets, updatePreset]);

  // Record preset usage
  const recordUsage = useCallback((id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
      updatePreset(id, {
        usageCount: preset.usageCount + 1,
        lastUsedAt: new Date(),
      });
    }
  }, [presets, updatePreset]);

  // Reorder presets
  const reorderPresets = useCallback((startIndex: number, endIndex: number) => {
    const result = Array.from(presets);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    savePresets(result);
  }, [presets, savePresets]);

  // Create preset from template
  const createFromTemplate = useCallback((template: PresetTemplate, customName?: string) => {
    const presetData = {
      name: customName || template.name,
      focusDuration: template.focusDuration,
      shortBreakDuration: template.shortBreakDuration,
      longBreakDuration: template.longBreakDuration,
      sessionsBeforeLongBreak: template.sessionsBeforeLongBreak,
      color: template.color,
      category: template.category,
      description: template.description,
      tags: template.tags,
      isDefault: false,
      isFavorite: false,
    };
    return createPreset(presetData);
  }, [createPreset]);

  // Export presets
  const exportPresets = useCallback((): PresetExportData => {
    return {
      presets,
      templates: DEFAULT_PRESETS,
      exportedAt: new Date(),
      version: '1.0.0',
    };
  }, [presets]);

  // Import presets
  const importPresets = useCallback((data: PresetExportData, options?: { overwrite?: boolean }): PresetImportResult => {
    const result: PresetImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const existingNames = new Set(presets.map(p => p.name));
      const presetsToImport: FocusPreset[] = [];

      data.presets.forEach((preset) => {
        try {
          // Validate preset structure
          if (!preset.name || !preset.focusDuration) {
            result.errors.push(`Invalid preset structure: ${preset.name || 'Unknown'}`);
            return;
          }

          // Check for duplicates
          if (existingNames.has(preset.name) && !options?.overwrite) {
            result.skipped++;
            return;
          }

          const newPreset: FocusPreset = {
            ...preset,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
            lastUsedAt: undefined,
            isFavorite: false,
          };

          presetsToImport.push(newPreset);
          result.imported++;
        } catch (error) {
          result.errors.push(`Failed to import preset ${preset.name}: ${error}`);
        }
      });

      if (presetsToImport.length > 0) {
        const updatedPresets = options?.overwrite
          ? [...presetsToImport, ...presets.filter(p => !data.presets.some(dp => dp.name === p.name))]
          : [...presets, ...presetsToImport];
        savePresets(updatedPresets);
      }
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
    }

    return result;
  }, [presets, savePresets]);

  // Clear all presets
  const clearAllPresets = useCallback(() => {
    setPresets([]);
    localStorage.removeItem(STORAGE_KEYS.PRESETS);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultPresets = DEFAULT_PRESETS.map((template) => ({
      ...template,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false,
      isTemplate: undefined,
      templateId: undefined,
    })) as FocusPreset[];

    savePresets(defaultPresets);
  }, [savePresets]);

  return {
    // State
    presets,
    settings,
    isLoading,

    // Actions
    createPreset,
    updatePreset,
    deletePreset,
    toggleFavorite,
    recordUsage,
    reorderPresets,
    createFromTemplate,

    // Import/Export
    exportPresets,
    importPresets,

    // Settings
    saveSettings,

    // Utilities
    clearAllPresets,
    resetToDefaults,
  };
}

// Utility function to generate unique IDs
function generateId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}