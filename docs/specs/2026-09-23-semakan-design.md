# Semakan — Design Spec

**Date:** 2026-09-23
**Author:** Marwan Bukhori
**Status:** Draft, pending review

## 1. Purpose

Semakan is a demo frontend built to be screen-shared during an interview for a
Frontend Engineer (Mid-Senior) role on a team that builds government IT web
applications. It has two jobs:

1. **Be a working product** that shows the skills in the job description:
   TypeScript and React, component architecture, state and data fetching, API
   integration with real-world states (loading, empty, error, conflict),
   accessibility, responsiveness, testing, and shared UI patterns.
2. **Explain itself.** A public "About this build" section describes the
   structure, the practices used (with evidence from the code), and how the
   author's past frontend work led to them.

### Success criteria

- The demo script (section 9) runs end to end on the deployed app
  without any step failing.
- Every practice claimed on `/about/practices` links to real code in the repo
  and names how it is enforced.
- CI is green: lint, typecheck, unit/integration, e2e (with axe), build.
- The app works at 360px width, keyboard-only, in BM and EN, in light and dark.

### Non-goals

- No real backend, database, or authentication. The app's own API is mocked
  with MSW. The only live API is the public data.gov.my API (section 7a).
- Not a copy of any real government system; the domain is illustrative.
- No SSR or Next.js. This is a client-rendered SPA.

## 2. Domain

An internal portal where local council officers review **business premises
licence applications** (Permohonan Lesen Premis Perniagaan).

### Entities

- **Application**: id, reference number, applicant (name, IC/company no.,
  contact), business (name, type, address), premises category, submitted date,
  status, assigned officer, documents, timeline events, version (for conflict
  detection).
- **Status**: `submitted | under_review | info_requested | approved | rejected`.
- **TimelineEvent**: at, actor, kind (status change, comment, info request),
  note.
- **Officer**: id, name, role. A single mocked session.

## 3. Location, repo, deployment

- Local path: `/Users/marwanbukhori/semakan` (separate from the portfolio repo).
- Its own public GitHub repository.
- Deployed to Vercel as a static SPA. MSW runs in the browser in production so
  the demo needs no server.

## 4. Stack

| Concern | Choice |
|---|---|
| Build | Vite |
| UI runtime | React 19, TypeScript (strict) |
| Routing | React Router (data router) |
| Server state | TanStack Query |
| Client state | `useState`, URL search params for filters. No global store. |
| Forms | React Hook Form + zod |
| Validation / contracts | zod schemas; types via `z.infer` |
| Design system | MYDS (`@govtechmy/myds-react`) + Tailwind |
| Own components | Composed on top of MYDS, documented in Storybook |
| i18n | react-i18next, BM and EN |
| Mock API | MSW, one handler set shared by browser, tests, Storybook |
| Unit / integration tests | Vitest + React Testing Library + MSW |
| E2E / a11y | Playwright + @axe-core/playwright |
| Quality | ESLint (typescript-eslint, react-hooks, jsx-a11y, boundaries), Prettier |
| CI | GitHub Actions |
| Hosting | Vercel |

## 5. Routes

### Product (behind the mocked officer login)

| Route | Purpose |
|---|---|
| `/login` | Mock officer sign-in (pick an officer). |
| `/dashboard` | Counts by status and a simple chart. |
| `/applications` | Table: server-side pagination, sorting, status/category filters, debounced search. All filter state in the URL. |
| `/applications/:id` | Detail: applicant, business, documents, status timeline. |
| `/applications/:id/review` | Review form: approve, reject (reason required), or request info (fields required). |
| `/applications/new` | Multi-step application form with a draft saved to localStorage. |
| `/open-data/fuel-prices` | Real data from data.gov.my (section 7a): weekly fuel price trend chart and table. |

### Showcase (public)

| Route | Purpose |
|---|---|
| `/about` | One-screen summary, stack, CI status, links; interactive folder tree. |
| `/about/architecture` | Layer diagram and one request traced end to end. |
| `/about/practices` | Practices catalogue (section 8). |
| `/about/experience` | Past frontend work, each linked to a pattern in this app. |
| `/about/ai-workflow` | How AI was used to build this app, with evidence (section 8a). |

### Global

- App shell: header with navigation, language toggle (BM/EN), theme toggle
  (light/dark), officer menu.
