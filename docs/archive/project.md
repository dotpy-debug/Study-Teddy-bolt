# Study Teddy - Enterprise Implementation Plan

**Version:** 2.0 Enterprise Architecture
**Timeline:** 8-10 weeks
**Tech Stack:** Node.js 22 LTS + NestJS 11.x + Next.js 15.x (React 19) + TypeScript 5.7 + PostgreSQL 17 + Drizzle ORM + Redis/Valkey 7+ + WebSocket
**Architecture:** Modern Monorepo with Enhanced Real-time Features

---

## 🎯 Enterprise Architecture Overview

**Study Teddy Enterprise** leverages a modern microservices-ready architecture with NestJS backend API, Next.js frontend with App Router, PostgreSQL for persistent storage, Redis for caching and real-time features, and WebSocket for live communication.

### 🏗️ Enhanced Technology Stack

#### **Backend (NestJS 11.x, Node.js 22 LTS)**
- **NestJS 11.1.6** - Enterprise Node.js framework with TypeScript
- **Drizzle ORM** - Type-safe ORM with migrations and relations
- **Better Auth (centralized auth)** - See `Better_Auth.md` for setup and flows
- **Bull Queue** - Redis-based job queuing for background tasks
- **Socket.io** - Real-time WebSocket connections
- **Swagger** - Auto-generated API documentation
- **Class Validator** - DTO validation with decorators

#### **Frontend (Next.js 15.x, React 19)**
- **Next.js 15.x (React 19)** - React framework with App Router
- **TypeScript 5.x** - Type-safe development
- **Tailwind CSS 4.x** - Utility-first styling
- **shadcn/ui** - Component library
- **TanStack Query v5** - Server state management
- **Zustand** - Client state management
- **Better Auth** - Authentication for Next.js (see `Better_Auth.md`)

#### **Database & Caching**
- **PostgreSQL 17** - Primary database with pgvector extension
- **Redis/Valkey 7+** - Caching, sessions, and pub/sub
- **Drizzle ORM** - Modern type-safe database operations
- **pgvector** - Vector embeddings for AI features

#### **Infrastructure**
- **Docker** - Containerization
- **NGINX** - Reverse proxy and load balancing
- **PM2** - Process management

---

## 📁 Enhanced Monorepo Project Structure

