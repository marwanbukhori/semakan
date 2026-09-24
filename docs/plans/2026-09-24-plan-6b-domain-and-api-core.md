# Plan 6b: Domain and API Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A real backend, `apps/api` (NestJS 12, Postgres, TypeORM 1.1), that serves the frontend's existing contract (list, detail and review). Its review rules come from a new framework-free `packages/domain`, which the frontend's mock API also uses, so the mock and real APIs behave the same by construction. In local development, the Dev Panel can switch the frontend between the Mock and Real APIs.

**Architecture:**
- `packages/domain` holds the review decision as a pure function that returns a `Result` with the new state and a timeline event.
- `packages/seed` holds the deterministic demo data generator, which the mock and the database seed share.
- `apps/api` is a NestJS application:
  - a controller that validates input with the contract's zod schemas (Nest 12 native Standard Schema)
  - an application service that loads the application, calls the domain, and saves in one transaction with an optimistic `version` check
  - a TypeORM repository adapter
  - a global problem+json exception filter
  - OpenAPI 3.1 at `/docs`
- The integration tests run against a real Postgres through Testcontainers.

**Tech Stack:** NestJS 12.1.0, @nestjs/typeorm 12.0.1, @nestjs/swagger 12.0.2, typeorm 1.1.1, pg 8.23.0, reflect-metadata 0.2.2, rxjs 7.8.2, @swc-node/register 1.12.1, @swc/core 1.16.2, unplugin-swc 2.0.0, testcontainers and @testcontainers/postgresql 12.1.0, supertest 7.3.0, @types/supertest 7.2.1, @types/express 5.0.6, and Postgres 17 (`postgres:17-alpine`). TypeScript stays at 6.0.3 (npm's latest is 7; keep it pinned). Vitest is 5.0.1.

**Spec:** `docs/specs/2026-09-24-semakan-api-design.md` (§3 domain, §4 API, §5 persistence, §9 testing, §11 Dev Panel, §12 plan 6b).

## Global Constraints

- **Branch:** `plan-6b-domain-api`, created from `main` by the controller.
- **Versions:** exact (`--save-exact`), matching the Tech Stack list. No other new dependencies unless a task says so.
- **The frontend must not change behaviour in Mock mode.** Every existing web test keeps passing, and the live Vercel site never calls the real API.
- **Verified in a spike on 2026-09-24:**
  - **Runtime:** `apps/api` must be **ESM** (`"type":"module"`), because Nest 12 ships as ESM only. It runs with `node --import @swc-node/register/esm-register src/main.ts` (`--watch` in development).
  - **Decorators:** `tsconfig.json` needs `experimentalDecorators` and `emitDecoratorMetadata`. **Never use `erasableSyntaxOnly` in apps/api.** Import injected classes as values, never with `import type`. Missing metadata still lets the app boot and then fails on every request, so the tests make real HTTP requests.
  - **TypeORM 1.1:**
    - `DataSource` only; `getConnection`, `getRepository`, `findByIds` and similar helpers are removed.
    - `@VersionColumn()` is unchanged.
    - `ds.transaction(async (m) => …)` is unchanged.
    - `.setLock('pessimistic_write').setOnLocked('skip_locked')` only locks one row if you also add **`.limit(1)`**; `getOne()` adds no LIMIT.
    - `createQueryBuilder().update(E).set({ …, version: () => 'version + 1' }).where('id = :id AND version = :v', …).execute()` returns `.affected`.
  - **Validation:** Nest 12 validates natively with `app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }))` and `@Body({ schema })` / `@Query({ schema })` / `@Param(name, { schema })`.
  - **OpenAPI:** `@nestjs/swagger` 12 builds OpenAPI 3.1 with `@ApiOkResponse({ standardSchema })` and `DocumentBuilder().setOpenAPIVersion('3.1.0')`.
  - **problem+json:** a global `@Catch()` filter using `res.status(s).type('application/problem+json').send(JSON.stringify(body))` sets the header correctly.
  - **Testcontainers:** `PostgreSqlContainer('postgres:17-alpine')` starts in a Vitest `globalSetup` and passes the URL to tests with `project.provide('databaseUrl', …)` and `inject('databaseUrl')`. It takes about 3 s when the image is cached. Use `fileParallelism: false`.
  - **Tests:** `unplugin-swc` with `oxc: false` in `vitest.config.ts`, so tests use the same compiler as the runtime.
- **Error bodies stay compatible with the frontend.** Every error is problem+json that also carries `message`, plus `fieldErrors` for 422, because `apps/web/src/shared/api/ApiError.ts` parses `{ message?, fieldErrors? }`.
- **The API path is `/api/v1`.** Health endpoints are `/health/live` and `/health/ready`; docs are at `/docs` and `/docs-json`.
- **Concurrency: controller ruling P6b-R1.** It corrects spec §4 to match HTTP semantics.
  - `POST …/review` **requires** `If-Match: "<version>"`: **428** when the header is missing, **409** when the version is stale (the frontend already maps 409 to a conflict).
  - The body `version` must equal the If-Match version, or the request fails with **400**, code `version_mismatch`.
- **Idempotency:** `Idempotency-Key` is optional on `POST …/review`. A repeat with the same key and the same body returns the stored response. A repeat with the same key and a different body returns **409** with code `idempotency_key_reused`.
- **Deferred:** `assign` and the senior-approval rule move to **6c** (they need roles). The timeline is written in the same transaction; it moves to the projector in **6d**. The actor is the fixed demo officer `Pn. Hafizah` (`CURRENT_OFFICER`) until 6c.
- **Never use port 5173.** The API listens on **3000**. Local Postgres from `infra/docker-compose.yml` is on host port **55432**, to avoid clashing with other local databases.
- **Commits:** TDD throughout, and run `npm run format` before every commit.

---

## File Map

```
packages/domain/            NEW  pure TS: review rules, decide(), Result, DomainError
  src/{result.ts,review.ts,index.ts,review.test.ts}  + package.json tsconfig.json eslint.config.js vitest.config.ts
packages/seed/              NEW  deterministic demo data (moved from apps/web/src/mocks/db)
  src/{random.ts,applications.ts,query.ts,index.ts,*.test.ts}  + config files
apps/web/src/mocks/db/applications.ts   keeps in-memory state; applyReview delegates to @semakan/domain
apps/web/src/features/applications/rules.ts  re-exports REVIEWABLE_STATUSES/isReviewable/statusAfterDecision from domain
packages/contract/src/problem.ts        NEW  ProblemSchema (problem+json incl. message/fieldErrors)
apps/api/                   NEW  NestJS app
  package.json tsconfig.json eslint.config.js vitest.config.ts Dockerfile .dockerignore(root)
  src/main.ts src/app.module.ts src/config.ts
  src/http/{problem.filter.ts,if-match.ts}
  src/health/health.controller.ts
  src/db/{data-source.ts,entities/*.ts,migrations/1727200000000-Init.ts,seed.ts}
  src/applications/{applications.module.ts,applications.controller.ts,applications.service.ts,applications.repository.ts,idempotency.repository.ts}
  test/{global-setup.ts,app.ts,health.e2e.test.ts,applications.read.e2e.test.ts,applications.review.e2e.test.ts,persistence.test.ts}
infra/docker-compose.yml    NEW  postgres (+ api service)
apps/web: shared/api/client.ts (dynamic base URL + headers), mocks/devControls.ts (apiSource),
          app/dev-panel/DevPanel.tsx (API source switch), features/applications/api/mutations.ts (If-Match, Idempotency-Key),
          vite.config.ts (dev proxy /api/v1 → :3000)
```

---

### Task 1: `packages/domain`, with the review rules shared by the mock and the API

**Files:**
- Create: `packages/domain/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts}`, `packages/domain/src/{result.ts,review.ts,index.ts,review.test.ts}`
- Modify: `apps/web/src/features/applications/rules.ts`, `apps/web/src/mocks/db/applications.ts`, `apps/web/package.json` (add `"@semakan/domain": "0.1.0"`)

**Interfaces:**
- `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`; helpers `ok(value)` and `err(error)`.
- `REVIEWABLE_STATUSES`, `isReviewable(status)`, `statusAfterDecision(decision)`, `requiresFireCertificate(category)`: moved from the web app unchanged.
- `type ReviewError = { kind: 'version_conflict' } | { kind: 'rejected'; field: 'decision'; code: 'not_reviewable' | 'missing_fire_certificate' }`
- `decide(app: ApplicationDetail, request: ReviewRequest, actor: string, now: Date): Result<{ detail: ApplicationDetail; event: TimelineEvent }, ReviewError>`. This is exactly today's mock `applyReview` logic, without the store. The version check comes first, then reviewability, then the fire certificate. The event id is `` `${id}-ev-${timeline.length + 1}` ``. `assignedOfficerName` becomes `actor`, and `version` goes up by 1.
- `packages/domain` depends only on `@semakan/contract` (types and schemas) and `zod`. It has no framework, no I/O and no Date.now(): `now` is passed in.

- [ ] **Step 1: Failing tests.** `packages/domain/src/review.test.ts` builds an `ApplicationDetail` with a small local `makeDetail(overrides)` helper; it must not import web fixtures. The tests:

```ts
import type { ApplicationDetail } from '@semakan/contract';
import { decide, isReviewable, requiresFireCertificate, statusAfterDecision } from './review';

const NOW = new Date('2026-09-24T03:00:00.000Z');

function makeDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  return {
    id: 'app-001', referenceNo: 'LPP-2026-1000', applicantName: 'Tan Wei Jie',
    businessName: 'Kedai Runcit Maju', premisesCategory: 'retail', state: 'Selangor',
    submittedAt: '2026-09-01T02:00:00.000Z', status: 'under_review', assignedOfficerName: 'Pn. Hafizah',
    applicantIdNumber: '900101-10-1234', applicantEmail: 'tan.1@example.com.my', applicantPhone: '012-345 6789',
    businessAddress: '1, Jalan Merdeka, 40000 Selangor',
    documents: [{ id: 'app-001-doc-1', kind: 'ssm_certificate', fileName: 'ssm_certificate.pdf', sizeKb: 120 }],
    timeline: [
      { id: 'app-001-ev-1', kind: 'submitted', at: '2026-09-01T02:00:00.000Z', actor: 'Tan Wei Jie' },
      { id: 'app-001-ev-2', kind: 'status_changed', at: '2026-09-02T02:00:00.000Z', actor: 'Pn. Hafizah', from: 'submitted', to: 'under_review', note: null },
    ],
    version: 2,
    ...overrides,
  };
}

describe('decide', () => {
  it('approves: new status, bumped version, officer assigned, event appended', () => {
    const result = decide(makeDetail(), { version: 2, review: { decision: 'approve', note: '' } }, 'Pn. Hafizah', NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.detail.status).toBe('approved');
    expect(result.value.detail.version).toBe(3);
    expect(result.value.event).toEqual({
      id: 'app-001-ev-3', kind: 'status_changed', at: NOW.toISOString(), actor: 'Pn. Hafizah',
      from: 'under_review', to: 'approved', note: null,
    });
    expect(result.value.detail.timeline.at(-1)).toEqual(result.value.event);
  });

  it('rejects with the reason as the note, and request_info with its documents', () => {
    const rejected = decide(makeDetail(), { version: 2, review: { decision: 'reject', reason: 'Premis tidak sesuai' } }, 'x', NOW);
    expect(rejected.ok && rejected.value.event).toMatchObject({ kind: 'status_changed', to: 'rejected', note: 'Premis tidak sesuai' });
    const info = decide(makeDetail(), { version: 2, review: { decision: 'request_info', requestedInfo: ['floor_plan'], note: 'Sila hantar' } }, 'x', NOW);
    expect(info.ok && info.value.event).toMatchObject({ kind: 'info_requested', requestedInfo: ['floor_plan'], note: 'Sila hantar' });
    expect(info.ok && info.value.detail.status).toBe('info_requested');
  });

  it('reports a stale version before anything else', () => {
    const result = decide(makeDetail({ status: 'approved' }), { version: 1, review: { decision: 'approve', note: '' } }, 'x', NOW);
    expect(result).toEqual({ ok: false, error: { kind: 'version_conflict' } });
  });

  it('refuses decided applications', () => {
    const result = decide(makeDetail({ status: 'approved' }), { version: 2, review: { decision: 'approve', note: '' } }, 'x', NOW);
    expect(result).toEqual({ ok: false, error: { kind: 'rejected', field: 'decision', code: 'not_reviewable' } });
  });

  it('requires a fire certificate to approve food and entertainment premises', () => {
    const food = makeDetail({ premisesCategory: 'food_beverage' });
    expect(decide(food, { version: 2, review: { decision: 'approve', note: '' } }, 'x', NOW)).toEqual({
      ok: false, error: { kind: 'rejected', field: 'decision', code: 'missing_fire_certificate' },
    });
    // Rejecting needs no certificate.
    expect(decide(food, { version: 2, review: { decision: 'reject', reason: 'Tidak lengkap sama sekali' } }, 'x', NOW).ok).toBe(true);
  });
});

it('keeps the shared rules', () => {
  expect(isReviewable('info_requested')).toBe(true);
  expect(isReviewable('rejected')).toBe(false);
  expect(statusAfterDecision('request_info')).toBe('info_requested');
  expect(requiresFireCertificate('entertainment')).toBe(true);
  expect(requiresFireCertificate('retail')).toBe(false);
});
```

- [ ] **Step 2: Package scaffolding.** Copy `packages/contract`'s `package.json`, `tsconfig.json`, `eslint.config.js` and `vitest.config.ts` shape, with these changes:
  - name `@semakan/domain`
  - dependencies `"@semakan/contract": "0.1.0", "zod": "4.6.5"`
  - the same coverage thresholds

  Run `npm install` and see the tests fail.
- [ ] **Step 3: Implement.**
  - `result.ts` holds `Result`, `ok` and `err`.
  - `review.ts`:
    - Move the four rule helpers verbatim from `apps/web/src/features/applications/rules.ts` and `apps/web/src/mocks/db/applications.ts`, including `assertNever`. Give the domain its own local `assertNever` in `review.ts`, the same one-liner, because domain must not import web code.
    - Add `decide`, ported line by line from today's `applyReview` (see `apps/web/src/mocks/db/applications.ts`), returning `Result` instead of `ReviewOutcome`.
  - `index.ts` re-exports everything.
- [ ] **Step 4: Point the web app at the domain.**
  - `rules.ts`: import and re-export `REVIEWABLE_STATUSES`, `isReviewable` and `statusAfterDecision` from `@semakan/domain`, and keep `reviewErrorKey` and the error-code re-exports.
  - `mocks/db/applications.ts`:
    - Import `requiresFireCertificate` and `decide` from `@semakan/domain`, and delete the local copies.
    - Rewrite `applyReview` to: look up the application (return `not_found` if missing), call `decide(current, request, CURRENT_OFFICER, now)`, and map `version_conflict` to `{ kind: 'conflict' }` and `rejected` to `{ kind: 'invalid', fieldErrors: { [field]: [code] } }`. On ok, replace the application in the store.
  - The `ReviewOutcome` type and handler are unchanged.
- [ ] **Step 5: Run** `npm run check` at the root. The web suite must pass unchanged. That is the parity proof: every mock review test now runs through the domain.
- [ ] **Step 6: Commit** `Move the review rules into packages/domain and use them in the mock`.

---

### Task 2: `packages/seed`, deterministic demo data shared by the mock and the database

**Files:**
- Create: `packages/seed/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts}` and `packages/seed/src/{random.ts,applications.ts,query.ts,index.ts,applications.test.ts,query.test.ts}`
- Move (`git mv`): `apps/web/src/mocks/db/random.ts` → `packages/seed/src/random.ts`
- Modify: `apps/web/src/mocks/db/applications.ts`, `apps/web/package.json` (add `"@semakan/seed": "0.1.0"`), and the web tests that import `seedApplicationDetails`/`seedApplications` from the mock (they keep importing from `@/mocks/db/applications`, which re-exports)

**Interfaces:**
- `@semakan/seed` exports:
  - `createRandom`
  - `SEED` (20260923), `COUNT` (57), `CURRENT_OFFICER` (`'Pn. Hafizah'`)
  - `seedApplications(count?, seed?)`, `seedApplicationDetails(count?, seed?)`, `toSummary(detail)`
  - `queryApplications(all, params, pageSize?)`: the reference filter, sort and page semantics
- These are moved **verbatim** from `apps/web/src/mocks/db/applications.ts`. It depends on `@semakan/contract` and `@semakan/domain` (for `requiresFireCertificate`).
- `apps/web/src/mocks/db/applications.ts` keeps only the in-memory store (`applications`, `getApplications`, `getApplication`, `resetApplications`, `applyReview`, `ReviewOutcome`). It re-exports `seedApplications`, `seedApplicationDetails`, `toSummary`, `queryApplications` and `CURRENT_OFFICER` from `@semakan/seed`, so no web importer changes.

- [ ] **Step 1: Failing tests** in `packages/seed/src/applications.test.ts`:
  - `seedApplicationDetails()` returns 57 records.
  - Two calls produce equal output (deterministic).
  - Every record parses with `ApplicationDetailSchema`.
  - `version === timeline.length`.
  - `app-001` is `submitted` (this matches `apps/web/src/mocks/db/applications.test.ts`).

  `query.test.ts`:
  - The status filter only returns that status.
  - `q` matches the reference number, the applicant or the business, ignoring case.
  - Sorting is stable, with `referenceNo` as the tie-breaker.
  - A page above the last page is clamped to the last page.
- [ ] **Step 2: Scaffold** the package as in Task 1, with name `@semakan/seed` and dependencies `@semakan/contract`, `@semakan/domain` and `zod`.
- [ ] **Step 3: Move the code** as described in Interfaces. Keep the existing web mock test file (`apps/web/src/mocks/db/applications.test.ts`) passing unchanged.
- [ ] **Step 4:** `npm run check` passes. **Step 5: Commit** `Move the demo data generator into packages/seed`.

---

### Task 3: `apps/api` scaffold: Nest app, health, problem+json, OpenAPI, Testcontainers

**Files:**
- Create:
  - `apps/api/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts,Dockerfile}` and root `.dockerignore`
  - `apps/api/src/{main.ts,app.module.ts,config.ts,http/problem.filter.ts,health/health.controller.ts,health/health.module.ts}`
  - `apps/api/test/{global-setup.ts,app.ts,health.e2e.test.ts}`
  - `packages/contract/src/problem.ts` (+ export) and `infra/docker-compose.yml`
- Modify: root `package.json` (add `"dev:api": "npm run dev --workspace @semakan/api --"`, `"db:up": "docker compose -f infra/docker-compose.yml up -d postgres"`)

**Interfaces:**
- `ProblemSchema` (contract):

```ts
export const ProblemSchema = z.object({
  type: z.string(), title: z.string(), status: z.number().int(), detail: z.string().optional(),
  code: z.string().optional(),
  message: z.string(),                        // = detail ?? title, for the existing frontend parser
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type Problem = z.infer<typeof ProblemSchema>;
```

- `class ProblemException extends HttpException` with `(status, { title, code?, detail?, fieldErrors? })`. The filter serialises it as a `Problem` with `type: 'about:blank'`.
  - **Nest `HttpException`s** (for example a 404 from an unknown route, or a 400 from `StandardSchemaValidationPipe`) map to a `Problem` with their status. For a validation 400, `fieldErrors` is built from the pipe's message array when it can be parsed; otherwise `detail` holds the joined messages.
  - **Anything else** becomes a 500 with `title: 'Internal Server Error'`, and the error is logged. Never put stack traces in the response.
- `loadConfig(env)` parses the environment with zod: `DATABASE_URL` (url), `PORT` (default 3000), `NODE_ENV`. The app fails to start when it is invalid.
- Global prefix `api/v1`, excluding `health/(.*)` and `docs`.
- `GET /health/live` returns 200 `{ status: 'ok' }`. `GET /health/ready` runs `SELECT 1` through the injected `DataSource`: 200 `{ status: 'ok' }` on success, or 503 problem+json on failure.
- `createTestApp()` in `test/app.ts`:
  - `Test.createTestingModule({ imports: [AppModule] })`
  - `app.setGlobalPrefix(...)` and the same global pipe and filter as `main.ts`, through one shared `configureApp(app)` exported from `src/main.ts`'s sibling `src/configure.ts`
  - `init()`
- **package.json scripts** (apps/api):
  - `"dev": "node --watch --import @swc-node/register/esm-register src/main.ts"`
  - `"start": "node --import @swc-node/register/esm-register src/main.ts"`
  - `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`, `"test:run": "vitest run"`, `"coverage": "vitest run --coverage"`
  - `"check": "npm run typecheck && npm run lint && npm run coverage"`
  - `"db:migrate"` / `"db:seed"`: added in Task 4
- **Dependencies:** `@swc-node/register`, `@swc/core` and `reflect-metadata` go in `dependencies`, because the container runs them.
- **tsconfig.json** (from the spike; add the repo's strict flags except `erasableSyntaxOnly`):

```json
{
  "compilerOptions": {
    "target": "ES2023", "lib": ["ES2023"], "module": "ESNext", "moduleResolution": "bundler",
    "types": ["node", "vitest/globals"], "experimentalDecorators": true, "emitDecoratorMetadata": true,
    "moduleDetection": "force", "noEmit": true, "skipLibCheck": true, "strict": true,
    "noUnusedLocals": true, "noUnusedParameters": true, "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "test", "*.config.ts"]
}
```

- **vitest.config.ts:** `plugins: [swc.vite()]`, `oxc: false`, `test: { globals: true, globalSetup: ['./test/global-setup.ts'], hookTimeout: 120_000, testTimeout: 30_000, fileParallelism: false, coverage: { provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/main.ts', 'src/db/migrations/**', 'src/db/seed.ts'], thresholds: { lines: 80, statements: 80, functions: 75, branches: 70 } } }`.
- **global-setup.ts:** use the spike version verbatim (PostgreSqlContainer `postgres:17-alpine`, `project.provide('databaseUrl', …)`, a `ProvidedContext` declaration, and teardown).
- **Dockerfile:** use the spike version, with `packages/seed` and `packages/domain` copied as well.
- **infra/docker-compose.yml:**
  - `postgres:17-alpine`, with `POSTGRES_USER/PASSWORD/DB = semakan`, port `55432:5432`, a named volume, and a healthcheck using `pg_isready`
  - an `api` service built from `apps/api/Dockerfile` with context `..`, `DATABASE_URL=postgres://semakan:semakan@postgres:5432/semakan`, port `3000:3000`, depending on healthy postgres

- The contract gets `packages/contract/src/problem.test.ts`: a full problem parses; `message` is required; `fieldErrors` is optional. This keeps the contract's 90% coverage threshold.

- [ ] **Step 1: Failing e2e test.** `health.e2e.test.ts`:

```ts
import request from 'supertest';
import { inject } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './app';

let app: INestApplication;
beforeAll(async () => {
  process.env.DATABASE_URL = inject('databaseUrl');
  app = await createTestApp();
});
afterAll(() => app.close());

it('reports liveness and readiness', async () => {
  await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok' });
  await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ok' });
});

it('answers unknown routes with problem+json the frontend can read', async () => {
  const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.body).toMatchObject({ type: 'about:blank', status: 404, message: expect.any(String) });
});

it('publishes an OpenAPI 3.1 document', async () => {
  const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
  expect(res.body.openapi).toBe('3.1.0');
});
```

- [ ] **Step 2: Implement** the scaffold. The OpenAPI setup is `new DocumentBuilder().setTitle('Semakan API').setVersion('1').setOpenAPIVersion('3.1.0').build()`, with `SwaggerModule.setup('docs', app, document)` inside `configureApp`. `main.ts` does `import 'reflect-metadata'` first, then `NestFactory.create(AppModule)`, `configureApp(app)` and `app.listen(config.PORT)`, and handles SIGTERM with `app.enableShutdownHooks()`. `AppModule` imports `TypeOrmModule.forRootAsync` (entities and migrations are added in Task 4; for now an empty array and `migrationsRun: true`) and `HealthModule`.
- [ ] **Step 3: Run** `npm run check -w @semakan/api`, which includes the e2e test against Testcontainers, then root `npm run check`. Smoke test by hand: `npm run db:up && DATABASE_URL=postgres://semakan:semakan@localhost:55432/semakan npm run dev:api`, then `curl localhost:3000/health/ready`. Stop the dev server afterwards.
- [ ] **Step 4: Commit** `Add the NestJS API scaffold with health, problem+json and OpenAPI`.

---

### Task 4: Persistence: entities, migration, seed and repository

**Files:**
- Create: `apps/api/src/db/{data-source.ts,entities/application.entity.ts,entities/document.entity.ts,entities/timeline-event.entity.ts,entities/idempotency-key.entity.ts,migrations/1727200000000-Init.ts,seed.ts,seed-data.ts}`, `apps/api/src/applications/applications.repository.ts`, `apps/api/test/persistence.test.ts`
- Modify: `apps/api/src/app.module.ts` (entities, migrations), `apps/api/package.json` (`"db:migrate"`, `"db:seed"`)

**Interfaces:**
- Migration `Init1727200000000`, in raw SQL, with `up` and `down`:

```sql
CREATE TABLE applications (
  id text PRIMARY KEY,
  reference_no text NOT NULL UNIQUE,
  applicant_name text NOT NULL,
  applicant_id_number text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text NOT NULL,
  business_name text NOT NULL,
  business_address text NOT NULL,
  premises_category text NOT NULL CHECK (premises_category IN ('food_beverage','retail','services','workshop','entertainment')),
  state text NOT NULL,
  submitted_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted','under_review','info_requested','approved','rejected')),
  assigned_officer_name text,
  version integer NOT NULL CHECK (version >= 1)
);
CREATE INDEX applications_status_submitted_at_idx ON applications (status, submitted_at DESC, reference_no);
CREATE INDEX applications_submitted_at_idx ON applications (submitted_at DESC, reference_no);
CREATE TABLE documents (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  position integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ssm_certificate','premises_photo','floor_plan','fire_certificate')),
  file_name text NOT NULL,
  size_kb integer NOT NULL CHECK (size_kb > 0),
  UNIQUE (application_id, position)
);
CREATE TABLE timeline_events (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('submitted','status_changed','info_requested','comment')),
  at timestamptz NOT NULL,
  actor text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (application_id, seq)
);
CREATE TABLE idempotency_keys (
  key text PRIMARY KEY,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

  `timeline_events.data` holds each kind's own fields (`from`, `to`, `note`, `requestedInfo`) and is parsed back with `TimelineEventSchema`.
- TypeORM entities mirror these tables in the infrastructure layer only. `ApplicationEntity.version` is a plain `@Column('int')`; the version check is an explicit `WHERE`, so `@VersionColumn` isn't needed.
- `data-source.ts` exports `dataSourceOptions(url)`, used by `AppModule`, the migration CLI script and the seed.
- `ApplicationsRepository` is `@Injectable()` and takes `DataSource` in its constructor:
  - `findDetail(id): Promise<ApplicationDetail | null>` loads the row, its documents (ordered by `position`) and its timeline (ordered by `seq`), and maps them to the contract shape, including ISO strings for timestamps. The result must parse with `ApplicationDetailSchema`.
  - `list(params: ApplicationListParams, pageSize = PAGE_SIZE): Promise<ApplicationList>` uses the same semantics as `queryApplications` in `@semakan/seed`:
    - `q` is an ILIKE over `reference_no`, `applicant_name` and `business_name`, with `%`, `_` and `\` escaped
    - the status filter
    - sorting by `submittedAt`, `referenceNo` or `businessName`, with `reference_no` as the tie-breaker, and one direction applied to both
    - a page above the last page is clamped
    - `total` is the count
  - `saveReview(manager: EntityManager, before: ApplicationDetail, after: ApplicationDetail, event: TimelineEvent): Promise<'ok' | 'conflict'>`:
    - runs `UPDATE applications SET status, assigned_officer_name, version = version + 1 WHERE id = :id AND version = :before.version`
    - if 0 rows are affected, returns `'conflict'`
    - otherwise inserts the timeline event with `seq = after.timeline.length`
- `seed.ts` is a CLI entry that runs migrations, then inserts `seedApplicationDetails()` from `@semakan/seed` when the table is empty (idempotent). `seed-data.ts` exports `insertSeed(ds)`, which tests reuse.
- apps/api scripts:
  - `"db:migrate": "node --import @swc-node/register/esm-register src/db/migrate.ts"` (create `migrate.ts`: initialise, `runMigrations`, destroy)
  - `"db:seed": "node --import @swc-node/register/esm-register src/db/seed.ts"`

- [ ] **Step 1: Failing test** `persistence.test.ts`:
  - Connect to the Testcontainers database with `new DataSource(dataSourceOptions(inject('databaseUrl')))`, run the migrations, `TRUNCATE`, then `insertSeed`.
  - **Round trip:** for every seeded id, `repo.findDetail(id)` deep-equals the matching `seedApplicationDetails()` record.
  - **List parity:** for the matrix `status ∈ {all, submitted, approved}` × `q ∈ {'', 'lpp-2026-100', 'tan'}` × `sort ∈ {submittedAt, referenceNo, businessName}` × `order ∈ {asc, desc}` × `page ∈ {1, 2, 99}`, `repo.list(p)` deep-equals `queryApplications(seedApplications(), p)`.
  - **Constraints:** inserting a status outside the list violates the CHECK constraint.
  - **Optimistic save:** with the same `before.version` twice, the first `saveReview` returns `'ok'` and the second `'conflict'`.
- [ ] **Step 2: Implement** the files above. Map rows to contract objects explicitly: no spreading TypeORM entities into responses.
- [ ] **Step 3:** `npm run check -w @semakan/api`, then root `npm run check`.
- [ ] **Step 4: Commit** `Add the Postgres schema, seed and applications repository`.

---

### Task 5: Read endpoints: list and detail with ETag

**Files:**
- Create: `apps/api/src/applications/{applications.module.ts,applications.controller.ts,applications.service.ts}`, `apps/api/test/applications.read.e2e.test.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- `GET /api/v1/applications`:
  - `@Query({ schema: ApplicationListParamsSchema })` (it has `.catch` defaults, so bad values fall back exactly as in the mock)
  - `@ApiOkResponse({ standardSchema: ApplicationListSchema })`
  - returns `repo.list(params)`
- `GET /api/v1/applications/:id`:
  - returns 404 problem+json with `title: 'Application not found'` and `code: 'not_found'` when it doesn't exist
  - otherwise returns the detail with the header `ETag: "<version>"` (a strong validator, with quotes)
  - `@ApiOkResponse({ standardSchema: ApplicationDetailSchema })`
- The service is a thin application service; it throws `ProblemException` for not-found.

- [ ] **Step 1: Failing e2e test** (per file: migrate, truncate, seed in `beforeEach`):
  - The list with the default parameters parses with `ApplicationListSchema`, and equals `queryApplications(seedApplications(), DEFAULT_LIST_PARAMS)`.
  - `?status=nonsense&page=-3` behaves like the defaults.
  - The detail for `app-001` parses with `ApplicationDetailSchema`, equals the seed record, and has `etag` `"<version>"`.
  - An unknown id returns 404 problem+json with `message: 'Application not found'`.
  - `/docs-json` has paths `/api/v1/applications` and `/api/v1/applications/{id}`.
- [ ] **Step 2: Implement.** **Step 3:** run the checks. **Step 4: Commit** `Serve the application list and detail from Postgres`.

---

### Task 6: Review endpoint: If-Match, domain rules, transaction and idempotency

**Files:**
- Create: `apps/api/src/http/if-match.ts`, `apps/api/src/applications/idempotency.repository.ts`, `apps/api/test/applications.review.e2e.test.ts`
- Modify: `applications.controller.ts`, `applications.service.ts`

**Interfaces:**
- `parseIfMatch(header: string | undefined): number | 'missing' | 'invalid'` accepts `"3"`, `W/"3"` and `3`.
- `POST /api/v1/applications/:id/review`:
  - body `@Body({ schema: ReviewRequestSchema })`, headers `If-Match` and optional `Idempotency-Key`
  - if validation fails: **422** `{ title: 'Invalid review', message: 'Invalid review', fieldErrors }`. `fieldErrors` uses the **same** mapping as the mock's `toFieldErrors`: the path under `review` is stripped, keys come from the first path segment, and the values are zod issue messages, which are already error codes such as `reason_too_short`. Use a route-level `ZodValidationPipe` for this route (below), not the global Standard Schema pipe, so the status is 422 and the shape matches the mock.
  - If-Match missing → 428 `code: 'precondition_required'`; invalid → 400 `code: 'invalid_if_match'`; different from `body.version` → 400 `code: 'version_mismatch'`
  - In one `dataSource.transaction`:
    - Load the detail. Missing → 404.
    - Call `decide(detail, body, CURRENT_OFFICER, new Date())`.
      - `version_conflict` → **409** `{ title: 'Updated by another officer', message: 'Updated by another officer', code: 'version_conflict' }`
      - `rejected` → **422** `{ title: 'Review rejected', message: 'Review rejected', fieldErrors: { decision: [code] } }`
      - ok → `saveReview`. `'conflict'` (a race) → the same 409.
    - Return **200** with the new detail and `ETag: "<new version>"`.
  - **Idempotency**, inside the same transaction:
    - With a key, compute `request_hash = sha256(id + ':' + canonical JSON of the body)`.
    - Try `INSERT … ON CONFLICT (key) DO NOTHING`, **after** processing succeeds, storing the status and body. Store only successful (2xx) responses; failures are safe to retry.
    - Before processing, look the key up: same hash → return the stored status and body (plus ETag from the body's version); different hash → **409** `code: 'idempotency_key_reused'`.
- `ZodValidationPipe(schema)` in `apps/api/src/http/zod-validation.pipe.ts` implements `PipeTransform`. It returns the parsed data, or throws `ProblemException(422, { title: 'Invalid review', fieldErrors: toFieldErrors(error) })`. `toFieldErrors` is ported from `apps/web/src/mocks/handlers/applications.ts`.

- [ ] **Step 1: Failing e2e test** covering:
  - **200:** approving `app-00X`, a seeded application that is reviewable and doesn't need a fire certificate (look one up from the seed in the test), returns the new detail. It parses with `ApplicationDetailSchema`, with status `approved`, version +1, and the new ETag. A later `GET` shows the new timeline event.
  - **428** without `If-Match`; **400** `version_mismatch` when If-Match and the body disagree.
  - **409** `version_conflict` for a stale version, and the response is problem+json.
  - **422:**
    - `missing_fire_certificate` for a food or entertainment application without a fire certificate (look one up from the seed; if the seed has none that is also reviewable, the test says so and uses `ApplicationsRepository` to delete that document inside the test)
    - `not_reviewable` for an approved one
    - `reason_too_short` field errors for a short reject reason, keyed `reason`
  - **Race:** two `POST`s in parallel with the same version → exactly one 200 and one 409, and the stored version is +1 exactly once.
  - **Idempotency:** the same key and body twice → the same 200 body, and the version goes up once. The same key with a different body → 409 `idempotency_key_reused`.
  - **404** for an unknown id.
- [ ] **Step 2: Implement.** **Step 3:** run the checks. **Step 4: Commit** `Record review decisions with If-Match, idempotency keys and the domain rules`.

---

### Task 7: Frontend: Mock ↔ Real API switch in the Dev Panel

**Files:**
- Modify:
  - `apps/web/src/mocks/devControls.ts` (`apiSource: 'mock' | 'real'`, default `'mock'`)
  - `apps/web/src/app/dev-panel/DevPanel.tsx` (the switch, shown only when `import.meta.env.DEV`)
  - `apps/web/src/shared/api/client.ts` (`baseUrl: string | (() => string)`; `RequestOptions.headers?: Record<string, string>`)
  - `apps/web/src/shared/api/client.ts` also exports `setApiBaseUrl(url: string)`; `apiClient` becomes `createApiClient({ baseUrl: () => currentBase })`, where `currentBase` defaults to `'/api'`. **Shared code must not import `@/mocks`** (the boundaries lint rule forbids it). The **app layer** (`apps/web/src/app/…`, e.g. a small `useApiSource` effect in `AppLayout` or in `main.tsx` next to the MSW start) subscribes to the dev controls and calls `setApiBaseUrl(import.meta.env.DEV && apiSource === 'real' ? '/api/v1' : '/api')`.
  - `apps/web/src/features/applications/api/mutations.ts`: send `If-Match: "<version>"` and `Idempotency-Key: crypto.randomUUID()`, one key per submission, reused if the same mutation retries
  - `apps/web/vite.config.ts`: `server.proxy: { '/api/v1': 'http://localhost:3000' }`
  - `en.ts`/`ms.ts`: the Dev Panel labels
- Test: `apps/web/src/app/dev-panel/DevPanel.test.tsx`, `apps/web/src/shared/api/client.test.ts`, `apps/web/src/features/applications/api/mutations.test.tsx`

**Interfaces:**
- The Dev Panel's API source radio has **Mock API** / **Real API (localhost:3000)**, and MS labels **API olok-olok** / **API sebenar (localhost:3000)**.
- In real mode, the mock-only controls (latency, failure, empty list, conflict next) are disabled, with the note "These controls apply to the mock API only." / "Kawalan ini hanya untuk API olok-olok." Switching source clears the query cache (`queryClient.clear()`).
- The MSW handlers match `/api/applications…` only, so `/api/v1/…` requests pass through MSW (`onUnhandledRequest: 'bypass'`) to the Vite proxy. The data.gov.my handlers are unaffected.
- In a production build, the switch isn't rendered and `apiSource` is ignored (always Mock).

- [ ] **Step 1: Failing tests:**
  - **Client:** `createApiClient({ baseUrl: () => '/x' })` builds `/x/...`, and `headers` are sent. Assert with an MSW handler that echoes the request headers.
  - **Mutation:** the review request carries `If-Match: "<version>"` and an `Idempotency-Key` in UUID format (MSW captures the request).
  - **Dev Panel:** the API source radio is present; choosing Real disables the mock-only controls and shows the note; the choice survives a reload (persisted with the existing Dev Panel storage).
- [ ] **Step 2: Implement.** The mock handler ignores the new headers, so nothing else changes. **Step 3:** root `npm run check`. **Step 4: Commit** `Let the Dev Panel switch between the mock and the real API`.

---

### Task 8: End-to-end check, pull request and deploy (controller)

- [ ] `npm run db:up`, `npm run db:seed -w @semakan/api`, then `npm run dev:api` in the background. Restart the user's web dev server on 5173 if needed.
- [ ] In a real browser at `http://localhost:5173`, with the Dev Panel set to Real API:
  - the list and filters match Mock mode
  - the detail loads
  - an approval succeeds
  - a food application without a fire certificate shows the fire-certificate 422 on the right field
  - opening the same application in two tabs and submitting both shows the conflict banner (409)
  - the Network tab shows `If-Match` and `Idempotency-Key`
  - `/docs` (via port 3000) renders Swagger UI

  Switch back to Mock and confirm everything behaves as before.
- [ ] Stop the API and `docker compose -f infra/docker-compose.yml down`, keeping the volume.
- [ ] PR, CI (Testcontainers runs on GitHub's Ubuntu runners), merge, then `vercel --prod`, all after the user approves. The live site stays on the mock.