- Route-level error boundaries.
- **Dev Panel**: a floating panel that controls the mock API at runtime:
  latency (0 / 800ms / 2s), force error (500, network failure), force empty
  list, force 409 conflict on the next review, reset seed data. A separate
  **data.gov.my** section switches that source between *Live* and
  *Simulated* (fixture, 429, 404, offline). Settings
  persist in localStorage. Shown in every environment, since the demo is the
  product.

## 6. Architecture

### Folder structure

```
src/
  app/                  providers, router, layout shell, error boundaries
  features/
    applications/
      api/              keys.ts, queries.ts, mutations.ts
      components/       ApplicationTable, ApplicationFilters, StatusBadge,
                        Timeline, ReviewForm, ConflictBanner
      routes/           ListRoute, DetailRoute, ReviewRoute, NewRoute
      schemas.ts        zod schemas: the data contract
      types.ts          z.infer types
    dashboard/
    open-data/          data.gov.my integration: client, schemas, fuel prices
    auth/               mocked officer session
    about/              showcase pages and their content files
  shared/
    api/client.ts       fetch wrapper: base URL, zod parse, typed ApiError
    ui/                 thin wrappers around MYDS and own primitives
    hooks/              useDebounce, useUrlState
    i18n/               setup, bm.json, en.json
    lib/                assertNever, formatters
  mocks/
    handlers/           MSW handlers per resource
    db.ts               in-memory seeded data (faker, fixed seed)
    devControls.ts      Dev Panel state read by handlers
tests/e2e/              Playwright specs
.storybook/
```

### Rules

1. A feature never imports another feature's internals; shared code lives in
   `shared/`. Enforced by `eslint-plugin-boundaries`.
2. Routes are thin: they read params and compose components. Logic lives in
   hooks, markup in components.
3. Every API response is parsed with a zod schema in `apiClient`. The schema
   is a required argument.
4. Query keys come from one factory per feature (`applicationKeys`).

## 7. Data flow and error handling

### Read path

```
Route reads URL params
 → useApplications(filters)
 → queryKey: applicationKeys.list(filters)
 → apiClient.get('/applications', ApplicationListSchema, { params })
 → fetch → MSW handler (applies Dev Panel latency/errors)
 ← JSON → schema.parse → typed data, or throws ApiError
 ← { data, isPending, isError, error, refetch } → ApplicationTable
```

### Write path (review)

- `useReviewApplication` mutation sends `{ decision, reason?, requestedInfo?,
  version }`.
- Optimistic update: status in detail and list caches changes immediately.
- On error: roll back caches, map the error (see below), toast.
- On settle: invalidate `applicationKeys.detail(id)` and `applicationKeys.lists()`.

### `ApiError`

A single typed error class with `kind: 'network' | 'http' | 'validation' |
'conflict' | 'schema'`, `status`, and optional `fieldErrors`.

### States

| Situation | UI |
|---|---|
| Loading | Skeleton rows matching table layout (no layout shift) |
| Empty | Message + "clear filters" action |
| 422 validation | Field errors mapped onto the form via `setError` |
| 409 conflict | ConflictBanner: "Updated by another officer", reload latest |
| 5xx / network | Auto-retry with backoff (not for 4xx), then inline error with Retry |
| Schema mismatch | Logged to console with details; generic error shown |
| Render crash | Route error boundary; shell stays up |

## 7a. data.gov.my integration (`/open-data/fuel-prices`)

A real, public government API, called directly from the browser. This is the
one feature that is not mocked by default.

### Verified API behaviour (probed 2026-09-23)

- Endpoint: `GET https://api.data.gov.my/data-catalogue/?id=fuelprice`.
  Query params used: `limit`, `sort=-date`, `date_start`, `date_end`,
  `meta=true`.
- The path **must** end with `/`. Without it the API returns a 301 redirect.
- CORS: `access-control-allow-origin: *`, so no proxy is needed.
- Without `meta`, the body is a JSON array of rows. With `meta=true`, it is
  `{ meta: { catalogue_id, data_as_of, last_updated, next_update,
  data_source: string[], update_frequency, total, limit }, data: Row[] }`.