```
study-teddy-enterprise/
├── 🔧 CONFIGURATION
│   ├── docker-compose.yml          # Local development environment
│   ├── docker-compose.prod.yml     # Production configuration
│   ├── .env.example                # Environment variables template
│   ├── package.json                # Monorepo root package
│   └── workspace.json              # Workspace configuration
│
├── 🎯 BACKEND (apps/api/)
│   ├── src/
│   │   ├── main.ts                # NestJS 11.x application entry
│   │   ├── app.module.ts          # Root application module
│   │   │
│   │   ├── 🔌 CORE MODULES
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   ├── local.strategy.ts
│   │   │   │   │   └── google.strategy.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── roles.guard.ts
│   │   │   │   └── dto/
│   │   │   │       ├── login.dto.ts
│   │   │   │       └── register.dto.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-user.dto.ts
│   │   │   │       └── update-user.dto.ts
│   │   │   │
│   │   │   ├── tasks/
│   │   │   │   ├── tasks.module.ts
│   │   │   │   ├── tasks.controller.ts
│   │   │   │   ├── tasks.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── task.dto.ts
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── ai.module.ts
│   │   │   │   ├── ai.controller.ts
│   │   │   │   ├── ai.service.ts
│   │   │   │   ├── ai.gateway.ts         # WebSocket gateway
│   │   │   │   ├── processors/
│   │   │   │   │   ├── chat.processor.ts
│   │   │   │   │   ├── rag.processor.ts
│   │   │   │   │   └── document.processor.ts
│   │   │   │   └── dto/
│   │   │   │       └── chat.dto.ts
│   │   │   │
│   │   │   ├── documents/
│   │   │   │   ├── documents.module.ts
│   │   │   │   ├── documents.controller.ts
│   │   │   │   ├── documents.service.ts
│   │   │   │   └── processors/
│   │   │   │       └── upload.processor.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.module.ts
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   └── analytics.service.ts
│   │   │   │
│   │   │   └── flashcards/
│   │   │       ├── flashcards.module.ts
│   │   │       ├── flashcards.controller.ts
│   │   │       ├── flashcards.service.ts
│   │   │       └── algorithms/
│   │   │           └── spaced-repetition.ts
│   │   │
│   │   ├── 🏢 SHARED MODULES
│   │   │   ├── database/
│   │   │   │   ├── database.module.ts
│   │   │   │   ├── database.providers.ts
│   │   │   │   ├── schema.ts              # Drizzle schema
│   │   │   │   └── migrations/
│   │   │   │       ├── 0000_initial.sql
│   │   │   │       └── 0001_vector_extension.sql
│   │   │   │
│   │   │   ├── redis/
│   │   │   │   ├── redis.module.ts
│   │   │   │   ├── redis.service.ts
│   │   │   │   └── redis.providers.ts
│   │   │   │
│   │   │   ├── queue/
│   │   │   │   ├── queue.module.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   └── processors/
│   │   │   │       ├── email.processor.ts
│   │   │   │       └── notification.processor.ts
│   │   │   │
│   │   │   └── storage/
│   │   │       ├── storage.module.ts
│   │   │       ├── storage.service.ts
│   │   │       └── storage.config.ts
│   │   │
│   │   ├── 🛠️ COMMON
│   │   │   ├── decorators/
│   │   │   │   ├── user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── filters/
│   │   │   │   ├── http-exception.filter.ts
│   │   │   │   └── validation.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   ├── cache.interceptor.ts
│   │   │   │   └── transform.interceptor.ts
│   │   │   ├── pipes/
│   │   │   │   └── validation.pipe.ts
│   │   │   └── middleware/
│   │   │       ├── logger.middleware.ts
│   │   │       └── rate-limit.middleware.ts
│   │   │
│   │   └── 🔧 CONFIG
│   │       ├── configuration.ts
│   │       ├── database.config.ts
│   │       ├── redis.config.ts
│   │       └── jwt.config.ts
│   │
│   ├── test/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── drizzle.config.ts
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
├── 🎨 FRONTEND (apps/web/)
│   ├── app/                       # Next.js 15.x App Router (React 19)
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page
│   │   ├── globals.css            # Global styles
│   │   │
│   │   ├── (auth)/                # Auth group route
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/           # Protected routes
│   │   │   ├── layout.tsx         # Dashboard layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── ai-tutor/
│   │   │   │   └── page.tsx
│   │   │   ├── flashcards/
│   │   │   │   └── page.tsx
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/                   # Auth API routes (Better Auth)
│   │       └── auth/
│   │           └── [...all]/
│   │               └── route.ts   # export const { GET, POST } = auth.handler
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   └── ProgressChart.tsx
│   │   ├── ai/
│   │   │   ├── ChatInterface.tsx
│   │   │   └── MessageBubble.tsx
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── lib/
│   │   ├── api/                   # API client
│   │   │   ├── client.ts
│   │   │   ├── auth.api.ts
│   │   │   ├── tasks.api.ts
│   │   │   └── ai.api.ts
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useQuery.ts
│   │   └── utils/
│   │       └── helpers.ts
│   │
│   ├── store/                     # Zustand stores
│   │   ├── authStore.ts
│   │   ├── taskStore.ts
│   │   └── uiStore.ts
│   │
│   ├── styles/
│   │   └── tailwind.css
│   │
│   ├── public/
│   │   └── assets/
│   │
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── 📚 SHARED LIBRARIES (libs/)
│   ├── common/
│   │   ├── types/
│   │   │   ├── user.types.ts
│   │   │   ├── task.types.ts
│   │   │   └── ai.types.ts
│   │   ├── constants/
│   │   │   └── app.constants.ts
│   │   └── utils/
│   │       └── validators.ts
│   │
│   └── ui-components/             # Shared UI components
│       └── src/
│
└── 🔧 INFRASTRUCTURE
    ├── docker/
    │   ├── api.Dockerfile
    │   ├── web.Dockerfile
    │   └── nginx.conf
    ├── k8s/
    │   ├── deployments/
    │   ├── services/
    │   └── ingress/
    └── scripts/
        ├── setup.sh
        └── migrate.sh
```

---

## 🚀 Enhanced Implementation Timeline (8-10 Weeks)

### Week 1: Monorepo Setup & Enhanced Database

#### Day 1-2: Monorepo Environment Setup
```bash
# 1. Create monorepo structure
mkdir study-teddy-enterprise && cd study-teddy-enterprise
npm init -y
mkdir apps libs infrastructure

# 2. Backend setup (NestJS 11.x, Node.js 22 LTS)
cd apps
npm i -g @nestjs/cli@latest
nest new api --package-manager npm
cd api
npm install @nestjs/config @nestjs/swagger @nestjs/websockets @nestjs/platform-socket.io
npm install drizzle-orm postgres dotenv redis bull @nestjs/bull
npm install -D drizzle-kit @types/pg @types/redis

# 3. Frontend setup (Next.js 15.x, React 19)
cd ../
npx create-next-app@latest web --typescript --tailwind --app
cd web
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install zustand axios socket.io-client lucide-react date-fns
npx shadcn-ui@latest init

# 4. Setup workspace
cd ../../
npm install -D nx @nx/workspace
npx nx init
```

