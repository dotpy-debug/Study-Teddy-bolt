# Study Teddy Remediation Plan (Security, Quality, and Reliability)

## 1) Diagnostic Report (Severity-Classified)

- Critical: JWT secret fallback in backend
  - File: `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`
  - Issue: `secretOrKey` falls back to `'fallback-secret'` when `JWT_SECRET` is undefined.
  - Impact: Token forgery risk; production compromise.

- Critical: Unauthenticated WebSocket session gateway
  - File: `apps/backend/src/modules/study-sessions/sessions.gateway.ts`
  - Issue: No JWT verification in `handleConnection`; trusts `client.data.userId` implicitly.
  - Impact: Any client can start/pause/end sessions; account hijacking.

- High: Frontend demo authentication allows arbitrary sign-ins
  - File: `apps/frontend/lib/auth.ts` (NextAuth credentials + Google flows)
  - Issue: Accepts any credentials; assigns demo tokens.
  - Impact: Bypasses real auth; data exposure in non-demo environments.

- High: Token storage and refresh flow mismatch
  - File: `apps/frontend/lib/api/client.ts` vs backend `AuthController`
  - Issue: Frontend expects `{ tokens: { accessToken, refreshToken } }` but backend returns `{ access_token, refresh_token }` and different shape.
  - Impact: Silent auth breakage; infinite 401 loops; poor UX.

- High: DB dotenv loading inside library module
  - File: `apps/backend/src/db/index.ts`
  - Issue: `dotenv.config({ path: .../.env })` at runtime library level; can conflict with Nest global ConfigModule and environment management.
  - Impact: Environment confusion, misconfig in prod.

- High: Sensitive headers and detail leakage in error handling (potential)
  - File: `apps/backend/src/common/filters/all-exceptions.filter.ts`
  - Issue: Includes request details in responses in dev; ensure no leakage in prod.
  - Impact: Information disclosure if misconfigured.

- Medium: Security middleware pattern-based blocking and logging of request body
  - File: `apps/backend/src/common/middleware/security.middleware.ts`
  - Issue: Logs full `headers/body/query` on match; may capture secrets/PII. Regex-based blocking can cause FPs.
  - Impact: Privacy risks; false positives; DoS vectors via heavy regex.

- Medium: Missing rate limit on AI endpoints in code
  - File: Backend uses global Throttler; ensure AI routes have stricter limits per spec.
  - Impact: Cost spikes and abuse.

- Medium: UsersService refresh token lookup scans all users
  - File: `apps/backend/src/modules/users/users.service.ts` → `findByRefreshToken`
  - Issue: Iterates over user list and bcrypt-compares each; O(N) and unindexed.
  - Impact: Performance degradation; potential timing vectors.

- Medium: Study sessions timer setInterval without auth/cleanup guards
  - File: `apps/backend/src/modules/study-sessions/sessions.gateway.ts`
  - Issue: Interval per session; no max cap; server memory/CPU risk if abused.
  - Impact: Resource exhaustion.

- Medium: Frontend middleware caches auth decisions in-memory
  - File: `apps/frontend/middleware.ts`
  - Issue: Global `Map` cache in edge/serverless context is unsafe and inconsistent between invocations.
  - Impact: Stale or incorrect auth decisions.

- Low: Swagger enabled by default in non-prod only; ensure not exposed in prod
  - File: `apps/backend/src/main.ts`
  - Issue: Controlled by `SWAGGER_ENABLED`; safe if env correct.
  - Impact: Misconfig risk.

- Low: Logging of DB notices in development
  - File: `apps/backend/src/db/index.ts`
  - Issue: Acceptable; confirm disabled in prod.


## 2) Structured Repair Procedures (Prioritized)

Priority 0: Config hygiene
1. Enforce required envs at bootstrap using `ConfigModule` validation schema.
2. Remove library-level dotenv usage in DB module; rely on Nest config.

