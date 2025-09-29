# Study Teddy - Immediate Action Plan

**🚀 START TODAY - Ready for Implementation**

This document provides the exact steps to begin implementation immediately, with priority-ordered tasks and time estimates.

---

## 🎯 Critical Path - First 3 Days

### Day 1: Foundation Setup (4-6 hours)

#### Task 1.1: Monorepo Workspace Setup (90 minutes)
```bash
# Current state: Two separate projects in root
# Goal: Unified workspace with shared tooling

cd "D:\New_Projects\STUDY Teddy - 51"

# 1. Create root package.json
cat > package.json << 'EOF'
{
  "name": "study-teddy-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "studyteddy-backend",
    "studyteddy-frontend",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd studyteddy-backend && npm run start:dev",
    "dev:frontend": "cd studyteddy-frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd studyteddy-backend && npm run build",
    "build:frontend": "cd studyteddy-frontend && npm run build",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd studyteddy-backend && npm run test",
    "test:frontend": "cd studyteddy-frontend && npm run test",
    "lint": "npm run lint:backend && npm run lint:frontend",
    "lint:backend": "cd studyteddy-backend && npm run lint",
    "lint:frontend": "cd studyteddy-frontend && npm run lint",
    "typecheck": "npm run typecheck:backend && npm run typecheck:frontend",
    "typecheck:backend": "cd studyteddy-backend && npx tsc --noEmit",
    "typecheck:frontend": "cd studyteddy-frontend && npx tsc --noEmit"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
EOF

# 2. Install root dependencies
npm install

# 3. Create shared configs
mkdir -p .vscode packages/shared

# Root TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["packages/shared/src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist", "build"]
}
EOF

# Root Prettier config
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
EOF

# Root ESLint config
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'error'
  },
  ignorePatterns: ['dist/', 'build/', 'node_modules/']
};
EOF
```

#### Task 1.2: Create Shared Types Package (60 minutes)
```bash
# Create shared package structure
mkdir -p packages/shared/src/{types,utils,constants}

# Package.json for shared types
cat > packages/shared/package.json << 'EOF'
{
  "name": "@study-teddy/shared",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./utils": "./src/utils/index.ts"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
EOF

# Create base types from backend DTOs
cat > packages/shared/src/types/user.ts << 'EOF'
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  authProvider: 'local' | 'google';
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  name: string;
  authProvider?: 'local' | 'google';
  googleId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}
EOF

cat > packages/shared/src/types/task.ts << 'EOF'
export interface Task {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  subject?: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateTaskDto {
  title?: string;
  subject?: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
}

export interface TaskFilters {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  subject?: string;
  dueDate?: string;
}
EOF

cat > packages/shared/src/types/ai.ts << 'EOF'
export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  aiResponse: string;
  tokensUsed?: number;
  createdAt: string;
}

export interface ChatDto {
  message: string;
}

export interface PracticeQuestionDto {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count?: number;
}
EOF

cat > packages/shared/src/types/dashboard.ts << 'EOF'
export interface DashboardStats {
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  studyTime: {
    thisWeek: number;
    daily: number;
  };
  aiChats: number;
  streak: number;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  durationMinutes: number;
  date: string;
  createdAt: string;
}

export interface WeeklyOverview {
  date: string;
  minutes: number;
  tasksCompleted: number;
}
EOF

# Create main export file
cat > packages/shared/src/index.ts << 'EOF'
// Types
export * from './types/user';
export * from './types/task';
export * from './types/ai';
export * from './types/dashboard';

// Utils
export * from './utils/validation';
export * from './utils/date';

// Constants
export * from './constants/subjects';
export * from './constants/priorities';
EOF

# Create utility functions
cat > packages/shared/src/utils/date.ts << 'EOF'
export const formatDueDate = (dueDate: string): string => {
  const date = new Date(dueDate);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Due Today';
  if (diffDays === 1) return 'Due Tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;

  return date.toLocaleDateString();
};

export const calculateDaysUntilDue = (dueDate: string): number => {
  const date = new Date(dueDate);
  const today = new Date();
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};
EOF

cat > packages/shared/src/constants/subjects.ts << 'EOF'
export const SUBJECTS = {
  math: { label: 'Mathematics', color: 'blue' },
  science: { label: 'Science', color: 'green' },
  language: { label: 'Language', color: 'purple' },
  history: { label: 'History', color: 'orange' },
  art: { label: 'Art', color: 'pink' },
} as const;

export type SubjectKey = keyof typeof SUBJECTS;
EOF

cat > packages/shared/src/constants/priorities.ts << 'EOF'
export const PRIORITIES = {
  low: { label: 'Low', color: 'green' },
  medium: { label: 'Medium', color: 'yellow' },
  high: { label: 'High', color: 'red' },
} as const;

export type PriorityKey = keyof typeof PRIORITIES;
EOF
```