#### Day 3: Enhanced Database Schema Setup
```typescript
// apps/api/src/database/schema.ts
import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer, vector, jsonb } from 'drizzle-orm/pg-core';

export const authProviderEnum = pgEnum('auth_provider', ['local', 'google']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  authProvider: authProviderEnum('auth_provider').default('local').notNull(),
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ... rest of schema
```

#### Day 4: Database Connection
```typescript
// backend/src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
```

#### Day 5: Environment Configuration
```env
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/studyteddy
BETTER_AUTH_SECRET=your-generated-secret-key
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3001

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
AUTH_TRUST_HOST=true
```

---

### Week 2: Enhanced Authentication & Redis Integration

#### Day 6-7: Enhanced JWT Authentication with Redis
```typescript
// apps/api/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async register(email: string, password: string, name: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [user] = await db.insert(users).values({
      email,
      passwordHash: hashedPassword,
      name,
      authProvider: 'local',
    }).returning();

    const token = this.generateToken(user);
    return { user, token };
  }

  async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
}
```

#### Day 8: Google OAuth Setup
```typescript
// backend/src/auth/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    
    let [user] = await db.select().from(users)
      .where(eq(users.googleId, profile.id));

    if (!user) {
      [user] = await db.insert(users).values({
        googleId: profile.id,
        email: emails[0].value,
        name: name.givenName + ' ' + name.familyName,
        avatarUrl: photos[0].value,
        authProvider: 'google',
      }).returning();
    }

    done(null, user);
  }
}
```

#### Day 9: Frontend Auth Components
```tsx
// frontend/components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Card>
  );
}
```

#### Day 10: Auth Guards & Middleware
```typescript
// backend/src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

// backend/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

### Week 3: Task Management + Real-time Features

#### Day 11-12: Task CRUD API
```typescript
// backend/src/tasks/tasks.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async getTasks(@CurrentUser() user: any) {
    return this.tasksService.getUserTasks(user.userId);
  }

  @Post()
  async createTask(
    @CurrentUser() user: any,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.createTask(user.userId, createTaskDto);
  }

  @Put(':id')
  async updateTask(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(id, user.userId, updateTaskDto);
  }

  @Delete(':id')
  async deleteTask(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.deleteTask(id, user.userId);
  }

  @Patch(':id/complete')
  async toggleComplete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.toggleComplete(id, user.userId);
  }
}
```

#### Day 13: Task Service Implementation
```typescript
// backend/src/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../db';
import { studyTasks } from '../db/schema';
import { eq, and, desc, lte } from 'drizzle-orm';

@Injectable()
export class TasksService {
  async getUserTasks(userId: string) {
    return await db
      .select()
      .from(studyTasks)
      .where(eq(studyTasks.userId, userId))
      .orderBy(desc(studyTasks.dueDate));
  }