Priority 1: Authentication and session integrity
3. Remove JWT fallback secret; fail-fast when missing.
4. Implement JWT verification on WebSocket gateway `handleConnection`; set `client.data.userId` from JWT.
5. Replace demo NextAuth flows or gate behind `DEMO_MODE=false` by default; wire real backend auth.
6. Align token contract between frontend and backend; standardize response shape and update Axios refresh logic.

Priority 2: Secrets, logs, and errors
7. Scrub sensitive fields from logs; avoid logging full headers/body.
8. Ensure exception filter never returns stack/inner details in prod.

Priority 3: Performance and abuse prevention
9. Add stricter throttling for `/ai/*` and resource-heavy endpoints.
10. Optimize refresh token lookup to O(1) via separate hashed table or by indexing hashed value.
11. Add limits and cleanup for study-session intervals; authenticate clients.

Priority 4: Frontend middleware correctness
12. Remove in-memory `authCache` from middleware; rely on NextAuth’s built-in mechanisms.


## 3) Specific Code Modifications (File-level Edits)

- apps/backend/src/modules/auth/strategies/jwt.strategy.ts
  - Remove fallback secret and throw if missing.
  - Ensure `ignoreExpiration: false` remains.

- apps/backend/src/modules/study-sessions/sessions.gateway.ts
  - Parse `client.handshake.auth.token` or `Authorization` header, verify JWT using `JwtService`.
  - On failure, `client.disconnect(true)`.
  - Sanity cap timer intervals and clear on disconnect.

- apps/backend/src/db/index.ts
  - Remove `dotenv.config(...)` and read connection string from `ConfigService` injected where needed, or pass via main bootstrap before importing the module.
  - Export a factory tied to Nest DI instead of top-level initialization if possible.

- apps/backend/src/common/middleware/security.middleware.ts
  - Stop logging full request body/headers; log minimal metadata and hash where needed.
  - Consider configurable allowlist/denylist instead of broad regex.

- apps/backend/src/common/filters/all-exceptions.filter.ts
  - Ensure production never includes `details`/`stack`.
  - Confirm mapping does not leak internal messages in prod.

- apps/backend/src/modules/users/users.service.ts
  - Replace `findByRefreshToken` scan with a separate `refresh_tokens` table: columns (user_id, token_hash, expires_at, created_at, revoked_at); unique(user_id), index(token_hash).
  - On issue scope, at minimum add query predicate to reduce scan and mark TODO to migrate to dedicated table.

- apps/frontend/lib/api/client.ts
  - Align refresh endpoint parsing with backend shape `{ access_token, refresh_token }`.
  - Store tokens consistently (`accessToken`, `refreshToken`).
  - Base URL should include `/api` prefix if backend sets `API_PREFIX`.

- apps/frontend/lib/auth.ts
  - Gate demo flows behind `process.env.NEXT_PUBLIC_DEMO_MODE==='true'`.
  - In non-demo, call backend `/auth/login` and map tokens; on Google, call backend callback endpoint.

- apps/frontend/middleware.ts
  - Remove `authCache` Map; keep stateless logic.


## 4) Implementation Protocols (Version Control)

- Branching
  - Create feature branches per fix group: `fix/auth-hardening`, `fix/ws-auth`, `fix/token-contract`, `fix/logging-sanitization`, `perf/refresh-token-index`, `fix/frontend-auth`.

- Commits (Conventional)
  - feat(auth): enforce JWT secret, remove fallback
  - fix(ws): require JWT on study-sessions gateway
  - fix(api): unify token response shape and axios refresh parsing
  - chore(db): remove dotenv from db module; use ConfigModule
  - fix(security): sanitize logs and tighten exception responses
  - perf(auth): optimize refresh token lookup strategy
  - fix(frontend): gate demo auth and remove middleware cache

- Migrations
  - If introducing `refresh_tokens` table: add Drizzle migration with indexes.

- Secrets management
  - Update `.env.example` with required JWT, NEXTAUTH_SECRET, API_PREFIX.
  - Validate via `scripts/validate-env.js` and CI.


