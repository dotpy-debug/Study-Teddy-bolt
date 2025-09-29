# Component Migration Map - old.study → Next.js

**Purpose**: Systematic mapping of existing UI components to new Next.js structure with migration priorities and implementation notes.

---

## 📊 Migration Overview

### Current State: old.study (Vite/React)
- **UI Components**: 40+ Shadcn/UI components
- **Custom Components**: 12 domain-specific components
- **Pages**: 4 main pages (Index, Auth, Dashboard, NotFound)
- **Hooks**: 3 custom hooks
- **Services**: 1 AI service

### Target State: Next.js 15.5.3 + App Router
- **App Structure**: Route-based organization
- **Shared Types**: Type-safe API integration
- **Enhanced Components**: Improved with server-side capabilities
- **Modern Patterns**: App Router, Server Components, optimized bundles

---

## 🎯 Component Migration Priority Matrix

### 🔴 Priority 1: Critical Path (MVP Blockers)
**Must migrate first - MVP cannot launch without these**

| Component | Source Path | Target Path | Complexity | Notes |
|-----------|-------------|-------------|------------|-------|
| **TaskCard** | `src/components/TaskCard.tsx` | `components/tasks/task-card.tsx` | Medium | Core task display logic |
| **QuickStats** | `src/components/QuickStats.tsx` | `components/dashboard/quick-stats.tsx` | Low | Dashboard metrics |
| **Dashboard** | `src/components/Dashboard.tsx` | `components/dashboard/dashboard-content.tsx` | High | Main dashboard layout |
| **WelcomeHeader** | `src/components/WelcomeHeader.tsx` | `components/dashboard/welcome-header.tsx` | Low | User greeting |
| **LoginForm** | `src/pages/Auth.tsx` | `components/auth/login-form.tsx` | Medium | Extract from page |

### 🟡 Priority 2: Core Features (Week 1-2)
**Important for complete user experience**

| Component | Source Path | Target Path | Complexity | Notes |
|-----------|-------------|-------------|------------|-------|
| **ProgressTracker** | `src/components/ProgressTracker.tsx` | `components/dashboard/progress-tracker.tsx` | Medium | Study progress display |
| **StudySessionTracker** | `src/components/StudySessionTracker.tsx` | `components/dashboard/study-session-tracker.tsx` | Medium | Time tracking widget |
| **ProtectedRoute** | `src/components/ProtectedRoute.tsx` | `lib/auth/protected-route.tsx` | Low | Auth middleware |
| **HelpDialog** | `src/components/HelpDialog.tsx` | `components/common/help-dialog.tsx` | Low | User support |

### 🟢 Priority 3: Enhanced Features (Week 3+)
**Nice-to-have for polished experience**

| Component | Source Path | Target Path | Complexity | Notes |
|-----------|-------------|-------------|------------|-------|
| **SpacedRepetitionWidget** | `src/components/SpacedRepetitionWidget.tsx` | `components/study/spaced-repetition-widget.tsx` | High | Learning algorithm |
| **AI Chat Interface** | *To be created* | `components/ai/chat-interface.tsx` | High | New feature |
| **Calendar View** | *To be created* | `components/tasks/calendar-view.tsx` | High | Task calendar |

---

## 📋 Detailed Migration Plan

### TaskCard Component
**Priority: 🔴 Critical**

#### Source Analysis
```typescript
// old.study/src/components/TaskCard.tsx
- Props: task, onToggleComplete, variant
- Features: Priority badges, due date formatting, completion toggle
- Styling: Tailwind classes, hover effects, conditional styles
- Dependencies: Lucide icons, UI components
```

#### Migration Strategy
```typescript
// Target: components/tasks/task-card.tsx
✅ Enhanced with shared types from @study-teddy/shared
✅ Server-compatible (no client-only dependencies)
✅ Improved accessibility (ARIA labels, keyboard navigation)
✅ Performance optimizations (memo, optimized re-renders)

// Changes:
- Import types from shared package
- Add server component compatibility
- Enhanced TypeScript types
- Improved error handling
```

#### Implementation
```typescript
// components/tasks/task-card.tsx
'use client';

import { memo } from 'react';
import { formatDueDate, calculateDaysUntilDue } from '@study-teddy/shared';
import type { Task } from '@study-teddy/shared';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  variant?: 'default' | 'urgent' | 'review';
  className?: string;
}

export const TaskCard = memo(function TaskCard({
  task,
  onToggleComplete,
  variant = 'default',
  className
}: TaskCardProps) {
  // Enhanced implementation with accessibility
  // and performance optimizations
});
```

### Dashboard Component
**Priority: 🔴 Critical**

#### Source Analysis
```typescript
// old.study/src/components/Dashboard.tsx
- State: tasks, studySessions (mock data)
- Layout: 3-column grid, responsive design
- Features: Task filtering, progress tracking, achievements
- Dependencies: Multiple child components
```