  async getTodayTasks(userId: string) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(studyTasks)
      .where(
        and(
          eq(studyTasks.userId, userId),
          lte(studyTasks.dueDate, today),
          eq(studyTasks.completed, false)
        )
      );
  }

  async createTask(userId: string, data: CreateTaskDto) {
    const [task] = await db
      .insert(studyTasks)
      .values({
        userId,
        ...data,
      })
      .returning();
    
    return task;
  }

  async updateTask(taskId: string, userId: string, data: UpdateTaskDto) {
    const [updated] = await db
      .update(studyTasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(studyTasks.id, taskId),
          eq(studyTasks.userId, userId)
        )
      )
      .returning();
    
    if (!updated) {
      throw new NotFoundException('Task not found');
    }
    
    return updated;
  }

  async toggleComplete(taskId: string, userId: string) {
    const [task] = await db
      .select()
      .from(studyTasks)
      .where(
        and(
          eq(studyTasks.id, taskId),
          eq(studyTasks.userId, userId)
        )
      );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const [updated] = await db
      .update(studyTasks)
      .set({
        completed: !task.completed,
        updatedAt: new Date(),
      })
      .where(eq(studyTasks.id, taskId))
      .returning();

    return updated;
  }

  async deleteTask(taskId: string, userId: string) {
    const result = await db
      .delete(studyTasks)
      .where(
        and(
          eq(studyTasks.id, taskId),
          eq(studyTasks.userId, userId)
        )
      );

    return { success: true };
  }
}
```

#### Day 14-15: Frontend Task Components
```tsx
// frontend/components/tasks/task-list.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api/client';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      fetchTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return '';
    }
  };

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
              />
              <div>
                <h3 className={`font-medium ${task.completed ? 'line-through' : ''}`}>
                  {task.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {task.subject} • Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTask(task.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

### Week 4: AI Integration + WebSocket Implementation

#### Day 16-17: OpenAI Service
```typescript
// backend/src/ai/ai.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import { OpenAI } from 'openai';
import { db } from '../db';
import { aiChats } from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AIService {
  private openai: OpenAI;
  private readonly MAX_TOKENS = 500;
  private readonly MODEL = 'gpt-3.5-turbo';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chat(userId: string, message: string) {
    try {
      // Get recent chat history for context
      const history = await this.getChatHistory(userId, 5);
      
      const messages = [
        {
          role: 'system' as const,
          content: `You are Study Teddy, a friendly and helpful AI study assistant. 
                   You help students with their homework, explain concepts clearly, 
                   and provide study tips. Keep responses concise and student-friendly.`
        },
        ...history.flatMap(chat => [
          { role: 'user' as const, content: chat.message },
          { role: 'assistant' as const, content: chat.aiResponse }
        ]),
        { role: 'user' as const, content: message }
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages,
        max_tokens: this.MAX_TOKENS,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content || 'Sorry, I could not generate a response.';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Save to database
      const [saved] = await db.insert(aiChats).values({
        userId,
        message,
        aiResponse: response,
        tokensUsed,
      }).returning();

      return saved;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new HttpException('AI service temporarily unavailable', 503);
    }
  }

  async getChatHistory(userId: string, limit: number = 10) {
    return await db
      .select()
      .from(aiChats)
      .where(eq(aiChats.userId, userId))
      .orderBy(aiChats.createdAt)
      .limit(limit);
  }

  async generatePracticeQuestions(userId: string, topic: string, difficulty: string) {
    const prompt = `Generate 5 practice questions about ${topic} at ${difficulty} difficulty level. 
                   Format as numbered list with answers at the end.`;

    return this.chat(userId, prompt);
  }

  async explainConcept(userId: string, concept: string) {
    const prompt = `Explain ${concept} in simple terms that a student can understand. 
                   Include an example if helpful.`;

    return this.chat(userId, prompt);
  }
}
```

#### Day 18: AI Controller
```typescript
// backend/src/ai/ai.controller.ts
import { Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('chat')
  async chat(
    @CurrentUser() user: any,
    @Body() chatDto: ChatDto,
  ) {
    return this.aiService.chat(user.userId, chatDto.message);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.aiService.getChatHistory(user.userId, limit || 10);
  }

  @Post('practice')
  async generatePractice(
    @CurrentUser() user: any,
    @Body() body: { topic: string; difficulty: string },
  ) {
    return this.aiService.generatePracticeQuestions(
      user.userId,
      body.topic,
      body.difficulty,
    );
  }

  @Post('explain')
  async explainConcept(
    @CurrentUser() user: any,
    @Body() body: { concept: string },
  ) {
    return this.aiService.explainConcept(user.userId, body.concept);
  }
}
```

#### Day 18-19: WebSocket Gateway Implementation
```typescript
// apps/api/src/ai/ai.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AiService } from './ai.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private aiService: AiService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      console.log(`Client connected: ${client.id}, User: ${payload.sub}`);
    } catch (error) {
      console.log('Unauthorized connection');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat')
  async handleChat(
    @MessageBody() data: { message: string; context?: any },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.userId;

      // Send typing indicator
      client.emit('typing', { isTyping: true });

      // Process AI response
      const response = await this.aiService.chat(userId, data.message);

      // Send response
      client.emit('chat-response', {
        id: response.id,
        message: data.message,
        response: response.aiResponse,
        timestamp: response.createdAt,
      });

      // Stop typing indicator
      client.emit('typing', { isTyping: false });

    } catch (error) {
      client.emit('error', { message: 'Failed to process message' });
    }
  }

  @SubscribeMessage('join-study-room')
  async handleJoinStudyRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`study-room-${data.roomId}`);
    client.to(`study-room-${data.roomId}`).emit('user-joined', {
      userId: client.data.userId,
      socketId: client.id,
    });
  }
}
```

#### Day 20: Frontend AI Chat Interface with WebSocket
```tsx
// apps/web/components/ai/chat-interface.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useChatStore } from '@/store/chatStore';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, addMessage } = useChatStore();
  const { socket, isConnected } = useWebSocket('/ai');

  useEffect(() => {
    if (!socket) return;

    socket.on('chat-response', (response) => {
      addMessage({
        id: response.id,
        content: response.response,
        role: 'assistant',
        timestamp: new Date(response.timestamp),
      });
      setIsTyping(false);
    });

    socket.on('typing', ({ isTyping }) => {
      setIsTyping(isTyping);
    });

    socket.on('error', (error) => {
      console.error('Chat error:', error.message);
      setIsTyping(false);
    });

    return () => {
      socket.off('chat-response');
      socket.off('typing');
      socket.off('error');
    };
  }, [socket, addMessage]);

  const sendMessage = () => {
    if (!input.trim() || !socket || !isConnected) return;

    const userMessage = {
      id: Date.now().toString(),
      content: input,
      role: 'user' as const,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    socket.emit('chat', { message: input });
    setInput('');
    setIsTyping(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <span className="text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected || isTyping}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || !isConnected || isTyping}
          >
            Send
          </Button>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>
    </Card>
  );
}

// apps/web/lib/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

export function useWebSocket(namespace: string = '/') {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}${namespace}`, {
      auth: {
        token: accessToken,
      },
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [accessToken, namespace]);

  return {
    socket: socketRef.current,
    isConnected,
  };
}

// apps/web/store/chatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({ messages: state.messages.slice(-50) }), // Keep last 50 messages
    }
  )
);
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';
import { api } from '@/lib/api/client';

