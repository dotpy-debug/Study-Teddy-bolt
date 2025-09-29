### Pythoughts v2 – Architecture, Configs, and Schema Reference

This document captures the configuration and design schema that inform Docker, Nixpacks, Bun/Next.js setup, Drizzle ORM, and app structure. Use it as a blueprint to reproduce or reason about the project configuration.

## Runtime stack
- **Runtime**: Bun 1.x
- **Framework**: Next.js 15 (App Router)
- **DB**: PostgreSQL (via `postgres` and Drizzle ORM)
- **Auth**: better-auth (+ drizzle adapter, username + email OTP + captcha plugins)
- **Styling**: Tailwind CSS v4 (PostCSS plugin), shadcn/ui primitives
- **Data fetching**: TanStack Query

## Docker
- Multi-stage build using `oven/bun:1` → `oven/bun:1-slim`
- Build-time ARG/ENV: `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DATABASE_URL`
- Copies `.next`, `node_modules`, `package.json`, `public`, `drizzle` from builder
- Exposes port 3000; start command: `bun run start` (runs migrations `db:push` before Next start)

Example runtime env for container:
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=postgres://user:pass@host:5432/dbname`
- `BETTER_AUTH_SECRET=...` (required by better-auth)
- `RESEND_API_KEY=...`, `RESEND_FROM_EMAIL=...` (email OTP)
- `TURNSTILE_SECRET_KEY=...`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY=...`
- `NEXT_PUBLIC_BETTER_AUTH_URL=https://your.domain`

## Nixpacks
`nixpacks.toml` phases:
- setup: installs `bun`, `nodejs`
- install: `bun install`, `bun add -D lightningcss-linux-x64-gnu`
- build: `bun run build`
- start: `bun run start`

## Package scripts and lockfiles
- Lockfiles: `bun.lock` and `package-lock.json` are present; Bun will honor `bun.lock` during `bun install --frozen-lockfile` (Dockerfile).
- Scripts:
  - `dev`: `next dev --turbopack`
  - `build`: `next build`
  - `start`: `bun run db:push && bun run next start`
  - `lint`: `next lint`
  - `db:generate`: `drizzle-kit generate`
  - `db:migrate`: `drizzle-kit migrate`
  - `db:push`: `drizzle-kit push`
  - `db:studio`: `drizzle-kit studio`

Key dependencies:
- runtime: `next@15.3.4`, `react@19`, `drizzle-orm@0.44.2`, `postgres@3`, `better-auth`, `resend`, `@tanstack/react-query`
- dev: `drizzle-kit@0.31.3`, `eslint@9`, `tailwindcss@4`, `lightningcss`

## Drizzle ORM
- Config: `drizzle.config.ts`
  - `schema: ./src/db/schema.ts`
  - `out: ./drizzle`
  - dialect: `postgresql`
  - credentials: `DATABASE_URL`

- Connection: `src/db/index.ts`
  - `db = drizzle(postgres(DATABASE_URL), { schema })`

### Schema
- `user`
  - `id text PK`
  - `name text`
  - `email text not null unique`
  - `email_verified boolean not null default false`
  - `image text`
  - `created_at timestamp not null default now()`
  - `updated_at timestamp not null default now()`
  - `username text unique`
  - `display_username text`

- `session`
  - `id text PK`
  - `expires_at timestamp not null`
  - `token text not null unique`
  - `created_at timestamp not null`
  - `updated_at timestamp not null`
  - `ip_address text`
  - `user_agent text`
  - `user_id text not null → user(id) on delete cascade`

- `account`
  - `id text PK`
  - `account_id text not null`
  - `provider_id text not null`
  - `user_id text not null → user(id) on delete cascade`
  - `access_token text`
  - `refresh_token text`
  - `id_token text`
  - `access_token_expires_at timestamp`
  - `refresh_token_expires_at timestamp`
  - `scope text`
  - `password text`
  - `created_at timestamp not null`
  - `updated_at timestamp not null`

- `verification`
  - `id text PK`
  - `identifier text not null`
  - `value text not null`
  - `expires_at timestamp not null`
  - `created_at timestamp default now()`
  - `updated_at timestamp default now()`

- `pythoughts`
  - `id text PK default uuid`
  - `message text not null`
  - `user_id text not null → user(id) on delete cascade`
  - `reply_to_id text`
  - `created_at timestamp not null default now()`

- `user_preferences`
  - `id text PK default uuid`
  - `user_id text not null → user(id) on delete cascade`
  - `ignored_users text not null default '[]'` (JSON array of user IDs)
  - `created_at timestamp not null default now()`
  - `updated_at timestamp not null default now()`

## Auth (better-auth)
- Adapter: `drizzleAdapter(db, { provider: 'pg' })`
- Email/password: enabled; requireEmailVerification=false (login after signup allowed)
- Plugins: `username()`, `emailOTP()` with custom Resend mailer (verification on signup), `captcha()` with Cloudflare Turnstile
- Client: `NEXT_PUBLIC_BETTER_AUTH_URL` baseURL; `useSession`, `signIn`, `signUp`, `signOut`

Required env for auth:
- `BETTER_AUTH_SECRET`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

## App structure (Next.js App Router)
- `src/app/page.tsx`: main feed with pagination, OTP verification flow, ignored-user filter, modals
- `src/app/user/[username]/page.tsx`: user profile feed (server actions for data)
- `src/app/profile/page.tsx`: settings page (ignored users list, change password)
- `src/app/api/auth/[...all]/route.ts`: better-auth handlers
- Global layout: `src/app/layout.tsx` adds `QueryProvider` and background canvas

## Server actions
- `src/actions/pythoughts.ts`:
  - `getPythoughtsEntries(page, limit)`
  - `getUserPosts(userId, page, limit)`
  - `createPythoughtsEntry(message, replyToId?)` (requires session + verified email; profanity guard)
- `src/actions/preferences.ts`:
  - `getUserPreferences()` (creates default if missing)
  - `updateIgnoredUsers(usernames)` (stores by ID JSON in `user_preferences`)
  - `getUserIdByUsername(username)`
- `src/actions/auth.ts`:
  - `signUpWithEmail(email, password, username, captchaToken)`
  - `changePassword(currentPassword, newPassword)`

## Components
- `Navigation`: session-aware nav, auth modal, user menu
- `AuthForm`: sign in/up with Turnstile captcha and username validation
- `NewMessageForm`: input + submit
- `PythoughtsEntry`: entry display, reply UI, ignore action
- `NeuralBackground`: interactive canvas background
- shadcn/ui primitives: `Button`, `Dialog`, `DropdownMenu`

## Styling and UX
- Tailwind CSS v4 with `@tailwindcss/postcss` and CSS variables in `src/app/globals.css` for light/dark
- Fonts: Geist (sans + mono)

## Middleware
- `src/middleware.ts`: simple request logging + `x-middleware-request-id` header; matcher excludes Next static assets

## TypeScript and Next config
- `tsconfig.json`: path alias `@/*` → `./src/*`, bundler resolution
- `next.config.ts`: disables ESLint during builds (`ignoreDuringBuilds: true`)

## Environment variables (summary)
- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`
- Optional/Recommended: `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `PORT`

## Local development
1) `bun install`
2) Create `.env.local` with the env vars above
3) Apply schema: `bun run db:push`
4) `bun run dev`

## Deployment notes
- Docker or Nixpacks both supported; both run `bun run build` then `bun run start`
- Ensure DB is reachable and env vars are injected; `start` runs Drizzle `push` before `next start`