#### Migration Strategy
```typescript
// Target: components/dashboard/dashboard-content.tsx
✅ Server-side data fetching with React Query
✅ Real API integration (no mock data)
✅ Improved loading states and error handling
✅ Enhanced responsive design
✅ Split into smaller, focused components

// New structure:
- dashboard-content.tsx (main container)
- quick-stats.tsx (metrics widgets)
- today-tasks.tsx (task list)
- study-progress.tsx (progress widgets)
```

#### Implementation
```typescript
// components/dashboard/dashboard-content.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { QuickStats } from './quick-stats';
import { TodayTasks } from './today-tasks';
import { StudyProgress } from './study-progress';

export function DashboardContent() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get('/dashboard/stats'),
  });

  // Enhanced error handling and loading states
  if (error) return <ErrorBoundary error={error} />;
  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <QuickStats stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TodayTasks className="lg:col-span-2" />
        <StudyProgress />
      </div>
    </div>
  );
}
```

### QuickStats Component
**Priority: 🔴 Critical**

#### Source Analysis
```typescript
// old.study/src/components/QuickStats.tsx
- Props: overdueTasks, todayTasks, reviewDue, totalStudyTime
- Layout: 2x2 grid on mobile, 1x4 on desktop
- Features: Color-coded stats, icons, responsive design
```

#### Migration Strategy
```typescript
// Target: components/dashboard/quick-stats.tsx
✅ Type-safe props with shared interfaces
✅ Enhanced responsive design
✅ Improved accessibility
✅ Loading states for each stat

// Enhancements:
- Click-through navigation to filtered views
- Animated counters for better UX
- Skeleton loading states
- Error handling for individual stats
```

---

## 🏗️ UI Component Library Migration

### Shadcn/UI Components Status
**All components already available in new Next.js app**

| Component | Status | Notes |
|-----------|--------|-------|
| Button | ✅ Ready | Already configured with Shadcn/UI |
| Card | ✅ Ready | CardHeader, CardContent, CardTitle available |
| Input | ✅ Ready | Form validation ready |
| Label | ✅ Ready | Accessibility compliant |
| Badge | ✅ Ready | Variant support included |
| Dialog | ✅ Ready | Modal functionality |
| Toast | ✅ Ready | Notification system |
| Skeleton | ✅ Ready | Loading states |
| Tabs | ✅ Ready | Navigation component |
| Calendar | ✅ Ready | Date picker functionality |

### Custom UI Enhancements Needed

#### Enhanced Button Component
```typescript
// components/ui/enhanced-button.tsx
- Loading states with spinners
- Icon support (left/right)
- Size variants (xs, sm, md, lg, xl)
- Color variants (brand colors)
- Keyboard navigation improvements
```

#### Enhanced Card Component
```typescript
// components/ui/enhanced-card.tsx
- Hover animations
- Click states
- Loading overlays
- Error states
- Action buttons in header
```

#### Enhanced Input Component
```typescript
// components/ui/enhanced-input.tsx
- Real-time validation
- Character counters
- Help text support
- Icon support
- Auto-complete integration
```

---

## 🎨 Design System Migration

### Color Scheme
```css
/* Migrating from old.study custom colors */
:root {
  /* Task priorities */
  --priority-high: #ef4444;
  --priority-medium: #f59e0b;
  --priority-low: #10b981;

  /* Subject colors */
  --subject-math: #3b82f6;
  --subject-science: #10b981;
  --subject-language: #8b5cf6;
  --subject-history: #f59e0b;
  --subject-art: #ec4899;

  /* Status indicators */
  --overdue: #dc2626;
  --due-today: #ea580c;
  --upcoming: #059669;

  /* Study streak */
  --streak-gold: #f59e0b;
}
```

### Animation System
```css
/* Enhanced hover effects and transitions */
.hover-lift {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-hover {
  transition: all 0.2s ease-in-out;
}

.card-hover:hover {
  background-color: var(--accent);
  border-color: var(--primary);
}
```

### Typography Scale
```css
/* Enhanced typography for better readability */
.text-display {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.text-headline {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
}

.text-body {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
}

.text-caption {
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.4;
}
```

---

## 🔄 Hooks Migration

### Custom Hooks Analysis

#### useToast Hook
```typescript
// Source: old.study/src/hooks/use-toast.ts
// Target: hooks/use-toast.ts
// Status: ✅ Already implemented with Shadcn/UI
// Changes: Enhanced with position options, auto-dismiss
```

#### useMobile Hook
```typescript
// Source: old.study/src/hooks/use-mobile.tsx
// Target: hooks/use-mobile.ts
// Status: 🔄 Needs migration
// Changes: Server-side rendering compatibility

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}
```

#### useSEO Hook
```typescript
// Source: old.study/src/hooks/use-seo.ts
// Target: Not needed (Next.js built-in metadata)
// Status: ❌ Replace with Next.js metadata API
// Changes: Use Next.js 13+ metadata for SEO
```

---

## 📁 File Structure Mapping