interface Message {
  id: string;
  message: string;
  aiResponse: string;
  createdAt: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadHistory = async () => {
    try {
      const response = await api.get('/ai/history');
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setLoading(true);

    // Add temporary user message
    const tempMessage = {
      id: 'temp',
      message: userMessage,
      aiResponse: 'Thinking...',
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const response = await api.post('/ai/chat', { message: userMessage });
      setMessages(prev => 
        prev.map(msg => 
          msg.id === 'temp' ? response.data : msg
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== 'temp'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Study Teddy AI Assistant
        </h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <div className="flex items-start gap-2">
                <User className="w-5 h-5 mt-1 text-blue-500" />
                <div className="bg-blue-50 rounded-lg p-3 flex-1">
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Bot className="w-5 h-5 mt-1 text-green-500" />
                <div className="bg-gray-50 rounded-lg p-3 flex-1">
                  <p className="text-sm whitespace-pre-wrap">{msg.aiResponse}</p>
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask a question..."
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

---

### Week 5: Document Processing & Vector Search

#### Day 21-22: Dashboard Service
```typescript
// backend/src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { db } from '../db';
import { studyTasks, studySessions, aiChats } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

@Injectable()
export class DashboardService {
  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get task statistics
    const taskStats = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where completed = true)`,
        overdue: sql<number>`count(*) filter (where due_date < ${today} and completed = false)`,
      })
      .from(studyTasks)
      .where(eq(studyTasks.userId, userId));

    // Get study time this week
    const studyTime = await db
      .select({
        totalMinutes: sql<number>`coalesce(sum(duration_minutes), 0)`,
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(studySessions.date, weekAgo)
        )
      );

    // Get AI chat count
    const chatCount = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(aiChats)
      .where(eq(aiChats.userId, userId));

    // Calculate streak
    const streak = await this.calculateStreak(userId);

    return {
      tasks: {
        total: taskStats[0]?.total || 0,
        completed: taskStats[0]?.completed || 0,
        overdue: taskStats[0]?.overdue || 0,
        completionRate: taskStats[0]?.total 
          ? Math.round((taskStats[0].completed / taskStats[0].total) * 100)
          : 0,
      },
      studyTime: {
        thisWeek: studyTime[0]?.totalMinutes || 0,
        daily: Math.round((studyTime[0]?.totalMinutes || 0) / 7),
      },
      aiChats: chatCount[0]?.count || 0,
      streak: streak,
    };
  }

  async calculateStreak(userId: string) {
    const sessions = await db
      .select({
        date: studySessions.date,
      })
      .from(studySessions)
      .where(eq(studySessions.userId, userId))
      .orderBy(sql`date desc`);

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    return streak;
  }

  async getWeeklyOverview(userId: string) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const dailyStats = await db
      .select({
        date: sql<string>`date(${studySessions.date})`,
        minutes: sql<number>`sum(duration_minutes)`,
        tasksCompleted: sql<number>`count(distinct task_id)`,
      })
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(studySessions.date, weekAgo)
        )
      )
      .groupBy(sql`date(${studySessions.date})`);

    return dailyStats;
  }
}
```

#### Day 23: Dashboard Frontend
```tsx
// frontend/app/(dashboard)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskList } from '@/components/tasks/task-list';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { api } from '@/lib/api/client';