## 5) Verification Methods and Test Cases

- Unit tests (backend)
  - JwtStrategy: fails without secret; validates payload; rejects nonexistent user.
  - UsersService: refresh token hashing, expiry honored.
  - AI throttling: requests beyond limit return 429.

- E2E tests (backend)
  - Auth flow: register → login → access protected → refresh → logout.
  - WebSocket: connection with valid JWT succeeds; invalid JWT disconnects; session events authorized.

- Frontend tests
  - API client refresh: simulate 401 then refresh; succeeds with new token.
  - NextAuth: demo mode false → rejects credentials; demo mode true → allows.
  - Middleware: public routes accessible, private routes redirect to /login.

- Manual checks
  - Swagger disabled in prod.
  - No sensitive data in logs/errors.


## 6) Concrete Edit Guidance (Snippets)

- Enforce JWT secret (jwt.strategy.ts)
```ts
// apps/backend/src/modules/auth/strategies/jwt.strategy.ts
secretOrKey: (() => {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret) {
    throw new UnauthorizedException('JWT secret not configured');
  }
  return secret;
})(),
```

- Require JWT on study sessions gateway
```ts
// apps/backend/src/modules/study-sessions/sessions.gateway.ts
import { JwtService } from '@nestjs/jwt';

constructor(private readonly sessionsService: SessionsService, private readonly jwt: JwtService) {}

async handleConnection(client: Socket) {
  try {
    const raw = client.handshake.auth?.token || client.handshake.headers['authorization'];
    const token = typeof raw === 'string' && raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const payload = this.jwt.verify(token as string);
    client.data.userId = payload.sub;
  } catch {
    client.disconnect(true);
  }
}
```

- Frontend axios refresh mapping
```ts
// apps/frontend/lib/api/client.ts
const { access_token, refresh_token } = response.data;
tokenStorage.setTokens(access_token, refresh_token);
return access_token;
```

- Remove dotenv in db index and rely on env
```ts
// apps/backend/src/db/index.ts
// Remove dotenv.config; ensure DATABASE_URL present via process.env from Nest bootstrap
const connectionString = process.env.DATABASE_URL!;
```

- Remove middleware in-memory cache
```ts
// apps/frontend/middleware.ts
// Delete authCache Map and related code; keep withAuth wrapper only
```


## 7) Follow-up Hardening

- Implement rotating refresh tokens (one-time use) with revoke on use.
- Add RBAC checks via roles in `users` table and route-level guards.
- Add CSRF protection for state-changing endpoints if cookies are used.
- Add WebSocket namespace-based auth and rate limiting.

# Study Teddy — Comprehensive Remediation Plan (repair.md)

## 1) Diagnostic Report (Static + Dynamic Analysis)

- **OpenAI model usage (High)**: Backend `apps/backend/src/modules/ai/ai.service.ts` hardcodes `model: 'gpt-3.5-turbo'`. This model is EOL/legacy; configurable model should be taken from env via `EnvironmentConfig.openAI.model`. Multiple occurrences across code and docs reference GPT‑3.5.
- **JWT secret fallback (High)**: `apps/backend/src/modules/auth/strategies/jwt.strategy.ts` uses `secretOrKey: configService.get('JWT_SECRET') || 'fallback-secret'`. In production, this creates a silent weak default and security risk.
- **WebSocket auth (High)**: `apps/backend/src/modules/study-sessions/sessions.gateway.ts` does not apply `WsJwtGuard`; `client.data.userId` is used without prior verification in `handleConnection`. Risk of unauthenticated socket actions.
- **Auth exposure of public endpoints (Medium)**: Public decorator is correctly used in `auth.controller.ts`, but refresh endpoint accepts body token without IP/device binding or rotation policy verification beyond DB token match.
- **AI service error handling (Medium)**: `ai.service.ts` catches and wraps errors; however, it logs `console.error` and returns generic 503. Missing granular mapping and rate-limit backoff for OpenAI errors (quota, abuse). Docs/filters include mapping, but `ai.service.ts` does not propagate structured error codes to filter.
- **Type looseness (Medium)**: Widespread `any` parameters (found in multiple services and repositories: `decks.repository.ts`, `flashcards.service.ts`, `dashboard.service.ts`, `users.service.ts`, etc.). Degrades type safety.
- **Task queries and dates (Medium)**: `getTodaysTasks` ignores date boundaries and timezones; does not use `dueDate <= endOfDay && >= startOfDay`.
- **Frontend token storage (Medium)**: `apps/frontend/lib/api/client.ts` stores tokens in `localStorage`. For web, this increases XSS token theft risk. NextAuth is present but API client path still relies on localStorage.
- **Hardcoded localhost URLs (Low)**: Many dev URLs are hardcoded in multiple files; ensure all derive from env for deployments.
- **Strictness flags (Low)**: Backend `tsconfig.json` disables strict, unused locals/params. Reduces static guarantees.
- **E2E and health (Low)**: Good coverage exists. Ensure CI runs on PRs with gate for security checks.

