# Study Teddy 1.0 — Product Requirements Document

**Status**: Ready for Development
**Owner**: Product Team
**Version**: 1.1 (Adds Subject Tab + Focus Study Sessions; puts full schema & structure up front)

---

## 0) System Structure & Tech Stack (Up Front)

### 0.1 Tech Stack (Simple, one-repo)

* **Framework/Runtime**: Next.js 15 (App Router) + React 19 + TypeScript (strict)
* **Data**: PostgreSQL + Drizzle ORM (drizzle‑kit migrations)
* **Auth**: Better Auth (email OTP + OAuth: Google, Microsoft, GitHub)
* **Email**: Resend (verification, weekly digest)
* **AI Providers**: DeepSeek‑V3 (default), DeepSeek‑Coder (code), OpenAI GPT‑4/4o‑mini (heavy/complex fallback)
* **Calendar**: Google Calendar (read busy, write to our own calendar)
* **State**: React Server Components + React Query for client mutations
* **UI**: Tailwind CSS + shadcn/ui
* **Monitoring**: Sentry + basic Web Vitals
* **Hosting**: Vercel (web/API); Postgres on Neon/Supabase; Redis optional later

### 0.2 Monorepo/Folder Structure (single app)

```
/ (repo root)
├─ src/
│  ├─ app/                      # Next.js App Router
│  │  ├─ (dashboard)/dashboard  # RSC pages
│  │  ├─ subjects/              # Subject Tab
│  │  ├─ tasks/                 # Tasks pages (List/Kanban)
│  │  ├─ focus/                 # Focus Study Sessions
│  │  ├─ calendar/              # Planner + connect
│  │  ├─ api/                   # Route Handlers
│  │  │  ├─ subjects
│  │  │  ├─ tasks
│  │  │  ├─ subtasks
│  │  │  ├─ focus
│  │  │  ├─ calendar
│  │  │  ├─ ai
│  │  │  └─ notifications
│  ├─ db/
│  │  ├─ schema.ts              # Drizzle schema
│  │  └─ index.ts               # db client
│  ├─ lib/                      # utils (auth, ai router, nl parse, dates)
│  ├─ components/               # ui components (cards, forms, kanban, timer)
│  ├─ features/                 # cohesive feature modules (tasks, focus, subjects)
│  └─ styles/
├─ drizzle/                     # generated SQL migrations
├─ public/                      # icons, manifest, sounds
├─ .env.example
└─ config files (tsconfig, drizzle.config, etc.)
```

### 0.3 API Surface (Route Handlers)

* Auth (per Better Auth lib)
* `GET /api/me`
* `GET/POST /api/subjects` | `PATCH/DELETE /api/subjects/:id`
* `GET/POST /api/tasks` | `PATCH/DELETE /api/tasks/:id`
* `POST /api/subtasks` | `PATCH/DELETE /api/subtasks/:id`
* `POST /api/focus/start` | `POST /api/focus/stop` | `POST /api/focus/schedule`
* `POST /api/ai/taskify` | `POST /api/ai/breakdown` | `POST /api/ai/tutor`
* `POST /api/calendar/connect` | `POST /api/calendar/schedule`
* `GET /api/notifications` | `POST /api/notifications/read`
* `GET /api/analytics`

---

## 1) Full Data Schema (Drizzle‑first)

> Keep simple but complete for v1.1. All timestamps UTC; user locale/timezone in `users.settings_json`.

### 1.1 Core Tables

* **users**

  * `id` (pk)
  * `email` (unique), `name`
  * `settings_json` (timezone, quiet hours, ui prefs, nl parse defaults)
  * `created_at`

* **subjects** *(Subject Tab primary table)*

  * `id` (pk)
  * `user_id` (fk → users)
  * `name` (e.g., Physics, History)
  * `color` (hex)
  * `icon` (slug from icon set)
  * `goal_json` (optional: GPA target, target hours/week)
  * `resources_json` (links/refs array)
  * `created_at`

* **tasks**

  * `id` (pk)
  * `user_id` (fk)
  * `subject_id` (fk → subjects, nullable)
  * `title`, `notes`
  * `status` (`todo|doing|review|done`)
  * `priority` (`low|med|high`)
  * `estimate_min` (int)
  * `due_at` (timestamp, nullable)
  * `scheduled_start` (timestamp, nullable)
  * `scheduled_end` (timestamp, nullable)
  * `created_at`, `updated_at`

* **subtasks**

  * `id` (pk)
  * `task_id` (fk → tasks)
  * `title`
  * `done` (bool)
  * `created_at`, `updated_at`