interface DashboardStats {
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {stats && <StatsCards stats={stats} />}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList filter="today" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Study Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Weekly Study Time</p>
                <p className="text-2xl font-bold">
                  {Math.floor((stats?.studyTime.thisWeek || 0) / 60)}h {(stats?.studyTime.thisWeek || 0) % 60}m
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Streak</p>
                <p className="text-2xl font-bold">{stats?.streak || 0} days 🔥</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

### Week 6: Advanced Analytics & Flashcards

#### Day 24-25: Unit Tests
```typescript
// backend/test/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should hash password on registration', async () => {
    const spy = jest.spyOn(bcrypt, 'hash');
    await service.register('test@test.com', 'password', 'Test User');
    expect(spy).toHaveBeenCalledWith('password', 10);
  });

  it('should generate JWT token on login', async () => {
    await service.login('test@test.com', 'password');
    expect(jwtService.sign).toHaveBeenCalled();
  });
});
```

#### Day 26: API Rate Limiting
```typescript
// backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );

  // AI endpoint specific rate limiting
  app.use(
    '/ai/*',
    rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10, // limit each IP to 10 AI requests per minute
    }),
  );

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Study Teddy API')
    .setDescription('The Study Teddy API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
```

#### Day 27-28: Performance Optimization
```typescript
// backend/src/common/interceptors/cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}-${request.url}`;

    if (this.cache.has(key)) {
      return of(this.cache.get(key));
    }

    return next.handle().pipe(
      tap(response => {
        this.cache.set(key, response);
        // Clear cache after 5 minutes
        setTimeout(() => this.cache.delete(key), 5 * 60 * 1000);
      }),
    );
  }
}
```

---

### Week 7: Performance & Caching Optimization

#### Day 25-26: Redis Caching Implementation
```typescript
// apps/api/src/redis/redis.service.ts
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.set(key, serialized, 'EX', ttl);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### Day 27-28: Database Query Optimization
```sql
-- Optimize frequent queries with proper indexes
CREATE INDEX CONCURRENTLY idx_tasks_user_status_due
ON tasks(user_id, completed, due_date)
WHERE completed = false;

-- Materialized view for analytics
CREATE MATERIALIZED VIEW user_analytics AS
SELECT
  u.id as user_id,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.completed) as completed_tasks,
  AVG(ss.duration_minutes) as avg_session_duration
FROM users u
LEFT JOIN tasks t ON u.id = t.user_id
LEFT JOIN study_sessions ss ON u.id = ss.user_id
GROUP BY u.id;
```

---

### Week 8: Enhanced Testing & Security

#### Day 29-30: Comprehensive Testing Suite
```typescript
// apps/api/test/integration/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.access_token).toBeDefined();
      });
  });
});
```

#### Day 31-32: Security Hardening
```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );

  // AI endpoint specific rate limiting
  app.use(
    '/ai/*',
    rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10, // limit each IP to 10 AI requests per minute
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

---

### Week 9: Production Deployment & Infrastructure

#### Day 33-34: Enhanced Docker Setup
```dockerfile
# infrastructure/docker/api.Dockerfile
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --only=production

FROM base AS builder
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci

# Copy source code
COPY apps/api ./apps/api
COPY libs ./libs

# Build application
RUN npm run build:api

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/drizzle ./drizzle

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
```

```dockerfile
# infrastructure/docker/web.Dockerfile
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --only=production

FROM base AS builder
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# Copy source code
COPY apps/web ./apps/web
COPY libs ./libs

# Build application
RUN npm run build:web

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml - Development Environment
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: studyteddy-postgres
    environment:
      POSTGRES_USER: studyteddy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: studyteddy_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - studyteddy
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U studyteddy"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: studyteddy-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - studyteddy
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  api:
    build:
      context: .
      dockerfile: infrastructure/docker/api.Dockerfile
    container_name: studyteddy-api
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://studyteddy:${DB_PASSWORD}@postgres:5432/studyteddy_db
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      FRONTEND_URL: http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "3001:3000"
    networks:
      - studyteddy
    volumes:
      - ./apps/api:/app/apps/api
      - ./libs:/app/libs
      - /app/node_modules
    command: npm run start:dev

  web:
    build:
      context: .
      dockerfile: infrastructure/docker/web.Dockerfile
    container_name: studyteddy-web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: http://localhost:3000
    depends_on:
      - api
    ports:
      - "3000:3000"
    networks:
      - studyteddy
    volumes:
      - ./apps/web:/app/apps/web
      - ./libs:/app/libs
      - /app/node_modules
    command: npm run dev

  nginx:
    image: nginx:alpine
    container_name: studyteddy-nginx
    volumes:
      - ./infrastructure/docker/nginx.conf:/etc/nginx/nginx.conf
      - ./infrastructure/ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - web
    networks:
      - studyteddy

volumes:
  postgres_data:
  redis_data:

networks:
  studyteddy:
    driver: bridge