- Rows are two different shapes in one dataset, told apart by `series_type`:
  - `"level"`: prices in RM for `ron95`, `ron97`, `diesel`, `diesel_eastmsia`,
    `ron95_skps`, `ron95_budi95`, `diesel_budi`, `diesel_skds`.
  - `"change_weekly"`: the week-on-week change for the same fields.
  Newer subsidy fields are `null` in older rows. Change values carry float
  noise (e.g. `0.35000000000000053`).
- Unknown dataset: HTTP 404 with body `{ status_code: 404, details: string[] }`.
- Rate limiting: no rate-limit headers were observed. **UNVERIFIED**; the UI
  still handles 429.

### Design

- `features/open-data/api/dataGovClient.ts`: base URL
  `https://api.data.gov.my`, always adds the trailing slash, parses responses
  with zod, and maps `{ status_code, details }` and 429 onto `ApiError`.
- `features/open-data/schemas.ts`: `FuelPriceRowSchema` is a
  `z.discriminatedUnion('series_type', [LevelRow, ChangeRow])`, with nullable
  subsidy fields. Rows with an unknown `series_type` are dropped and counted
  rather than crashing the page (the contract can drift on a real API).
- Query: `useFuelPrices({ from, to })` with `meta=true`; `staleTime` is
  derived from `meta.next_update` (weekly data should not be refetched on
  every focus).
- UI: a line chart of the level series (fuel types toggled on and off), a
  table of the latest weeks showing the weekly change as up/down, the date
  range and selected fuels in the URL, and a footer "Data as of
  {data_as_of} · Next update {next_update} · Source: MOF via data.gov.my".
- Values rounded to 2 decimal places for display only.
- Dev Panel: *Live* (MSW passes the request through) or *Simulated*, where MSW
  serves a recorded fixture or forces 429, 404 or offline.
- Tests use the recorded fixture only; CI never calls the live API.
- The page notes the link to the author's work: the POS side of the RON95
  BUDI95 subsidy at Silentmode.
- Charting: a small React chart library, chosen and version-checked in the
  plan.

## 8. Practices catalogue (`/about/practices`)

Each entry shows **What**, **Why**, **Where** (a snippet from the repo plus a
GitHub link), and **Enforced by**.

| # | Practice | Enforced by |
|---|---|---|
| 1 | Strict TS, no `any` | tsconfig strict, `no-explicit-any` |
| 2 | Discriminated unions + exhaustive switch | `assertNever` compile error |
| 3 | Types derived from zod schemas | `z.infer`, typecheck in CI |
| 4 | Composition over boolean props | Review, Storybook |
| 5 | Logic in hooks, thin routes | Folder conventions, boundaries lint |
| 6 | No server state copied into `useState`; derive, don't sync | react-hooks lint, review |
| 7 | Stable keys | Lint |
| 8 | Memoise only after measuring | Profiler notes on the page |
| 9 | Validate API responses at the boundary | `apiClient` signature requires schema |
| 10 | Query-key factory, precise invalidation | Unit test |
| 11 | URL as state for filters | Integration test |
| 12 | Every async view has loading/empty/error/success | Storybook story per state |
| 13 | Semantic HTML first, labelled inputs, visible focus | jsx-a11y, axe in Playwright |
| 14 | Keyboard-only journey works | Playwright keyboard test |
| 15 | Tests query by role/label and test behaviour | RTL conventions, coverage threshold |
| 16 | No cross-feature imports | eslint-plugin-boundaries |
| 17 | Route-level code splitting | `lazy` routes, build report in CI |
| 18 | No hardcoded UI strings | i18n key-coverage test |

The page ends with **Trade-offs and what I'd change at scale**: real API with
OpenAPI-generated types, error monitoring (e.g. Sentry) and RUM, a shared
component package across apps, feature flags, visual regression tests.

Content for showcase pages lives in typed TS content files under
`features/about/content/`, so it is edited without touching components.

## 8a. AI workflow page (`/about/ai-workflow`)

Purpose: show that AI was used as a disciplined engineering tool, not for
"vibe coding". Every claim links to an artifact committed in this repo.

### The flow, as a pipeline diagram

1. **Brainstorm** – requirements clarified by question-and-answer, one decision
   at a time (framework, mock API, design system, domain). Link: the spec's
   decisions.
2. **Spec** – written design doc, reviewed and approved by me before any code.
   Link: `docs/specs/`.