* **focus_sessions** *(Focus Study Sessions)*

  * `id` (pk)
  * `user_id` (fk)
  * `task_id` (fk → tasks, nullable)  # session may be independent of a task
  * `subject_id` (fk → subjects, nullable)
  * `preset_id` (fk → focus_presets, nullable)
  * `started_at`, `ended_at` (timestamps)
  * `effective_minutes` (int)  # computed
  * `notes` (text, optional)

* **focus_presets** *(user quick presets)*

  * `id` (pk)
  * `user_id` (fk)
  * `name` (e.g., “Pomodoro 25/5”, “Deep 50/10”)
  * `work_min` (int)
  * `break_min` (int)
  * `cycles` (int, default 1)  # number of work-break cycles
  * `sound` (`rain|cafe|brown|none`)
  * `created_at`

* **goals**

  * `id` (pk)
  * `user_id` (fk)
  * `title`, `target_date`
  * `progress_json`
  * `created_at`

* **calendar_accounts**

  * `id` (pk)
  * `user_id` (fk)
  * `provider` (`google`)
  * `external_id` (calendar id)
  * `access_token_hash` `refresh_token_hash`
  * `sync_state_json`
  * `created_at`

* **notifications**

  * `id` (pk)
  * `user_id` (fk)
  * `kind` (`system|tasks|focus`)
  * `payload_json`
  * `read_at` (nullable)
  * `created_at`

* **ai_usage_log**

  * `id` (pk)
  * `user_id` (fk)
  * `provider` (`deepseek|openai`), `model`
  * `tokens_in`, `tokens_out`, `latency_ms`
  * `created_at`

### 1.2 Indices & Constraints (essentials)

* `idx_tasks_user_status` on `(user_id, status)`
* `idx_tasks_user_due` on `(user_id, due_at)`
* `idx_focus_sessions_user_started` on `(user_id, started_at)`
* `idx_subjects_user_name_unique` on `(user_id, lower(name))` (unique)

---

## 2) Subject Tab — Feature Spec

### 2.1 Objectives

A dedicated space for creating, organizing, and analyzing subjects with light resources and per‑subject insights. Keep it simple and fast.

### 2.2 UX Structure

* **Subjects Home (/subjects)**

  * Header: “Your Subjects” + **New Subject** button
  * Grid/List of subject cards: color, icon, name, hours this week, tasks due soon
  * Filters: All | With upcoming tasks | Most time this week

* **Subject Detail (/subjects/[id])**

  * Header: name, color, icon; quick edit
  * Tabs: **Overview** | **Tasks** | **Resources** | **Analytics**

    * **Overview**: short description/goal, quick actions (Add task, Start focus session, Add resource)
    * **Tasks**: filtered task list (kanban or table) scoped to this subject
    * **Resources**: simple link list (title + URL); stored in `resources_json`
    * **Analytics**: tiles (focused minutes this week, tasks done, on‑time rate)

### 2.3 Functional Requirements

* Create/Edit/Delete subjects (name, color, icon)
* Subject‑scoped quick actions: add task (prefill subject), start focus session (prefill subject), add resource
* Subject‑scoped analytics (week window by default)
* Unique subject names per user

### 2.4 Non‑Goals (v1.1)

* Shared subjects, teacher directory sync, rich file libraries

### 2.5 Acceptance Criteria

* Creating a subject updates the Subjects Home immediately (optimistic update)
* Subject detail shows only tasks where `subject_id = current`
* Starting a focus session from detail page sets `subject_id` on `focus_sessions`

---

## 3) Focus Study Sessions — Feature Spec

### 3.1 Objectives

Make focused study effortless: quick start, optional subject/task link, simple presets, and accurate tracked minutes.

### 3.2 UX Structure

* **Focus Home (/focus)**

  * Timer panel (work/break), start/stop
  * Presets row (chips): default Pomodoro 25/5 + user presets
  * Quick links: Start session for [Subject chips], or select a Task
  * Sound toggle (rain/café/brown/none)
  * Streak indicator; Today’s focused minutes

* **Schedule Focus (/focus/schedule)**

  * Simple form: subject (optional), task (optional), date/time, duration (60m), preset (optional)
  * “Create and add to calendar” (writes to Study Teddy calendar if connected)

### 3.3 Functional Requirements

* Start/stop timer; auto‑log to `focus_sessions` with `effective_minutes`
* Choose preset (from `focus_presets`); create/edit/delete user presets
* Optional association to subject and/or task
* Quick schedule form creates an app session + Google calendar event (our calendar)

### 3.4 Acceptance Criteria

