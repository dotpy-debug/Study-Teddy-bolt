---
inclusion: always
---

---

## inclusion: always

# Study Teddy - Architecture & Code Conventions

## Project Structure

Monorepo with two main applications:

- **Backend**: `apps/backend/` - NestJS API server with PostgreSQL
- **Frontend**: `apps/frontend/` - Next.js 14+ with App Router

## File Naming Conventions

### Backend (NestJS)

- Files: `kebab-case.suffix.ts` (e.g., `user.service.ts`, `auth.controller.ts`)
- Classes: `PascalCase` with descriptive suffixes (`UserService`,
  `AuthController`)
- Modules: Feature-based folders with co-located DTOs and specs
- Database: `snake_case` for table/column names, `camelCase` for TypeScript
  entities

### Frontend (Next.js)

- Components: `PascalCase.tsx` files and exports (`TaskCard.tsx`)
- Pages: App Router conventions (`page.tsx`, `layout.tsx`, `loading.tsx`,
  `error.tsx`)
- Hooks: `use-kebab-case.ts` in `hooks/` directory
- Utils: `camelCase.ts` files in `lib/` directory
- Types: Centralized in `types/` with descriptive names

## Architecture Patterns

### Backend Structure

```
src/
├── modules/           # Feature modules (users, tasks, ai, auth)
├── common/           # Shared services, guards, middleware
├── db/              # Database schema and migrations
└── main.ts          # Application bootstrap
```

### Frontend Structure

```
app/                 # Next.js App Router pages
components/          # Reusable UI components
├── ui/             # shadcn/ui base components
├── forms/          # Form components with validation
└── [feature]/      # Feature-specific components
lib/                # Utilities and API clients
hooks/              # Custom React hooks
types/              # TypeScript type definitions
```

## Code Standards

### Backend Patterns

- **Modules**: Each feature gets its own NestJS module with controller, service,
  DTOs
- **Services**: Business logic layer, constructor injection for dependencies
- **DTOs**: Use class-validator decorators, co-locate with controllers
- **Guards**: JWT authentication for protected routes
- **Database**: Drizzle ORM with schema in `src/db/schema.ts`
- **Testing**: `.spec.ts` for unit tests, `.e2e-spec.ts` for integration tests

### Frontend Patterns

- **Components**: Functional components with TypeScript interfaces
- **Server/Client**: Prefer Server Components, use `"use client"` only when
  necessary
- **State Management**: React hooks and Context API, avoid prop drilling
- **API Calls**: Centralized in `lib/api/` with error handling
- **Forms**: React Hook Form with Zod validation schemas
- **Styling**: Tailwind CSS with shadcn/ui components

### Database Conventions

- Primary keys: UUID type (`id: uuid().primaryKey()`)
- Timestamps: `createdAt` and `updatedAt` on all entities
- Relations: Proper foreign key constraints with cascade rules
- Migrations: Use `drizzle-kit` for schema changes

### API Design

- RESTful endpoints with consistent naming
- Response format: `{ data: T, message?: string, success: boolean }`
- HTTP status codes: 200 (success), 201 (created), 400 (bad request), 401
  (unauthorized), 404 (not found), 500 (server error)
- Validation: Use DTOs with class-validator decorators

## Development Rules

- **TypeScript**: Strict mode enabled, no `any` types
- **Error Handling**: Always handle errors gracefully with user-friendly
  messages
- **Testing**: Write tests for all services and components
- **Performance**: Implement pagination for lists, optimize database queries
- **Security**: Validate all inputs, sanitize outputs, use JWT for
  authentication
