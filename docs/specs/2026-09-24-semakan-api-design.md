# Semakan API — Backend Design (Plan 6)

**Date:** 2026-09-24
**Extends:** `docs/specs/2026-09-23-semakan-design.md` (the frontend and its API contract)
**Status:** Approved in brainstorming on 2026-09-24

## 0. Purpose and scope

Semakan's frontend already runs against a mock API (MSW). This spec adds a real backend for the **Backend Developer** interview, so it is built to show that role's requirements:
- **Core requirements:** typed services, asynchronous and event-driven systems, quality and tests, on-call.
- **Nice to have:** API design, microservices, domain-driven design, databases, performance, observability, security, CI/CD and system design.

The backend implements the **same contract** as the frontend. The frontend demo must never depend on it: the live Vercel site stays on the mock API.

**Constraints:**
- More than 3 weeks of work, delivered as Plans 6a–6f.
- TypeScript only.
- Runs locally with Docker Compose; nothing is hosted.

## 1. Decisions

| Area | Decision |
|---|---|
| Framework | **NestJS** (`apps/api`, `apps/workers`). The domain lives in `packages/domain` with no framework imports, enforced by its `package.json` |
| Events | **Transactional outbox → RabbitMQ** (topic exchange `semakan.events`), behind publisher/consumer ports so SQS would be just another adapter |
| Consumers | **Notifier**, **audit/timeline projector**, **SLA escalation**, **stats read model** |
| Runtime | **Local only.** `docker compose up` starts Postgres, RabbitMQ, Keycloak, Mailpit, the OpenTelemetry collector, Tempo, Loki, Prometheus, Grafana, the API and the workers |
| Auth | **Keycloak (OIDC)**. The API verifies JWTs against Keycloak's published keys (JWKS); roles are `officer`, `senior_officer` and `admin` |
| Persistence | **Postgres + TypeORM**. Entities exist only in the infrastructure layer, as persistence models. Migrations are committed and reviewed; `synchronize` is never used |
| Contract | **npm-workspaces monorepo**. `packages/contract` holds the zod schemas used by both web and api, and the OpenAPI spec is generated from them |
| API style | **REST only, done thoroughly**: `/api/v1`, OpenAPI with Swagger UI, problem+json, ETag/If-Match, idempotency keys, keyset pagination and rate limits |
| Observability | **Metrics, traces and logs, joined up**: Prometheus, OpenTelemetry → Tempo, pino → Loki, one Grafana dashboard, 3 alerts and a runbook |

## 2. Repository layout

```
apps/web          the existing frontend, moved unchanged; the Dev Panel gains an API source switch and a token picker
apps/api          NestJS HTTP API + outbox relay
apps/workers      NestJS app: one module per consumer, plus the SLA scheduler
packages/contract zod schemas + inferred types + OpenAPI generation
packages/domain   Application aggregate, value objects, domain events, Result/DomainError
infra/            docker-compose.yml, keycloak realm export, prometheus + alert rules, grafana dashboards, otel-collector config
load/             k6 scripts + committed results
docs/             specs, plans, process logs, runbook.md, adr/
```

- The four consumers share one `workers` process, but each has its own module, queue and dead-letter queue. The trade-off is recorded as an ADR.
- Vercel builds `apps/web`: its root directory changes, and nothing else about the live site does.

## 3. Domain model (`packages/domain`)

**Aggregate:** `Application`, with `id`, `referenceNo`, `status`, `version`, `premisesCategory`, `assignedOfficerId`, `documents`, `submittedAt` and `decidedAt`.

Commands are pure: each one returns `Result<{ state, events }, DomainError>` and does no I/O.

| Command | Rules | Events |
|---|---|---|
| `assign(officer)` | status is `submitted` or `under_review` | `ApplicationAssigned` |
| `startReview(officer)` | assigned officer only; `submitted → under_review` | `ReviewStarted` |
| `decide(decision, actor, now)` | status is reviewable; the actor is the assigned officer or a `senior_officer`; the existing reason/note/requested-info codes apply; a fire certificate is required for categories that need one (`missing_fire_certificate`); **approving a high-risk category requires `senior_officer` (`senior_approval_required`, new)** | `ApplicationApproved`, `ApplicationRejected` or `InfoRequested` |
| `markOverdue(now, slaDays)` | waiting longer than the SLA (default 14 days) and not already flagged | `ApplicationOverdue` |

