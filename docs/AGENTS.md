# Repository Guidelines

This guide helps contributors quickly navigate and work within this repo. It applies to the entire repository.

## Project Structure & Module Organization
- `studyteddy-backend/` — NestJS + TypeScript API. Key dirs: `src/`, `test/`, `dist/`, `scripts/`. DB config: `drizzle.config.ts`, docs: `DATABASE_SETUP.md`. Env: `.env`, `.env.example`.
- `studyteddy-frontend/` — Next.js + TypeScript app. Key dirs: `app/` or `pages/` (as configured), `components/` (via `components.json`), `lib/`, `hooks/`, `types/`, `public/`.
- Root docs: `project.md`, `prd.md`.

## Build, Test, and Development Commands
- Backend
  - `cd studyteddy-backend`
  - Dev: `npm run start:dev` (watch mode)
  - Build: `npm run build` → outputs to `dist/`
  - Start prod: `npm run start:prod`
  - DB: `npm run db:generate | db:push | db:migrate | db:studio`
  - Test: `npm test`, coverage: `npm run test:cov`, E2E: `npm run test:e2e`
- Frontend
  - `cd studyteddy-frontend`
  - Dev: `npm run dev` (Next.js dev server)
  - Build: `npm run build` | Start: `npm start`
  - Lint: `npm run lint`

## Coding Style & Naming Conventions
- Language: TypeScript in both apps.
- Linting: ESLint enabled in both; run `npm run lint` per package.
- Formatting: Backend uses Prettier (`.prettierrc`: `singleQuote: true`, `trailingComma: all`). Prefer 2-space indent, no unused exports.
- Names: PascalCase for classes/components, camelCase for variables/functions, UPPER_SNAKE_CASE for constants/env keys. File names: kebab-case for files and folders (e.g., `user-service.ts`).

## Testing Guidelines
- Backend: Jest; unit tests colocated under `src/` as `*.spec.ts`. Coverage output in `coverage/`. Use `test:e2e` for E2E (see `test/jest-e2e.json`).
- Frontend: No formal tests defined yet; add React Testing Library + Vitest/Jest as needed and place tests next to components as `*.test.tsx`.

## Commit & Pull Request Guidelines
- Commits: Use conventional commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`) with imperative subject; reference issues (`#123`) when applicable.
- PRs: Provide a clear description, linked issues, screenshots for UI changes, and test/verification notes. Keep changes scoped; update docs when scripts or envs change.

## Security & Configuration Tips
- Never commit real secrets. Copy `.env.example` → `.env`/`.env.local` and fill locally.
- Validate DB migrations with `db:studio` before pushing. Keep API keys in environment variables only.