#### Task 1.3: Update Backend to Use Shared Types (30 minutes)
```typescript
// Update studyteddy-backend/package.json dependencies
cd studyteddy-backend
npm install ../packages/shared

// Update imports in backend files to use shared types
// This will be done incrementally as we migrate components
```

### Day 2: Next.js Frontend Setup (6-8 hours)

#### Task 2.1: Initialize Next.js App (60 minutes)
```bash
# Navigate to frontend directory
cd studyteddy-frontend

# Verify current Next.js setup and enhance it
npm install @study-teddy/shared@file:../packages/shared

# Install additional dependencies for API client
npm install @tanstack/react-query axios
npm install @tanstack/react-query-devtools --save-dev

# Update package.json scripts
cat > package.json << 'EOF'
{
  "name": "studyteddy-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@study-teddy/shared": "file:../packages/shared",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "next": "15.5.3",
    "react": "^18",
    "react-dom": "^18",
    "@shadcn/ui": "latest",
    "tailwindcss": "^3.4.0",
    "lucide-react": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.0.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "eslint": "^8",
    "eslint-config-next": "15.5.3",
    "typescript": "^5"
  }
}
EOF

npm install
```

#### Task 2.2: Setup App Router Structure (45 minutes)
```bash
# Create comprehensive app structure
mkdir -p app/{api,\\(auth\\),\\(dashboard\\),\\(public\\)}/{auth,login,register,forgot-password}
mkdir -p app/\\(dashboard\\)/{dashboard,tasks,ai-tutor,profile}
mkdir -p app/\\(public\\)/{about,contact,privacy}

# Create layouts
cat > app/\\(auth\\)/layout.tsx << 'EOF'
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-6">
        {children}
      </div>
    </div>
  );
}
EOF

cat > app/\\(dashboard\\)/layout.tsx << 'EOF'
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
EOF

# Create basic pages
cat > app/\\(auth\\)/login/page.tsx << 'EOF'
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to your Study Teddy account</p>
      </div>
      <LoginForm />
    </div>
  );
}
EOF

cat > app/\\(dashboard\\)/dashboard/page.tsx << 'EOF'
import { DashboardContent } from '@/components/dashboard/dashboard-content';

export default function DashboardPage() {
  return <DashboardContent />;
}
EOF
```

#### Task 2.3: Setup API Client (90 minutes)
```typescript
// Create lib/api/client.ts
mkdir -p lib/api

cat > lib/api/client.ts << 'EOF'
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

interface ApiClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}

class StudyTeddyApiClient implements ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth-token');
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth-token');
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth-token', token);
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config);
  }
}

export const apiClient = new StudyTeddyApiClient();
EOF

# Create React Query setup
cat > lib/providers/query-client-provider.tsx << 'EOF'
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
EOF

# Update root layout to include providers
cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-client-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Study Teddy - AI-Powered Study Planner',
  description: 'Organize your study time and get instant help with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
EOF
```

### Day 3: Component Migration Start (8 hours)

#### Task 3.1: Migrate Core UI Components (3 hours)
```bash
# Copy and enhance UI components from old.study
# Focus on the most critical components first

# Create component directories
mkdir -p components/{ui,auth,dashboard,tasks,ai,layout}

# Copy Button, Card, Input from old.study to components/ui/
# These should already be set up with Shadcn/UI

# Create enhanced TaskCard component
cat > components/tasks/task-card.tsx << 'EOF'
'use client';

import { CheckCircle2, Circle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDueDate, calculateDaysUntilDue } from '@study-teddy/shared';
import type { Task } from '@study-teddy/shared';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  variant?: 'default' | 'urgent' | 'review';
}

export function TaskCard({ task, onToggleComplete, variant = 'default' }: TaskCardProps) {
  const daysUntilDue = calculateDaysUntilDue(task.dueDate || '');
  const isOverdue = daysUntilDue < 0;
  const isToday = daysUntilDue === 0;

  const cardVariants = {
    default: 'bg-card hover:bg-accent/5 border-border',
    urgent: 'bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/30',
    review: 'bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-950/30'
  };

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all duration-200',
      cardVariants[variant],
      task.completed && 'opacity-60'
    )}>
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-6 w-6 rounded-full hover:bg-transparent"
          onClick={() => onToggleComplete(task.id)}
        >
          {task.completed ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-medium text-sm leading-tight mb-2',
            task.completed && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {task.subject && (
              <Badge variant="outline" className="text-xs">
                {task.subject}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                task.priority === 'high' && 'bg-red-100 text-red-700',
                task.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                task.priority === 'low' && 'bg-green-100 text-green-700'
              )}
            >
              {task.priority}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className={cn(
                  isOverdue && 'text-red-600 font-medium',
                  isToday && 'text-orange-600 font-medium'
                )}>
                  {formatDueDate(task.dueDate)}
                </span>
              </div>
            )}
          </div>

          {isOverdue && (
            <div className="flex items-center gap-1 mt-2 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">Past Due</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
EOF
```

