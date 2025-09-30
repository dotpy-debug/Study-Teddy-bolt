#!/usr/bin/env bun

/**
 * Fix Import Path Issues
 * 
 * This script fixes common import path issues that are causing TypeScript errors
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

const WORKSPACE_ROOT = process.cwd();

console.log('🔧 Fixing import path issues...\n');

// Common import path fixes
const importPathFixes = [
  // Fix @/ imports that should be relative
  {
    pattern: /from ['"]@\/hooks\/useAnalytics['"]/g,
    replacement: "from '../hooks/use-analytics'",
    description: 'Fix useAnalytics import path'
  },
  {
    pattern: /from ['"]@\/services\/calendar\.service['"]/g,
    replacement: "from '../services/calendar.service'",
    description: 'Fix calendar service import path'
  },
  {
    pattern: /from ['"]@\/services\/tasks\.service['"]/g,
    replacement: "from '../services/tasks.service'",
    description: 'Fix tasks service import path'
  },
  {
    pattern: /from ['"]@\/services\/api['"]/g,
    replacement: "from '../services/api'",
    description: 'Fix API service import path'
  },
  {
    pattern: /from ['"]@\/lib\/performance\/performance-monitor['"]/g,
    replacement: "from '../lib/performance/performance-monitor'",
    description: 'Fix performance monitor import path'
  },
  // Fix component imports
  {
    pattern: /from ['"]@\/components\/calendar\/CalendarConnection['"]/g,
    replacement: "from '../components/calendar/CalendarConnection'",
    description: 'Fix CalendarConnection import path'
  },
  {
    pattern: /from ['"]@\/components\/calendar\/WeeklyPlanner['"]/g,
    replacement: "from '../components/calendar/WeeklyPlanner'",
    description: 'Fix WeeklyPlanner import path'
  }
];

// Files to process (focus on the most problematic ones first)
const filesToProcess = [
  'apps/frontend/src/app/dashboard/analytics/page.tsx',
  'apps/frontend/src/app/dashboard/calendar/page.tsx',
  'apps/frontend/src/components/calendar/**/*.tsx',
  'apps/frontend/src/components/analytics/**/*.tsx',
  'apps/frontend/src/hooks/**/*.ts',
  'apps/frontend/features/**/*.tsx',
  'apps/frontend/features/**/*.ts'
];

async function fixImportsInFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  try {
    let content = readFileSync(filePath, 'utf8');
    let hasChanges = false;

    importPathFixes.forEach(({ pattern, replacement, description }) => {
      const originalContent = content;
      content = content.replace(pattern, replacement);
      
      if (content !== originalContent) {
        console.log(`  ✓ ${description} in ${filePath}`);
        hasChanges = true;
      }
    });

    // Additional fixes for specific patterns
    
    // Fix missing service files by creating stub implementations
    if (content.includes("from '../services/calendar.service'") && !existsSync(join(WORKSPACE_ROOT, 'apps/frontend/src/services/calendar.service.ts'))) {
      console.log(`  ⚠️  Creating stub calendar.service.ts`);
      // We'll create this below
    }

    if (hasChanges) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in ${filePath}\n`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Create missing service files as stubs
const serviceStubs = {
  'apps/frontend/src/services/calendar.service.ts': `
// Calendar Service Stub
export interface CalendarAccount {
  id: string;
  email: string;
  provider: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

export interface ScheduleSessionDto {
  taskId: string;
  duration: number;
  preferredTime?: string;
}

class CalendarService {
  async getAuthUrl(): Promise<{ authUrl: string }> {
    throw new Error('Calendar service not implemented');
  }

  async getAccounts(): Promise<CalendarAccount[]> {
    return [];
  }

  async getEvents(): Promise<CalendarEvent[]> {
    return [];
  }

  async scheduleSession(dto: ScheduleSessionDto): Promise<CalendarEvent> {
    throw new Error('Calendar service not implemented');
  }
}

const calendarService = new CalendarService();
export default calendarService;
export { CalendarAccount, CalendarEvent, ScheduleSessionDto };
`,
  'apps/frontend/src/services/tasks.service.ts': `
// Tasks Service Stub
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject?: string;
}

class TasksService {
  async getTasks(): Promise<Task[]> {
    return [];
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    throw new Error('Tasks service not implemented');
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    throw new Error('Tasks service not implemented');
  }

  async deleteTask(id: string): Promise<void> {
    throw new Error('Tasks service not implemented');
  }
}

const tasksService = new TasksService();
export default tasksService;
export { Task };
`,
  'apps/frontend/src/services/api.ts': `
// API Service Stub
import { apiClient } from '../lib/api-client';

class ApiService {
  async get<T>(endpoint: string): Promise<T> {
    const response = await apiClient.get<T>(endpoint);
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await apiClient.post<T>(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await apiClient.put<T>(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await apiClient.delete<T>(endpoint);
    return response.data;
  }
}

const api = new ApiService();
export default api;
`,
  'apps/frontend/src/hooks/use-analytics.ts': `
// Analytics Hook Stub
import { useState, useEffect } from 'react';

export interface AnalyticsTile {
  id: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

export function useAnalytics() {
  const [tiles, setTiles] = useState<AnalyticsTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Stub implementation
    setTiles([
      { id: 'focused-minutes', value: '0', trend: 'stable' },
      { id: 'tasks-completed', value: '0', trend: 'stable' },
      { id: 'on-time-rate', value: '0%', trend: 'stable' }
    ]);
    setLoading(false);
  }, []);

  return { tiles, loading };
}

export async function fetchAnalyticsTiles(): Promise<AnalyticsTile[]> {
  return [
    { id: 'focused-minutes', value: '0', trend: 'stable' },
    { id: 'tasks-completed', value: '0', trend: 'stable' },
    { id: 'on-time-rate', value: '0%', trend: 'stable' }
  ];
}

export async function fetchNextBestAction(): Promise<{ action: string; reason: string }> {
  return {
    action: 'Start your first task',
    reason: 'You have pending tasks to complete'
  };
}
`
};

// Create missing service files
console.log('📁 Creating missing service files...');
Object.entries(serviceStubs).forEach(([filePath, content]) => {
  const fullPath = join(WORKSPACE_ROOT, filePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  
  try {
    // Create directory if it doesn't exist
    const { execSync } = require('child_process');
    execSync(`mkdir -p "${dir}"`, { stdio: 'pipe' });
    
    if (!existsSync(fullPath)) {
      writeFileSync(fullPath, content.trim(), 'utf8');
      console.log(`✅ Created ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create ${filePath}:`, error.message);
  }
});

// Process files
console.log('\n🔧 Processing files...');
for (const pattern of filesToProcess) {
  try {
    const files = await glob(pattern, { cwd: WORKSPACE_ROOT });
    for (const file of files) {
      await fixImportsInFile(join(WORKSPACE_ROOT, file));
    }
  } catch (error) {
    console.error(`❌ Error processing pattern ${pattern}:`, error.message);
  }
}

console.log('\n🎉 Import path fixes completed!');
console.log('📋 Next steps:');
console.log('   bun run typecheck  # Check remaining TypeScript errors');
console.log('   bun run lint       # Check linting issues');
console.log('   bun run build      # Test compilation');