- **`DomainError`** is a discriminated union, and every `switch` over it ends in `assertNever`.
- **Concurrency:** the domain has no HTTP concepts. The repository saves with `WHERE id = $1 AND version = $2`. If no row matches, the result is a `ConcurrencyConflict`, which becomes a **409**.
- **The new 422 code** goes into `packages/contract`, and the frontend's mock applies the same rule, so the mock and real APIs behave alike.
- **The timeline and audit log are projections**, built from events, so they are eventually consistent.
  - The `POST …/review` response includes the events that request produced (read-your-writes).
  - The frontend's optimistic update covers the brief lag.

## 4. API (`apps/api`)

| Endpoint | Notes |
|---|---|
| `GET /api/v1/applications` | the frontend's current filter, sort and page parameters, plus optional `cursor` (keyset pagination) |
| `GET /api/v1/applications/:id` | returns `ETag: "<version>"` |
| `POST /api/v1/applications/:id/review` | requires `If-Match` (412 if the header is missing, 409 if the version is stale) and `Idempotency-Key` (a replay returns the stored response) |
| `POST /api/v1/applications/:id/assign` | `senior_officer` or `admin` |
| `GET /api/v1/applications/:id/audit` | `admin` |
| `GET /api/v1/stats` | the stats read model |
| `/health/live`, `/health/ready` | ready = Postgres, RabbitMQ and JWKS reachable |
| `/metrics`, `/docs` | Prometheus metrics; Swagger UI generated from the contract |

- **Errors** use RFC 9457 problem+json with a `code` field. Statuses: 400, 401, 403, 404, 409, 412, 422, 429.
- **Validation** uses the contract's zod schemas through a Nest pipe; unknown fields are rejected.
- **Rate limits** are per user, with a stricter limit on `POST /review`.

## 5. Persistence

- **Tables:**
  - `applications` (with `version`), `documents`
  - `outbox`, `processed_events (event_id, consumer)`, `idempotency_keys`
  - `timeline_events`, `audit_log`, `stats_*`
- **Migrations add CHECK constraints** on the status and decision columns.
- **Composite indexes** cover the list's filters and sort. A doc records `EXPLAIN ANALYZE` on about 100k seeded rows, before and after the indexes, and compares offset and keyset pagination.
- **The seed is deterministic** and uses the same generator as the mock, so both show the same applications.

## 6. Messaging reliability

1. **Outbox:** a command's state change and its events commit in one transaction.
2. **Relay:** claims rows with `SELECT … FOR UPDATE SKIP LOCKED` (several relays can run safely), publishes with **publisher confirms**, then marks the rows sent. Delivery is at-least-once.
3. **Message envelope:** `eventId`, `type`, `occurredAt`, `aggregateId`, `aggregateVersion`, `schemaVersion`, and W3C `traceparent`.
4. **Consumers** are idempotent via `processed_events`, handled in the same transaction as the consumer's own writes. For each aggregate, an event whose `aggregateVersion` is older than one already applied is ignored.
5. **Failures:** 3 retries with exponential backoff through delay queues, then a dead-letter queue for each queue. A replay script moves dead-lettered messages back.
6. **Demo:** the Dev Panel's "poison next event" switch makes the next message fail in the notifier. You can watch it retry, land in the dead-letter queue, raise the alert, and be replayed by following the runbook.

## 7. Security

- **Keycloak realm `semakan`**, committed as a realm export:
  - seeded users: officer, senior officer and admin
  - a public client using PKCE for the web app, and a client-credentials client for machine use