```

```nginx
# infrastructure/docker/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    upstream web {
        server web:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=100r/m;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Main web application
    server {
        listen 80;
        server_name localhost studyteddy.local;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # Rate limiting
        limit_req zone=general burst=20 nodelay;

        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API routes
        location /api/ {
            limit_req zone=api burst=5 nodelay;

            proxy_pass http://api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # WebSocket support
        location /socket.io/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

#### Day 31-32: CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          curl -fsSL https://railway.app/install.sh | sh
          railway up --service backend

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

#### Day 33-35: Production Setup
```bash
# Production environment setup

# 1. Database (Managed PostgreSQL 17 / pgvector)
railway login
railway init
railway add postgresql
railway up

# 2. Backend deployment (Railway/Render/Fly.io)
cd backend
railway up

# 3. Frontend deployment (Vercel)
cd frontend
vercel --prod

# 4. Domain setup
# - Point studyteddy.com to Vercel
# - Configure SSL certificates
# - Setup subdomain api.studyteddy.com for backend

# 5. Monitoring setup
# - Setup Sentry for error tracking
# - Configure DataDog for performance monitoring
# - Setup uptime monitoring with UptimeRobot
```

---

### Week 10: Monitoring & Final Optimization

#### Day 35-36: Production Monitoring Setup
```typescript
// apps/api/src/monitoring/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }
}
```

#### Day 37-38: Performance Monitoring & Analytics
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

#### Day 39-40: Final Optimization & Launch Preparation
```bash
# Final production checklist
# 1. Load testing with Artillery
npm install -g artillery
artillery run load-test.yml

# 2. Security audit
npm audit --audit-level high

# 3. Performance profiling
npm run build:analyze

# 4. Database backup strategy
pg_dump studyteddy_prod > backup_$(date +%Y%m%d).sql

# 5. SSL certificate setup
certbot --nginx -d studyteddy.com -d api.studyteddy.com
```

---

## 🚀 Enhanced Platform Capabilities

### 📄 Document Processing & Vector Search

**Intelligent Document Analysis**
- Multi-format support (PDF, DOCX, TXT, MD)
- Automatic content extraction and chunking
- Vector embeddings generation with OpenAI
- Semantic search across all user documents
- AI-powered document summarization
- Key concept extraction and tagging

```typescript
// Document processing workflow
const processDocument = async (fileBuffer: Buffer, mimeType: string) => {
  // 1. Extract text content
  const content = await extractContent(fileBuffer, mimeType);

  // 2. Chunk content for optimal embedding
  const chunks = chunkContent(content, 500, 50);

  // 3. Generate embeddings
  const embeddings = await Promise.all(
    chunks.map(chunk => generateEmbedding(chunk))
  );

  // 4. Store in vector database
  await storeEmbeddings(documentId, chunks, embeddings);

  // 5. Generate summary and extract concepts
  const summary = await generateSummary(content);
  const concepts = await extractKeyConcepts(content);

  return { summary, concepts, chunks: chunks.length };
};
```

### 🧠 Spaced Repetition Learning System

**Adaptive Flashcard Algorithm**
- SM-2 (SuperMemo) algorithm implementation
- Difficulty adjustment based on performance
- Optimal review scheduling
- Progress tracking and analytics
- Custom deck creation and sharing

```typescript
// Spaced repetition algorithm
const calculateNextReview = (
  quality: number, // 0-5 performance rating
  easeFactor: number,
  interval: number,
  repetitions: number
) => {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
  };
};
```

### 📊 Advanced Analytics Dashboard

**Comprehensive Learning Insights**
- Study time tracking with focus metrics
- Task completion patterns analysis
- Knowledge retention curves
- Performance predictions
- Personalized study recommendations
- Progress visualization and reporting

**Real-time Metrics**
- Live study session monitoring
- Attention and focus scoring
- Break recommendations
- Productivity optimization tips
- Goal tracking and achievement badges

### 🔄 Real-time Collaboration Features

**Live Study Sessions**
- WebSocket-powered real-time chat
- Screen sharing and collaborative whiteboards
- Study room creation and management
- Peer-to-peer learning sessions
- Group task coordination
- Live progress synchronization

```typescript
// Real-time collaboration example
@SubscribeMessage('join-study-room')
async handleJoinStudyRoom(
  @MessageBody() data: { roomId: string },
  @ConnectedSocket() client: Socket,
) {
  await client.join(`study-room-${data.roomId}`);

  // Notify other participants
  client.to(`study-room-${data.roomId}`).emit('user-joined', {
    userId: client.data.userId,
    userName: client.data.userName,
    timestamp: new Date(),
  });

  // Send current room state
  const roomState = await this.getRoomState(data.roomId);
  client.emit('room-state', roomState);
}
```

### 🤖 Advanced AI Capabilities

**Contextual Learning Assistant**
- Conversation memory and context retention
- Subject-specific knowledge base
- Adaptive teaching methodologies
- Personalized study plan generation
- Intelligent question generation
- Real-time doubt resolution

**Multi-modal AI Support**
- Text-based Q&A and explanations
- Image analysis and interpretation
- Code review and debugging assistance
- Mathematical problem solving
- Language learning support
- Citation and reference management

### ⚙️ Background Job Processing

**Automated Task Management**
- Document processing queue
- Email notification system
- Progress report generation
- Data backup and synchronization
- Performance analytics computation
- System health monitoring

```typescript
// Background job processing with Bull Queue
@Process('document-analysis')
async handleDocumentAnalysis(job: Job<DocumentProcessingJob>) {
  const { documentId, userId } = job.data;

  try {
    // Update job progress
    await job.updateProgress(10);

    // Process document
    const analysis = await this.processDocument(documentId);
    await job.updateProgress(50);

    // Generate insights
    const insights = await this.generateInsights(analysis);
    await job.updateProgress(80);

    // Notify user
    await this.notificationService.send(userId, {
      type: 'document-ready',
      data: { documentId, insights },
    });

    await job.updateProgress(100);

    return { success: true, insights };
  } catch (error) {
    await this.logError(error, job.data);
    throw error;
  }
}
```

### 🔒 Enterprise Security Features

**Advanced Security Implementation**
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- API rate limiting and throttling
- SQL injection prevention
- XSS protection with CSP headers
- Encrypted data storage
- Audit logging and compliance
- GDPR compliance features

### 📱 Progressive Web App (PWA)

**Offline-First Experience**
- Service worker implementation
- Offline task management
- Background synchronization
- Push notifications
- App-like experience on mobile
- Cross-platform compatibility

---

## 🎯 Enhanced Deliverables Checklist

### Week 1: Monorepo Setup & Enhanced Database ✓
- [ ] Monorepo structure with Nx workspace
- [ ] Enhanced database schema with pgvector
- [ ] Redis integration setup
- [ ] Environment configuration
- [ ] Development tooling setup

### Week 2: Enhanced Authentication & Redis ✓
- [ ] JWT authentication with refresh tokens
- [ ] Redis session management
- [ ] Google OAuth integration
- [ ] Enhanced auth guards and middleware
- [ ] User management system

### Week 3: Task Management + Real-time Features ✓
- [ ] Advanced task CRUD operations
- [ ] Real-time task synchronization
- [ ] Enhanced task UI with filters
- [ ] Calendar integration
- [ ] Task analytics and insights

### Week 4: AI Integration + WebSocket Implementation ✓
- [ ] OpenAI service integration
- [ ] WebSocket gateway implementation
- [ ] Real-time AI chat interface
- [ ] Context-aware conversations
- [ ] AI response streaming

### Week 5: Document Processing & Vector Search ✓
- [ ] Document upload and processing
- [ ] Vector embeddings generation
- [ ] Semantic search implementation
- [ ] Document summarization
- [ ] Knowledge extraction

### Week 6: Advanced Analytics & Flashcards ✓
- [ ] Spaced repetition algorithm
- [ ] Flashcard system implementation
- [ ] Advanced analytics dashboard
- [ ] Learning insights and recommendations
- [ ] Progress tracking and reporting

### Week 7: Performance & Caching Optimization ✓
- [ ] Redis caching implementation
- [ ] Database query optimization
- [ ] API response caching
- [ ] Performance monitoring
- [ ] Load testing and optimization

### Week 8: Enhanced Testing & Security ✓
- [ ] Comprehensive test suite
- [ ] E2E testing implementation
- [ ] Security hardening
- [ ] Rate limiting and throttling
- [ ] Vulnerability assessment

### Week 9: Production Deployment & Infrastructure ✓
- [ ] Enhanced Docker containerization
- [ ] NGINX load balancer setup
- [ ] Production environment configuration
- [ ] CI/CD pipeline implementation
- [ ] SSL certificate configuration

### Week 10: Monitoring & Final Optimization ✓
- [ ] Production monitoring setup
- [ ] Performance analytics implementation
- [ ] Error tracking and logging
- [ ] Final optimization and tuning
- [ ] Launch preparation and documentation

---

## 📊 Success Metrics

### Technical Metrics
- ✅ API response time < 200ms
- ✅ Page load time < 2 seconds
- ✅ 99.9% uptime
- ✅ Zero critical security vulnerabilities

### User Metrics (First Month)
- ✅ 100+ registered users
- ✅ 50+ weekly active users
- ✅ 500+ AI interactions
- ✅ 70%+ task completion rate

---

## 🚀 Post-Launch Roadmap

### Month 2
- DeepSeek integration
- File upload for study materials
- Advanced AI memory/context
- Email notifications

### Month 3
- Study plan generation
- Spaced repetition algorithm
- Mobile responsive improvements
- Premium tier features

### Month 4+
- Mobile app development
- Study groups feature
- Video tutorials
- Marketplace for study materials

---

**Project Status:** Ready for Implementation  
**Estimated Completion:** 6-8 weeks  
**Team Required:** 1-2 Full-stack developers