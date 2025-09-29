export type PresetCategory = 'Study' | 'Work' | 'Creative' | 'Personal' | 'Other';
export type PresetColor = 'blue' | 'green' | 'purple' | 'orange' | 'red';

export interface FocusPresetBase {
  id: string;
  name: string;
  focusDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsBeforeLongBreak: number;
  color: PresetColor;
  category: PresetCategory;
  description?: string;
  tags?: string[];
  isDefault?: boolean;
  isFavorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsedAt?: Date;
}

export interface FocusPreset extends FocusPresetBase {}

export interface PresetTemplate extends Omit<FocusPresetBase, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'lastUsedAt' | 'isFavorite'> {
  templateId: string;
  isTemplate: true;
}

export interface PresetStats {
  totalSessions: number;
  totalFocusTime: number; // minutes
  averageSessionDuration: number; // minutes
  streakDays: number;
  lastUsed?: Date;
  weeklyUsage: Array<{
    date: string;
    sessions: number;
    focusTime: number;
  }>;
}

export interface PresetUsageData {
  presetId: string;
  stats: PresetStats;
}

export interface PresetFilter {
  search?: string;
  category?: PresetCategory;
  favorites?: boolean;
  color?: PresetColor;
  sortBy?: 'name' | 'created' | 'usage' | 'lastUsed';
  sortOrder?: 'asc' | 'desc';
}

export interface PresetExportData {
  presets: FocusPreset[];
  templates: PresetTemplate[];
  exportedAt: Date;
  version: string;
}

export interface PresetImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export const DEFAULT_PRESET_COLORS: Record<PresetColor, { bg: string; border: string; accent: string; text: string; badge: string }> = {
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

export const PRESET_CATEGORIES: PresetCategory[] = ['Study', 'Work', 'Creative', 'Personal', 'Other'];

export const DEFAULT_PRESETS: PresetTemplate[] = [
  {
    templateId: 'pomodoro',
    name: 'Pomodoro',
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    color: 'red',
    category: 'Study',
    description: 'The classic Pomodoro Technique for focused work sessions',
    tags: ['classic', 'productivity', 'study'],
    isDefault: true,
    isTemplate: true,
    usageCount: 0,
  },
  {
    templateId: 'deep-work',
    name: 'Deep Work',
    focusDuration: 90,
    shortBreakDuration: 15,
    longBreakDuration: 30,
    sessionsBeforeLongBreak: 2,
    color: 'blue',
    category: 'Work',
    description: 'Extended focus sessions for deep, concentrated work',
    tags: ['deep work', 'concentration', 'flow'],
    isDefault: true,
    isTemplate: true,
    usageCount: 0,
  },
  {
    templateId: 'quick-focus',
    name: 'Quick Focus',
    focusDuration: 15,
    shortBreakDuration: 3,
    longBreakDuration: 10,
    sessionsBeforeLongBreak: 3,
    color: 'green',
    category: 'Personal',
    description: 'Short bursts of focused time for quick tasks',
    tags: ['quick', 'short', 'tasks'],
    isDefault: true,
    isTemplate: true,
    usageCount: 0,
  },
  {
    templateId: 'creative-flow',
    name: 'Creative Flow',
    focusDuration: 45,
    shortBreakDuration: 10,
    longBreakDuration: 20,
    sessionsBeforeLongBreak: 3,
    color: 'purple',
    category: 'Creative',
    description: 'Balanced sessions for creative work and inspiration',
    tags: ['creative', 'flow', 'inspiration'],
    isDefault: true,
    isTemplate: true,
    usageCount: 0,
  },
  {
    templateId: 'study-marathon',
    name: 'Study Marathon',
    focusDuration: 50,
    shortBreakDuration: 10,
    longBreakDuration: 25,
    sessionsBeforeLongBreak: 4,
    color: 'orange',
    category: 'Study',
    description: 'Extended study sessions with adequate breaks',
    tags: ['study', 'marathon', 'learning'],
    isDefault: true,
    isTemplate: true,
    usageCount: 0,
  },
];