## 2) Prioritized Repair Procedures

1. **Eliminate insecure JWT fallback secret (Critical)**
   - Remove fallback default; fail fast if `JWT_SECRET` missing.
2. **Secure WebSocket gateway (Critical)**
   - Apply `WsJwtGuard` to `SessionsGateway`; validate token during connection and on events.
3. **Parameterize OpenAI model (High)**
   - Read model and generation params from `EnvironmentConfig` and `.env`.
4. **Harden refresh token flow (High)**
   - Rotate tokens, bind to device fingerprint and IP hash, add reuse detection, and invalidate old tokens on rotation.
5. **Type safety improvements (High)**
   - Replace `any` with explicit DTOs/types across services and repos; align with `packages/shared`.
6. **Fix date-range logic for today’s tasks (Medium)**
   - Use startOfDay/endOfDay with timezone awareness.
7. **Frontend auth storage (Medium)**
   - Prefer HttpOnly secure cookies via NextAuth for session; avoid localStorage for access tokens when feasible.
8. **Centralize URLs and CSP (Low/Medium)**
   - Ensure URLs come from env; review CSP to include API domain and websocket origins.
9. **Tighten TS compiler options (Low)**
   - Enable `strict`, `noUnusedLocals`, `noUnusedParameters` in backend; fix resultant errors iteratively.

## 3) Specific Code Modifications (Locations)

- Backend
  - `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`
    - Remove `'fallback-secret'` default, throw if missing.
  - `apps/backend/src/modules/study-sessions/sessions.gateway.ts`
    - Add `@UseGuards(WsJwtGuard)`, verify token in `handleConnection`; drop connections on invalid/absent token; enforce namespace CORS from env.
  - `apps/backend/src/modules/ai/ai.service.ts`
    - Replace hardcoded model with `this.configService.get('OPENAI_MODEL')` and `max_tokens`/`temperature` from env; change console.error to Nest `Logger.error` and rethrow typed errors consumed by `AllExceptionsFilter`.
  - `apps/backend/src/modules/tasks/tasks.service.ts`
    - Implement start/end-of-day filter in `getTodaysTasks` based on user timezone parameter; ensure index usage.
  - `apps/backend/src/modules/auth/auth.service.ts`
    - Bind refresh tokens to deviceId + hashed user agent/IP; detect token reuse; on reuse, revoke all tokens for user.
  - `apps/backend/src/modules/*/*.(service|repository).ts`
    - Replace `any` with typed DTOs from `packages/shared`; add interfaces where missing.
  - `apps/backend/src/main.ts`
    - Keep helmet; review CSP `connectSrc` for API and OpenAI; ensure `app.useGlobalGuards` not needed due to providers already set.
  - `apps/backend/tsconfig.json`
    - Turn on `strict`, `noUnusedLocals`, `noUnusedParameters`.