#### Task 3.2: Create Authentication Components (2 hours)
```typescript
// Create login form component
cat > components/auth/login-form.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import type { LoginDto } from '@study-teddy/shared';

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginDto>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post<{ token: string; user: any }>('/auth/login', formData);
      apiClient.setToken(response.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
EOF
```

#### Task 3.3: Create Basic Dashboard Structure (3 hours)
```typescript
# Create dashboard content component
cat > components/dashboard/dashboard-content.tsx << 'EOF'
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { QuickStats } from './quick-stats';
import { TodayTasks } from './today-tasks';
import { WelcomeHeader } from './welcome-header';
import type { DashboardStats, Task } from '@study-teddy/shared';

export function DashboardContent() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
  });

  const { data: todayTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['today-tasks'],
    queryFn: () => apiClient.get<Task[]>('/tasks/today'),
  });

  if (statsLoading || tasksLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <WelcomeHeader />

      {stats && <QuickStats stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TodayTasks tasks={todayTasks || []} />
        </div>

        <div className="space-y-6">
          {/* Study progress widgets will go here */}
        </div>
      </div>
    </div>
  );
}
EOF

# Create QuickStats component
cat > components/dashboard/quick-stats.tsx << 'EOF'
'use client';

import { AlertTriangle, Calendar, RotateCcw, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardStats } from '@study-teddy/shared';

interface QuickStatsProps {
  stats: DashboardStats;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const statItems = [
    {
      icon: AlertTriangle,
      label: 'Overdue',
      value: stats.tasks.overdue,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      icon: Calendar,
      label: 'Today',
      value: stats.tasks.total - stats.tasks.completed,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      icon: RotateCcw,
      label: 'AI Chats',
      value: stats.aiChats,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: Clock,
      label: 'Study Time',
      value: `${Math.floor(stats.studyTime.thisWeek / 60)}h ${stats.studyTime.thisWeek % 60}m`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((stat, index) => (
        <Card key={index} className={`${stat.bgColor} ${stat.borderColor} border`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-background/50 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className={`text-sm ${stat.color} opacity-80`}>
                  {stat.label}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
EOF
```

---

## ⚡ Immediate Next Steps (After Day 1-3)

### Day 4-5: Complete Core Dashboard
1. **Finish dashboard components migration**
2. **Implement task management CRUD**
3. **Add real-time data updates**
4. **Create responsive layouts**

### Day 6-7: Authentication & Navigation
1. **Complete auth flow with NextAuth.js**
2. **Add protected route middleware**
3. **Create navigation components**
4. **Implement user session management**

### Week 2: AI Integration & Advanced Features
1. **Migrate AI chat interface**
2. **Add file upload capabilities**
3. **Implement advanced dashboard widgets**
4. **Add mobile responsiveness**

---

## 🚨 Critical Success Factors

### Must-Have Day 1
- ✅ Monorepo structure working
- ✅ Shared types package created
- ✅ Next.js app routing to backend
- ✅ Basic login flow functional

### Must-Have Day 3
- ✅ Core components migrated
- ✅ Dashboard displaying real data
- ✅ Task creation/completion working
- ✅ Authentication flow complete

### Must-Have Week 1
- ✅ All MVP features functional
- ✅ Mobile responsive design
- ✅ Error handling implemented
- ✅ Performance optimized

---

## 🔧 Development Commands

```bash
# Start development (run from root)
npm run dev

# Run tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Individual app commands
npm run dev:backend
npm run dev:frontend
```

---

## 📞 Support & Troubleshooting

### Common Issues & Solutions

1. **Port conflicts**: Backend (3001), Frontend (3000)
2. **Database connection**: Ensure PostgreSQL running
3. **Environment variables**: Copy .env.example files
4. **Type errors**: Run `npm run typecheck` to identify issues
5. **Build failures**: Clear node_modules and reinstall

### Quick Fixes
```bash
# Reset everything
rm -rf node_modules package-lock.json
npm install

# Database reset
npm run db:reset
npm run db:push

# Clear Next.js cache
rm -rf .next
npm run build
```

---

**🎯 GOAL: End of Day 3 = Working dashboard with real data from backend**

Start with Task 1.1 above and work through systematically. Each task builds on the previous one, creating a solid foundation for rapid development.