- **JWT checks:** issuer, audience, expiry, and the signature against a cached JWKS.
- **Access control:** role checks in a guard; data-dependent checks in the domain.
- **Hardening:** helmet, a CORS allow-list, zod validation of inputs, rate limits.
- **Personal data:** pino redacts applicant contact details (the notifier needs an email address, so `applications` gains an `applicant_email` column that is never logged). The audit log stores who, what and when, but not free-text reasons.
- **Config** is validated with zod at startup. `.env.example` is committed; real `.env` files are not.
- **CI** runs `npm audit` and dependency review.

## 8. Observability and operations

- **Traces:** OpenTelemetry covers HTTP, TypeORM, the relay, publishing and consuming. The context travels in message headers, so one trace spans the API and all four consumers. The collector sends traces to Tempo.
- **Metrics:**
  - RED metrics for each route
  - `outbox_pending`, `outbox_publish_lag_seconds`
  - `consumer_processed_total{consumer,result}`, `consumer_retry_total`
  - dead-letter queue depth
  - `decisions_total{decision}`
- **Logs:** pino JSON with `traceId`, `correlationId` and `userId`, sent to Loki. Grafana links each trace to its logs.
- **Grafana:** one committed dashboard, with rows for API, Events, Consumers and Business.
- **Alerts:**
  - dead-letter queue depth above 0 for 1 minute
  - outbox lag above 30 seconds
  - API 5xx rate above 2%
- **Runbook:** `docs/runbook.md` has one section per alert: meaning, how to confirm it, how to fix it, how to verify the fix.

## 9. Testing and CI

- **Domain:** pure unit tests; the domain package has the highest coverage threshold in the repo.
- **API integration:** **Testcontainers** (Postgres and RabbitMQ) with supertest. Tests use tokens signed by a local key, not Keycloak.
- **Messaging:** outbox → broker → consumer; duplicate deliveries do nothing; a poison message ends up in the dead-letter queue; two relays in parallel never double-publish.
- **Contract:** real API responses parse with the shared schemas, and CI fails if the generated OpenAPI spec has drifted.
- **CI:** lint, typecheck and unit tests for each workspace; integration tests; the OpenAPI drift check; Docker image builds for `api` and `workers`; `npm audit`. Vercel keeps deploying `apps/web`.

## 10. Performance

k6 scripts in `load/`:
- a list-browsing mix
- a burst of reviews on the same applications, to produce conflicts

A committed report records p95 latency, throughput, error rate and outbox lag under load, plus one before/after optimisation. Because it runs on a laptop, the report states that limitation.

## 11. Frontend and showcase

- **Dev Panel:**
  - **API source: Mock / Real (localhost)**; the default is Mock, and the live site is always Mock
  - a Keycloak **token picker** for the officer, senior officer and admin users (a full login screen stays in the optional Plan 7)
- **About pages:**
  - backend practices
  - a whole-system Architecture view
  - the Experience page's backend requirements move from "Planned · Plan 6" to Shown, with evidence links
  - published review logs for Plans 5 and 6

## 12. Delivery

Each plan is merged and deployed on its own, and each leaves a working demo.

| Plan | Scope |
|---|---|
| **6a** Monorepo + contract | move to `apps/web`; `packages/contract`; CI and Vercel still green |
| **6b** Domain + API core | domain package; TypeORM with migrations and seed; list, detail, review and assign endpoints; ETag/If-Match; idempotency; problem+json; Testcontainers; Dev Panel source switch |
| **6c** Auth | Keycloak; JWT verification; roles; `senior_approval_required` (in the mock too) |
| **6d** Events | outbox; relay; RabbitMQ; four consumers; retries and dead-letter queues; SLA job; stats endpoint; poison demo |
| **6e** Operations | OpenTelemetry, metrics, logs, dashboard, alerts, runbook, k6 load tests, EXPLAIN write-up |
| **6f** Showcase | about-page updates, published logs, interview demo script |

If time runs short, trim 6e and 6f, never the core.

## 13. Out of scope

- Hosting the backend
- GraphQL
- A login UI (Plan 7)
- Creating new applications (Plan 7)
- Multi-region
- Kubernetes
