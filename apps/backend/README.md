# Study Teddy Backend

**Version:** 1.0 MVP
**Framework:** NestJS 11.1.6
**Timeline:** 6-8 weeks

## Description

NestJS backend for Study Teddy - An AI-powered study planner that helps students organize their study time and get instant help with questions.

## Tech Stack

- **Framework**: NestJS 11.1.6 with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT + Google OAuth with Passport.js
- **AI Integration**: OpenAI GPT-3.5 Turbo
- **Validation**: class-validator

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your database and API credentials
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/studyteddy

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Environment Setup

Create `apps/backend/.env` with:

```
PORT=3001
DATABASE_URL=postgresql://studyteddy:studyteddy_dev@localhost:5432/studyteddy_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=15m
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
EXCHANGE_SHARED_SECRET=exchange-dev-secret
```

## Database Setup

```bash
# Generate database migrations
npm run db:generate

# Push schema to database
npm run db:push

# Optional: Open Drizzle Studio for database management
npm run db:studio
```

## Running the app

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout

### Study Tasks
- `GET /api/tasks` - Get user's tasks
- `GET /api/tasks/today` - Get today's tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/complete` - Toggle task completion

### AI Chat
- `POST /api/ai/chat` - Send message to AI
- `GET /api/ai/history` - Get chat history
- `DELETE /api/ai/history/:id` - Delete chat message
- `POST /api/ai/practice-questions` - Generate practice questions

### Dashboard
- `GET /api/dashboard/stats` - Get study statistics
- `GET /api/dashboard/streak` - Get current streak
- `GET /api/dashboard/weekly` - Get weekly overview

## Project Structure

```
src/
├── db/                    # Database configuration and schema
│   ├── schema.ts         # Drizzle schema definitions
│   └── index.ts          # Database connection
├── modules/              # Feature modules
│   ├── auth/            # Authentication module
│   ├── users/           # Users module
│   ├── tasks/           # Study tasks module
│   ├── ai/              # AI chat module
│   └── dashboard/       # Dashboard module
├── common/              # Shared utilities
│   ├── guards/          # Auth guards
│   ├── decorators/      # Custom decorators
│   └── pipes/           # Validation pipes
├── app.module.ts        # Main app module
└── main.ts              # Application entry point
```

## Features

### MVP Features
- ✅ User authentication (Email/Password + Google OAuth)
- ✅ Study task management (CRUD operations)
- ✅ AI study assistant with OpenAI integration
- ✅ Dashboard with study statistics
- ✅ Study streak tracking
- ✅ Weekly overview

### Database Schema
- **Users**: Authentication and profile data
- **Study Tasks**: Task management with priorities
- **AI Chats**: Chat history with token tracking
- **Study Sessions**: Time tracking for streaks

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Input validation with class-validator
- CORS configuration
- Environment variable protection

## Development

```bash
# Watch mode
npm run start:dev

# Debug mode
npm run start:debug

# Run tests
npm run test

# Run e2e tests
npm run test:e2e
```

## License

Private - Study Teddy MVP