### Current Structure (old.study)
```
src/
├── components/
│   ├── ui/              # Shadcn/UI components (40+)
│   ├── Dashboard.tsx    # Main dashboard
│   ├── TaskCard.tsx     # Task display
│   ├── QuickStats.tsx   # Stats widgets
│   └── ...
├── pages/
│   ├── Index.tsx        # Landing page
│   ├── Auth.tsx         # Login/Register
│   ├── Dashboard.tsx    # Dashboard page
│   └── NotFound.tsx     # 404 page
├── hooks/               # Custom hooks
├── services/            # API services
└── types/               # Type definitions
```

### Target Structure (Next.js)
```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── dashboard/page.tsx
│   ├── tasks/page.tsx
│   ├── ai-tutor/page.tsx
│   └── layout.tsx
├── (public)/
│   ├── page.tsx         # Landing page
│   └── about/page.tsx
├── api/                 # API routes (if needed)
└── globals.css

components/
├── ui/                  # Shadcn/UI base components
├── auth/                # Authentication components
├── dashboard/           # Dashboard-specific components
├── tasks/               # Task management components
├── ai/                  # AI chat components
├── layout/              # Layout components (header, sidebar)
└── common/              # Shared components

lib/
├── api/                 # API client and endpoints
├── auth/                # Authentication utilities
├── utils/               # Utility functions
└── hooks/               # Custom hooks

types/                   # Moved to @study-teddy/shared
```

---

## ⚡ Migration Execution Strategy

### Phase 1: Foundation (Day 1-3)
```typescript
// Step 1: Setup new structure
1. Create component directories
2. Setup shared types package
3. Configure API client
4. Create basic layouts

// Step 2: Migrate critical components
1. TaskCard (enhanced with shared types)
2. QuickStats (real API integration)
3. Basic Dashboard structure
4. Authentication forms

// Step 3: Connect to backend
1. Test API connectivity
2. Implement authentication flow
3. Verify data flow
4. Basic error handling
```

### Phase 2: Core Features (Day 4-7)
```typescript
// Step 1: Complete dashboard
1. ProgressTracker component
2. StudySessionTracker component
3. Enhanced TaskCard variants
4. Real-time updates

// Step 2: Task management
1. Task creation/editing forms
2. Task list with filtering
3. Calendar view (basic)
4. Task completion tracking

// Step 3: User experience
1. Loading states everywhere
2. Error boundaries
3. Responsive design
4. Accessibility improvements
```

### Phase 3: Advanced Features (Day 8+)
```typescript
// Step 1: AI integration
1. Chat interface
2. Message history
3. Practice question generation
4. File upload preparation

// Step 2: Enhanced widgets
1. SpacedRepetitionWidget
2. Advanced analytics
3. Achievement system
4. Study recommendations

// Step 3: Polish and optimize
1. Performance optimization
2. Bundle size optimization
3. SEO improvements
4. Progressive enhancement
```

---

## 🧪 Testing Strategy for Migrated Components

### Component Testing Approach
```typescript
// Test files structure
components/
├── tasks/
│   ├── task-card.tsx
│   └── __tests__/
│       ├── task-card.test.tsx
│       └── task-card.stories.tsx
```

### Test Coverage Requirements
```typescript
// For each migrated component:
1. Unit tests (React Testing Library)
   - Rendering with different props
   - User interactions (click, keyboard)
   - State changes
   - Error conditions

2. Integration tests
   - API integration
   - Component composition
   - Data flow

3. Visual regression tests (optional)
   - Storybook snapshots
   - Cross-browser testing
   - Mobile responsiveness
```

### Sample Test Implementation
```typescript
// components/tasks/__tests__/task-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '../task-card';
import type { Task } from '@study-teddy/shared';

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  priority: 'high',
  completed: false,
  // ... other required fields
};

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={mockTask} onToggleComplete={jest.fn()} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onToggleComplete when clicked', () => {
    const onToggleComplete = jest.fn();
    render(<TaskCard task={mockTask} onToggleComplete={onToggleComplete} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onToggleComplete).toHaveBeenCalledWith('1');
  });

  // ... more tests
});
```

---

## 📊 Migration Progress Tracking

### Completion Checklist

#### Week 1 Targets
- [ ] TaskCard component migrated and tested
- [ ] QuickStats component migrated and tested
- [ ] Dashboard layout created and functional
- [ ] Authentication flow working
- [ ] API client integrated and tested
- [ ] Basic routing functional
- [ ] Error handling implemented
- [ ] Loading states added

#### Week 2 Targets
- [ ] All dashboard widgets migrated
- [ ] Task management CRUD complete
- [ ] Mobile responsiveness verified
- [ ] Performance optimization done
- [ ] Accessibility compliance checked
- [ ] Cross-browser testing passed
- [ ] User testing feedback incorporated
- [ ] Documentation updated

#### Success Metrics
- **Performance**: Lighthouse score >90
- **Accessibility**: WCAG 2.1 AA compliance
- **Bundle Size**: <200KB initial load
- **Test Coverage**: >80% component coverage
- **Type Safety**: 100% TypeScript strict mode
- **User Experience**: <3 second page load time

---

**Next Step**: Begin with TaskCard migration as outlined in the Immediate Action Plan, then proceed through the priority matrix systematically.