3. **Verify before planning** – throwaway spikes checked real library versions
   instead of trusting the model's memory. Concrete example: the spike found
   `@govtechmy/myds-style` requires Tailwind 3.4, so the plan uses Tailwind 3,
   not 4. A second example: probing data.gov.my found the trailing-slash
   redirect and the mixed `series_type` rows before any code was written.
   Link: the plan's "Global Constraints" and spec section 7a.
4. **Plan** – a step-by-step implementation plan with exact files, interfaces
   and tests per task. Link: `docs/plans/`.
5. **Build with TDD** – each task writes a failing test first, then the code.
   Link: commit history, where test and implementation land together.
6. **Review** – each task reviewed against the spec before the next starts;
   I read and approve diffs. Link: example review notes or PR.
7. **Verify** – CI, Playwright and axe must pass before anything is called
   done. Link: CI runs.

### Tools section

- **Claude Code** as the agent in the terminal.
- **Skills** (Superpowers): brainstorming, writing-plans,
  test-driven-development, subagent-driven-development, code review,
  verification-before-completion. One line each on what it enforces.
- **MCP servers**: Context7 (current library docs), Playwright (drive the real
  app to check UI), browser automation. One line each on what it was used for.
- **Project instructions**: `CLAUDE.md` / `AGENTS.md` in the repo holding the
  conventions the agent must follow (folder rules, testing rules, commands).

### What I own vs what AI does

A two-column table: I own requirements, architecture decisions, trade-offs,
review and approval, and final accountability; AI drafts code and tests,
researches library changes, and runs checks. Ends with where AI was wrong and
how the process caught it (e.g. the Tailwind version).

### Constraints

- Only claim what actually happened in this repo; no generic AI marketing.
- Specs and plans stay committed under `docs/` so the links resolve.

## 9. Demo script (about 9 minutes; timings are a guide)

| Time | Screen | Show |
|---|---|---|
| 0:00 | `/about` | Purpose, stack, folder tree |
| 1:00 | `/about/architecture` | Layers, one request end to end |
| 2:00 | `/applications` | Filter/sort/search, URL restores view, BM↔EN, dark mode |
| 3:00 | Dev Panel | Latency → skeletons; 500 → retry; empty → empty state |
| 4:00 | Review | Field errors, optimistic approve, forced failure rollback, 409 banner |
| 4:45 | `/open-data/fuel-prices` | Live data.gov.my call in the Network tab; discriminated union on `series_type`; "data as of"; simulate 429 |
| 5:00 | Keyboard | Tab through review dialog, focus trap and return |
| 5:30 | `/about/practices` | Open 2–3 linked files on GitHub |
| 6:30 | GitHub | Green CI, Playwright report, Storybook |
| 7:00 | `/about/experience` | Past work → patterns here |
| 7:45 | `/about/ai-workflow` | Spec → plan → TDD → review; the Tailwind-version catch |
| 8:30 | — | Trade-offs, questions |

Backup: a recorded walkthrough video, and the app runnable locally.

## 10. Testing

- **Unit (Vitest):** schemas, key factory, `useUrlState`, formatters,
  `ApiError` mapping.
- **Integration (RTL + MSW):** table filters and paginates and syncs URL;
  loading/empty/error states render; review form shows 422 field errors;
  optimistic update rolls back on failure; 409 shows ConflictBanner.
- **E2E (Playwright):** login → filter → open → approve → status updated, in
  BM and EN; keyboard-only review; axe check on every route.
- **Storybook:** composed components in loading, empty, error and success
  states using the MSW handlers.
- **CI (GitHub Actions):** lint, typecheck, unit/integration with coverage
  threshold, build, e2e against the preview build. Status badge on README and
  `/about`.

## 11. Build order and cut line

1. Scaffold, tooling, CI, Vercel deploy
2. `apiClient`, zod schemas, MSW db + handlers, Dev Panel
3. Applications list (table, filters, URL state, states)
4. Detail + timeline
5. Review form + mutation (optimistic, 422, 409)
5a. data.gov.my fuel prices feature
6. i18n, theme, responsive, accessibility pass
7. Tests to the levels above
8. Storybook
9. `/about` pages and content, including `/about/ai-workflow`
   (`CLAUDE.md` / `AGENTS.md` is added in step 1)
10. **Cut line:** `/applications/new` multi-step form and `/dashboard` are
    built last and dropped first if time runs short.
11. Rehearse the demo and record the backup video.