- Frontend
  - `apps/frontend/lib/api/client.ts`
    - Gate localStorage token usage behind feature flag; prefer NextAuth session and backend cookie flow for SSR routes; document migration path.
  - `apps/frontend/lib/auth.ts`
    - Replace demo credentials pathway; integrate with backend real auth endpoints or disable in production builds.
  - Ensure all base URLs sourced from env, not literals.

## 4) Implementation Protocols (Version Control)

- Create feature branch: `security/remediation-<date>`.
- Small, scoped commits per concern:
  - `feat(auth): enforce JWT secret requirement`
  - `feat(ws): protect study-sessions gateway with JWT guard`
  - `refactor(ai): parametrize OpenAI model and logging`
  - `fix(tasks): correct today filter with timezone`
  - `refactor(types): replace any with DTOs in modules`
  - `chore(tsconfig): enable strictness`
  - `feat(frontend-auth): prefer NextAuth cookie session`
- Update `README.md`, `SETUP.md`, `.env.example` for new envs: `OPENAI_MODEL`, `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`, `CORS_ORIGIN`, `WS_ALLOWED_ORIGINS`, `JWT_ROTATION_SALT`.
- Run CI: lint, typecheck, unit, e2e. Block merge on failures.

## 5) Verification Methods and Test Cases

- Unit
  - JWT Strategy: throws when `JWT_SECRET` missing.
  - AI Service: uses configured model; logs with `Logger`; propagates errors.
  - Tasks Service: `getTodaysTasks` respects boundaries.
  - Auth Service: token rotation, reuse detection.
- Integration/E2E (backend)
  - Auth flow: register → login → refresh → logout; reuse of old refresh returns 401 and revokes sessions.
  - AI endpoints: rate limit respected; returns 503 on simulated OpenAI outage; history cache warming works.
  - WebSocket: connection without token denied; with token accepted; events require user context.
- Frontend
  - API client falls back to NextAuth session; token refresh queueing works; no tokens in localStorage when cookie mode enabled.
- Security
  - CSP allows required domains only; sockets limited to allowed origins.
  - SAST: run ESLint + TypeScript strict; fix all new errors.
  - DAST: run basic auth fuzz tests; verify no unauthenticated WS operations.

## 6) Concrete Edit Sketches

- jwt.strategy.ts
```ts
secretOrKey: (() => {
  const secret = configService.get<string>('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET is required');
  return secret;
})(),
```

- sessions.gateway.ts
```ts
@UseGuards(WsJwtGuard)
@WebSocketGateway({ /* ... */ })
async handleConnection(client: Socket) {
  if (!client.data?.userId) {
    client.disconnect(true);
    return;
  }
}
```

- ai.service.ts
```ts
const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
const maxTokens = parseInt(this.configService.get('OPENAI_MAX_TOKENS') || '500', 10);
const temperature = parseFloat(this.configService.get('OPENAI_TEMPERATURE') || '0.7');
const completion = await this.openai.chat.completions.create({ model, messages, max_tokens: maxTokens, temperature });
this.logger.error('OpenAI API error', error as Error);
```

- tasks.service.ts
```ts
const start = new Date(); start.setHours(0,0,0,0);
const end = new Date(); end.setHours(23,59,59,999);
.where(and(eq(studyTasks.userId, userId), between(studyTasks.dueDate, start, end), eq(studyTasks.completed, false)))
```

## 7) Rollout and Monitoring

- Deploy to staging with feature flags for cookie-based auth.
- Monitor logs for `AllExceptionsFilter` rates by tag.
- Add WebSocket auth metrics (accepted/denied connections, per-minute events).
- Post-deploy tests: run e2e and smoke.

## 8) Appendix: Env and Config Additions

- `.env.example`
```
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
CORS_ORIGIN=http://localhost:3000
WS_ALLOWED_ORIGINS=http://localhost:3000
JWT_ROTATION_SALT=<random>
```