* Completing a 25‑min work interval increases today’s focused minutes and streak if daily ≥25
* Creating a scheduled session at 7pm for 60m results in an event 19:00–20:00 on the Study Teddy calendar (if connected)

---

## 4) AI — Patterns & Routing (unchanged fundamentals, clarified)

### 4.1 Patterns

* **Taskify**: free text → task list (title, subject, estimate, due)
* **Breakdown**: big task → 4–8 subtasks
* **Tutor**: explain → 3 practice Qs → check 1 answer (hints first)

### 4.2 Routing

* Default → **DeepSeek‑V3**
* Intent `code` → **DeepSeek‑Coder**
* Complex prompt → **OpenAI GPT‑4/4o‑mini**
* Fallbacks: retry → switch provider → graceful short answer

### 4.3 Budgets & Caching

* Daily cap per user: 30k tokens
* Per‑response cap: 3k tokens
* Cache TTLs: Taskify 300s, Breakdown 120s, Tutor 60s

---

## 5) Onboarding & Quick Start (recap with Subjects)

* Pick subjects (create at least one); color/icon required
* Add one upcoming exam/assignment (creates a task with due date)
* Choose Pomodoro defaults (25/5 prefilled)
* **Generate My Week** → 3 study sessions (Mon/Wed/Fri 7pm local) with subject distribution if available

---

## 6) Tasks — Minimal but Powerful

* Views: List + Kanban
* Subtasks checklist
* Natural Language Add: “Study physics Thu 3pm 60m”
* Drag to weekly planner (creates/updates event)
* Keyboard shortcuts: A, Cmd/Ctrl+K, E, Space

---

## 7) Calendar — Google Only

* Connect Google; create “Study Teddy” calendar idempotently
* Read busy windows from all calendars; write sessions to our calendar only
* Conflict prompt with “Next free slot” suggestion

---

## 8) Notifications & Digest

* In‑app bell (system|tasks|focus)
* Weekly digest (Mon 8am local): top 3 wins, next 3 actions, planned sessions

---

## 9) Analytics — Four Tiles + NBA

* Focused minutes (week)
* Tasks completed (week)
* On‑time rate
* Subject mix (pie)
* **Next Best Action** card (AI suggests 1)

---

## 10) Privacy, Security, Performance (high‑level)

* No training on user data; PII redaction in prompts
* Quiet hours 22:00–08:00 local
* RSC lists; p95 < 300ms; bundle < 250KB gz; Sentry enabled

---

## 11) Acceptance Criteria (key additions)

* **Subject Tab**: creating, editing, deleting subjects reflects instantly; unique name per user enforced; analytics tiles show correct week metrics.
* **Focus Sessions**: independent session (no task) logs correctly, with optional subject; preset selection persists and is editable.
* **Scheduling**: posting to `/api/focus/schedule` creates app record and Google event (if connected) within 3 sec.

---

## 12) Build, Run, Migrations (concise)

### 12.1 Env Vars

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` (optional)

### 12.2 Scripts

* `dev` / `build` / `start`
* `drizzle:generate` / `drizzle:migrate` / `db:push`

### 12.3 Migration Notes

* Add `subjects`, `subtasks`, `focus_presets` (new), `focus_sessions` (with nullable task_id & subject_id), and indices listed above.

---

## 13) Minimal API Contract (JSON shapes)

### 13.1 Subjects

* `POST /api/subjects` → `{ name, color, icon }`
* Response: `{ id, name, color, icon, created_at }`

### 13.2 Focus Sessions

* `POST /api/focus/start` → `{ taskId?, subjectId?, presetId? }` → returns `{ sessionId, started_at }`
* `POST /api/focus/stop` → `{ sessionId }` → returns `{ ended_at, effective_minutes }`
* `POST /api/focus/schedule` → `{ subjectId?, taskId?, startAt, durationMin, presetId? }` → returns `{ id, calendarEventId? }`

### 13.3 Tasks (unchanged essentials)

* `POST /api/tasks` → `{ title, subjectId?, estimate_min?, due_at? }`
* `PATCH /api/tasks/:id` → updates status/schedule/fields

---

## 14) Rollout & QA (delta)

* Feature flags: enable Subject Tab and Focus presets together
* Test matrix additions: subject unique constraint, focus session without task, preset CRUD, calendar write idempotency

---

## 15) Definition of Done (v1.1)

* ✅ Subject Tab live (home + detail + analytics)
* ✅ Focus Sessions support independent sessions + presets + scheduling
* ✅ Full schema present at top; routes exposed; migrations run clean
* ✅ Calendar writes work; conflicts handled
* ✅ AI flows intact; budgets + caching enforced
