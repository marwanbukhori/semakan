# Plan 2: Application Detail and Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Officers can open an application (`/applications/:id`), see its facts, documents and status timeline, and record a decision in a review dialog (`/applications/:id/review`) with an optimistic update, server validation errors (422) and conflict handling (409).

**Architecture:** The mock API gains full application records (documents, a timeline, a `version`) plus `GET /api/applications/:id` and `POST /api/applications/:id/review`. The mock server enforces a business rule the UI does not know (a fire-safety certificate is needed to approve food and entertainment premises) and returns error *codes* that the UI translates. The review form is a zod discriminated union on `decision`, driven by react-hook-form. The review dialog is a nested route, so it has a URL, and Back or Escape closes it.

**Tech Stack:** As in Plan 1, plus react-hook-form 7.88.0 and @hookform/resolvers 5.9.1. Also MYDS Dialog, Radio, Checkbox, TextArea, Label, Breadcrumb, SummaryList and toast.

**Spec:** `docs/specs/2026-09-23-semakan-design.md` (sections 2, 5, 7 and 9). Plan 1 (`docs/plans/2026-09-23-plan-1-foundation-and-list.md`) is merged. This plan builds spec build-order steps 4 and 5.

## Global Constraints

Everything in Plan 1's Global Constraints still applies. In short: Node 24, TypeScript 6.0.3, Tailwind 3.4 with MYDS tokens only, MYDS per-component imports, React Router 8 (`react-router`, with `RouterProvider` from `react-router/dom`), every UI string through i18next with `ms.ts` type-checked against `en.ts`, TDD, MSW as the only network mock, and `npm run format` before every commit. Also:

- Work on branch `plan-2-detail-review`, created from `main`.
- **Routes come from a factory, `createRoutes()`.** React Router 8 mutates lazy `RouteObject`s in place once they resolve, so a shared `routes` array breaks the second router instance, for example in the next test.
- `useNavigate()` returns `void | Promise<void>`. Always call it as `void navigate(...)`.
- **TanStack Query 5.103 `useMutation`:** the generics are `<TData, TError, TVariables, TOnMutateResult>`. The value returned by `onMutate` is the **3rd** argument of `onError` and `onSettled`. The 4th argument is an unrelated `MutationFunctionContext`.
- **react-hook-form with zod 4:** use `useForm<z.input<S>, unknown, z.output<S>>({ resolver: zodResolver(S) })`.
  - For a union schema, `errors.reason` does not type-check. Read field errors with `getFieldState(name, formState).error`, not `errors.x`, and never cast.
  - Use `useWatch({ control, name })`, not `watch()`. The react-hooks compiler rule flags `watch`.
  - An array field that exists only in one branch needs `defaultValue={[]}` on its own `<Controller>`.
- **Validation messages and server `fieldErrors` values are error codes** such as `reason_too_short`, never English prose. The UI translates them with `reviewErrorKey(code)`.
- **MYDS facts, verified in the Plan 2 spike:**
  - **Dialog:** `DialogBody` is the element with `role="dialog"`, and `DialogTitle` gives it its accessible name. Pass `hideClose` to `DialogBody`, because its built-in close button is labelled in English; use our own translated Cancel button instead. `DialogContent`, `DialogHeader` and `DialogFooter` are plain divs.
  - **Radio:** `Radio` is the radiogroup and `RadioButton` is the radio (it needs `id` and `value`). `RadioLabel` needs `htmlFor` matching the button's `id`.
  - **Checkbox:** it needs `id`, `checked` and `onCheckedChange`, plus `<Label htmlFor>`.
  - **TextArea and Input:** both forward refs, so `register()` works on them directly.
  - **SummaryList:** it is a `<table>`, and `SummaryListTerm` renders `<th scope="row">` (the `rowheader` role). Do not use `SummaryListHeader`, which renders an `<h1>`.
  - **Breadcrumb:** it renders `<nav aria-label="breadcrumb">`. Override that label with a translated `aria-label`, and check the override works, as we did for pagination in Plan 1. `BreadcrumbLink asChild` works with the router's `<Link>`.
  - **Toast:** mount `AutoToast` once, then call `useToast().toast({ variant: 'success' | 'error', title, description })`. The visible text is plain; a separate hidden `role="status"` live region announces it.
- When a step says "append" test code that includes `import` lines, merge those imports into the file's existing import block at the top.
- Check every MYDS component you add for hardcoded English accessible names, and override them or record them as known limitations.

---

## File Map

```
src/
  shared/api/client.ts                        + post()
  shared/lib/format.ts                        + formatDateTime()
  shared/i18n/en.ts, ms.ts                    + detail, documents, timeline, review, devPanel keys
  features/applications/
    schemas.ts                                + documents, timeline union, detail, review schemas
    types.ts                                  + detail/review types
    rules.ts                                  NEW: isReviewable, statusAfterDecision, error codes
    fixtures.ts                               + makeApplicationDetail
    api/keys.ts                               + detail(id)
    api/queries.ts                            + useApplication(id)
    api/mutations.ts                          NEW: useReviewApplication(id)
    components/ApplicationFacts.tsx           NEW
    components/DocumentList.tsx               NEW
    components/Timeline.tsx                   NEW
    components/DetailStates.tsx               NEW: DetailNotFound, DetailLoading
    components/ListStates.tsx                 LoadError gains a `title` prop
    components/ReviewForm.tsx                 NEW
    routes/DetailRoute.tsx                    NEW
    routes/ReviewRoute.tsx                    NEW
  mocks/devControls.ts                        + conflictNext
  mocks/db/applications.ts                    full records, getApplication, applyReview
  mocks/handlers/applications.ts              + GET /:id, POST /:id/review
  app/router.ts                               routes -> createRoutes(), nested detail/review
  app/AppLayout.tsx                           + <AutoToast />
  app/dev-panel/DevPanel.tsx                  + conflict switch, scoped Escape
  main.tsx                                    createRoutes()
```

---

### Task 1: `apiClient.post`

**Files:**
- Modify: `src/shared/api/client.ts`
- Test: `src/shared/api/client.test.ts`

**Interfaces:**
- Produces: `apiClient.post<T extends z.ZodType>(path: string, schema: T, body: unknown, options?: RequestOptions): Promise<z.infer<T>>`. It sends JSON with `Content-Type: application/json` and uses the same status mapping and zod validation as `get`.

- [ ] **Step 1: Create the branch**

Run: `cd /Users/marwanbukhori/semakan && git checkout main && git pull && git checkout -b plan-2-detail-review`

- [ ] **Step 2: Write the failing tests** (append to the existing `describe` file)

```ts
describe('apiClient.post', () => {
  it('sends a JSON body and returns the parsed response', async () => {
    let seen: { method: string; contentType: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/things', async ({ request }) => {
        seen = {
          method: request.method,
          contentType: request.headers.get('Content-Type'),
          body: await request.json(),
        };
        return HttpResponse.json({ id: 'b', count: 2 });
      }),
    );

    const result = await client.post('/things', ThingSchema, { name: 'x' });

    expect(result).toEqual({ id: 'b', count: 2 });
    expect(seen).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: { name: 'x' },
    });
  });

  it('maps a 422 response to a validation ApiError with field error codes', async () => {
    server.use(
      http.post('/api/things', () =>
        HttpResponse.json({ fieldErrors: { reason: ['reason_too_short'] } }, { status: 422 }),
      ),
    );

    const error = await client.post('/things', ThingSchema, {}).catch((e: unknown) => e);

    expect(error).toMatchObject({
      kind: 'validation',
      status: 422,
      fieldErrors: { reason: ['reason_too_short'] },
    });
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/shared/api/client.test.ts`
Expected: FAIL, `client.post is not a function`.

- [ ] **Step 4: Implement**

Replace the body of `createApiClient` and `send` in `src/shared/api/client.ts` (keep `buildUrl` and `readJson` unchanged):

```ts
type SendOptions = RequestOptions & { method: 'GET' | 'POST'; body?: unknown };

export function createApiClient({ baseUrl }: { baseUrl: string }) {
  /** Every request is validated: the schema is required, so unvalidated data never reaches the UI. */
  async function request<T extends z.ZodType>(
    path: string,
    schema: T,
    { method, body, params, signal }: SendOptions,
  ): Promise<z.infer<T>> {
    const response = await send(buildUrl(baseUrl, path, params), { method, body, signal });
    const payload = await readJson(response);

    if (!response.ok) throw ApiError.fromResponse(response.status, payload);

    const result = schema.safeParse(payload);
    if (!result.success) {
      console.error(
        `[api] ${method} ${path} returned an unexpected shape:\n${z.prettifyError(result.error)}`,
      );
      throw new ApiError({
        kind: 'schema',
        message: 'Response did not match the expected schema',
        status: response.status,
        cause: result.error,
      });
    }
    return result.data;
  }

  function get<T extends z.ZodType>(
    path: string,
    schema: T,
    options: RequestOptions = {},
  ): Promise<z.infer<T>> {
    return request(path, schema, { ...options, method: 'GET' });
  }

  function post<T extends z.ZodType>(
    path: string,
    schema: T,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<z.infer<T>> {
    return request(path, schema, { ...options, method: 'POST', body });
  }

  return { get, post };
}
```

```ts
async function send(
  url: URL,
  { method, body, signal }: Pick<SendOptions, 'method' | 'body' | 'signal'>,
): Promise<Response> {
  const hasBody = body !== undefined;
  try {
    return await fetch(url, {
      method,
      signal,
      headers: hasBody
        ? { Accept: 'application/json', 'Content-Type': 'application/json' }
        : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    // Cancellation is not a failure: let TanStack Query see the original AbortError.
    if (signal?.aborted && cause instanceof Error) throw cause;
    throw new ApiError({ kind: 'network', message: 'Network request failed', cause });
  }
}
```

The existing schema-mismatch test asserts only `kind: 'schema'`, so the new log prefix (which includes the method) does not break it.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/shared/api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/shared/api
git commit -m "Add apiClient.post with the same validation as get"
```

---

### Task 2: Detail and review contract, and review rules

**Files:**
- Modify: `src/features/applications/schemas.ts`, `src/features/applications/types.ts`, `src/features/applications/fixtures.ts`
- Create: `src/features/applications/rules.ts`
- Test: `src/features/applications/schemas.test.ts` (append), `src/features/applications/rules.test.ts`

**Interfaces:**
- Produces (from `schemas.ts`):
  - Documents: `DOCUMENT_KINDS`, `DocumentKindSchema`, `ApplicationDocumentSchema`
  - `TimelineEventSchema`, a discriminated union on `kind`: `submitted | status_changed | info_requested | comment`
  - `ApplicationDetailSchema`: the summary, plus applicant IC, email and phone, business address, `documents`, `timeline` and `version`
  - `ReviewDecisionSchema`, a discriminated union on `decision`: `approve | reject | request_info`
  - `ReviewRequestSchema` = `{ version: number; review: ReviewDecision }`
  - `NOTE_MAX_LENGTH = 500`
- Produces (from `types.ts`): `DocumentKind`, `ApplicationDocument`, `TimelineEvent`, `ApplicationDetail`, `ReviewDecisionInput` (the zod input type), `ReviewDecision` (output), `Decision`, `ReviewRequest`.
- Produces (from `rules.ts`): `REVIEWABLE_STATUSES`, `isReviewable(status)`, `statusAfterDecision(decision)`, `REVIEW_ERROR_CODES`, `ReviewErrorCode`, `isReviewErrorCode(value)`, `reviewErrorKey(code)` (returns an i18n key under `review.errors.*`).
- Produces (from `fixtures.ts`): `makeApplicationDetail(overrides?)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/features/applications/schemas.test.ts`:

```ts
import { makeApplicationDetail } from './fixtures';
import { ApplicationDetailSchema, ReviewDecisionSchema, TimelineEventSchema } from './schemas';

describe('TimelineEventSchema', () => {
  it('accepts each event kind with its own fields', () => {
    const at = '2026-09-20T09:00:00.000Z';
    const events = [
      { id: 'e1', at, actor: 'Tan Wei Jie', kind: 'submitted' },
      { id: 'e2', at, actor: 'En. Kumar', kind: 'status_changed', from: 'submitted', to: 'under_review', note: null },
      { id: 'e3', at, actor: 'En. Kumar', kind: 'info_requested', requestedInfo: ['floor_plan'], note: 'Sila hantar pelan.' },
      { id: 'e4', at, actor: 'En. Kumar', kind: 'comment', note: 'Lawatan tapak dijadualkan.' },
    ];
    for (const event of events) {
      expect(TimelineEventSchema.safeParse(event).success).toBe(true);
    }
  });

  it('rejects an event missing the fields of its kind', () => {
    const result = TimelineEventSchema.safeParse({
      id: 'e2',
      at: '2026-09-20T09:00:00.000Z',
      actor: 'En. Kumar',
      kind: 'status_changed',
    });
    expect(result.success).toBe(false);
  });
});

describe('ApplicationDetailSchema', () => {
  it('accepts a full application record', () => {
    expect(ApplicationDetailSchema.safeParse(makeApplicationDetail()).success).toBe(true);
  });
});

describe('ReviewDecisionSchema', () => {
  const codes = (input: unknown) => {
    const result = ReviewDecisionSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('allows approval with an empty note', () => {
    expect(ReviewDecisionSchema.parse({ decision: 'approve', note: '  ' })).toEqual({
      decision: 'approve',
      note: '',
    });
  });

  it('requires a rejection reason of at least 10 characters after trimming', () => {
    expect(codes({ decision: 'reject', reason: '   short   ' })).toEqual(['reason_too_short']);
    expect(codes({ decision: 'reject', reason: 'Premis di zon kediaman' })).toEqual([]);
  });

  it('requires at least one document and a note when requesting information', () => {
    expect(codes({ decision: 'request_info', requestedInfo: [], note: 'ok' })).toEqual([
      'requested_info_required',
      'note_too_short',
    ]);
  });

  it('caps free text at 500 characters', () => {
    expect(codes({ decision: 'approve', note: 'a'.repeat(501) })).toEqual(['too_long']);
  });
});
```

`src/features/applications/rules.test.ts`:

```ts
import {
  isReviewable,
  isReviewErrorCode,
  reviewErrorKey,
  statusAfterDecision,
} from './rules';

describe('review rules', () => {
  it('allows review only while an application is open', () => {
    expect(isReviewable('submitted')).toBe(true);
    expect(isReviewable('under_review')).toBe(true);
    expect(isReviewable('info_requested')).toBe(true);
    expect(isReviewable('approved')).toBe(false);
    expect(isReviewable('rejected')).toBe(false);
  });

  it('maps each decision to the status it produces', () => {
    expect(statusAfterDecision('approve')).toBe('approved');
    expect(statusAfterDecision('reject')).toBe('rejected');
    expect(statusAfterDecision('request_info')).toBe('info_requested');
  });

  it('turns known error codes into translation keys and unknown ones into a fallback', () => {
    expect(isReviewErrorCode('missing_fire_certificate')).toBe(true);
    expect(isReviewErrorCode('something_else')).toBe(false);
    expect(reviewErrorKey('reason_too_short')).toBe('review.errors.reason_too_short');
    expect(reviewErrorKey('something_else')).toBe('review.errors.unknown');
    expect(reviewErrorKey(undefined)).toBe('review.errors.unknown');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/applications/schemas.test.ts src/features/applications/rules.test.ts`
Expected: FAIL, missing exports.

- [ ] **Step 3: Implement the schemas**

Append to `src/features/applications/schemas.ts`:

```ts
export const DOCUMENT_KINDS = [
  'ssm_certificate',
  'premises_photo',
  'floor_plan',
  'fire_certificate',
] as const;
export const DocumentKindSchema = z.enum(DOCUMENT_KINDS);

export const ApplicationDocumentSchema = z.object({
  id: z.string(),
  kind: DocumentKindSchema,
  fileName: z.string(),
  sizeKb: z.number().int().positive(),
});

const timelineBase = { id: z.string(), at: z.iso.datetime(), actor: z.string() };

/** Each kind of event carries different fields; the UI switches on `kind` exhaustively. */
export const TimelineEventSchema = z.discriminatedUnion('kind', [
  z.object({ ...timelineBase, kind: z.literal('submitted') }),
  z.object({
    ...timelineBase,
    kind: z.literal('status_changed'),
    from: ApplicationStatusSchema,
    to: ApplicationStatusSchema,
    note: z.string().nullable(),
  }),
  z.object({
    ...timelineBase,
    kind: z.literal('info_requested'),
    requestedInfo: z.array(DocumentKindSchema).min(1),
    note: z.string(),
  }),
  z.object({ ...timelineBase, kind: z.literal('comment'), note: z.string() }),
]);

export const ApplicationDetailSchema = ApplicationSummarySchema.extend({
  applicantIdNumber: z.string(),
  applicantEmail: z.email(),
  applicantPhone: z.string(),
  businessAddress: z.string(),
  documents: z.array(ApplicationDocumentSchema),
  timeline: z.array(TimelineEventSchema),
  // Increases on every change; a review must send the version it was based on.
  version: z.number().int().min(1),
});

export const NOTE_MAX_LENGTH = 500;

// Messages are error codes, not prose: the UI translates them (see rules.ts).
const freeText = z.string().trim().max(NOTE_MAX_LENGTH, 'too_long');

export const ReviewDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve'), note: freeText }),
  z.object({ decision: z.literal('reject'), reason: freeText.min(10, 'reason_too_short') }),
  z.object({
    decision: z.literal('request_info'),
    requestedInfo: z.array(DocumentKindSchema).min(1, 'requested_info_required'),
    note: freeText.min(5, 'note_too_short'),
  }),
]);

export const ReviewRequestSchema = z.object({
  version: z.number().int().min(1),
  review: ReviewDecisionSchema,
});
```

If zod reports the `min` after `max` on `freeText` in a different order than the tests expect, keep the tests and reorder the chain (`z.string().trim().min(...).max(...)`) inside each branch instead of reusing `freeText`.

Append to `src/features/applications/types.ts` (and add the new schema names to its `import type` list):

```ts
export type DocumentKind = z.infer<typeof DocumentKindSchema>;
export type ApplicationDocument = z.infer<typeof ApplicationDocumentSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type ApplicationDetail = z.infer<typeof ApplicationDetailSchema>;
export type ReviewDecisionInput = z.input<typeof ReviewDecisionSchema>;
export type ReviewDecision = z.output<typeof ReviewDecisionSchema>;
export type Decision = ReviewDecision['decision'];
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
```

- [ ] **Step 4: Implement the rules and the fixture**

`src/features/applications/rules.ts`:

```ts
import { assertNever } from '@/shared/lib/assertNever';
import type { ApplicationStatus, Decision } from './types';

export const REVIEWABLE_STATUSES = ['submitted', 'under_review', 'info_requested'] as const;

export function isReviewable(status: ApplicationStatus): boolean {
  return (REVIEWABLE_STATUSES as readonly ApplicationStatus[]).includes(status);
}

export function statusAfterDecision(decision: Decision): ApplicationStatus {
  switch (decision) {
    case 'approve':
      return 'approved';
    case 'reject':
      return 'rejected';
    case 'request_info':
      return 'info_requested';
    default:
      return assertNever(decision);
  }
}

/** Codes shared by client-side validation and the server's 422 responses. */
export const REVIEW_ERROR_CODES = [
  'reason_too_short',
  'note_too_short',
  'requested_info_required',
  'too_long',
  'missing_fire_certificate',
  'not_reviewable',
  'unknown',
] as const;

export type ReviewErrorCode = (typeof REVIEW_ERROR_CODES)[number];

export function isReviewErrorCode(value: string): value is ReviewErrorCode {
  return (REVIEW_ERROR_CODES as readonly string[]).includes(value);
}

/** A server may send codes this client does not know yet; those fall back to a generic message. */
export function reviewErrorKey(code: string | undefined): `review.errors.${ReviewErrorCode}` {
  return code !== undefined && isReviewErrorCode(code)
    ? `review.errors.${code}`
    : 'review.errors.unknown';
}
```

Append to `src/features/applications/fixtures.ts`:

```ts
import type { ApplicationDetail } from './types';

export function makeApplicationDetail(
  overrides: Partial<ApplicationDetail> = {},
): ApplicationDetail {
  return {
    ...makeApplicationSummary({ status: 'under_review' }),
    applicantIdNumber: '850412-10-5523',
    applicantEmail: 'tan.1@example.com.my',
    applicantPhone: '012-345 6789',
    businessAddress: '12, Jalan Merdeka, 40000 Selangor',
    documents: [
      { id: 'app-001-doc-1', kind: 'ssm_certificate', fileName: 'ssm_certificate.pdf', sizeKb: 320 },
      { id: 'app-001-doc-2', kind: 'premises_photo', fileName: 'premises_photo.jpg', sizeKb: 1480 },
    ],
    timeline: [
      { id: 'app-001-ev-1', kind: 'submitted', at: '2026-09-20T09:00:00.000Z', actor: 'Tan Wei Jie' },
      {
        id: 'app-001-ev-2',
        kind: 'status_changed',
        at: '2026-09-21T09:00:00.000Z',
        actor: 'Pn. Hafizah',
        from: 'submitted',
        to: 'under_review',
        note: null,
      },
    ],
    version: 2,
    ...overrides,
  };
}
```

Merge the two `import type` lines in `fixtures.ts` into one.

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/features/applications`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/features/applications
git commit -m "Add the application detail and review contract with review rules"
```

---

### Task 3: Full mock records and the review rules on the "server"

**Files:**
- Modify: `src/mocks/db/applications.ts`
- Test: `src/mocks/db/applications.test.ts` (append)

**Interfaces:**
- Consumes: the Task 2 schemas, types and rules.
- Produces:
  - `CURRENT_OFFICER = 'Pn. Hafizah'`
  - `seedApplicationDetails(count?, seed?): ApplicationDetail[]`
  - `toSummary(detail): ApplicationSummary`
  - `requiresFireCertificate(category): boolean`
  - `getApplication(id): ApplicationDetail | undefined`
  - `applyReview(id, request, now?): ReviewOutcome`
  - `type ReviewOutcome = { kind: 'ok'; detail } | { kind: 'not_found' } | { kind: 'conflict' } | { kind: 'invalid'; fieldErrors: Record<string, ReviewErrorCode[]> }`
- **Invariant:** `seedApplications()` (the summaries) must stay byte-for-byte identical to Plan 1. Several Plan 1 tests depend on it: 57 records, `LPP-2026-1000..1056`, and "Restoran Selera Kampung". The extra detail fields therefore come from a **separate** random stream for each record.

- [ ] **Step 1: Write the failing tests** (append to `src/mocks/db/applications.test.ts`)

```ts
import { ApplicationDetailSchema } from '@/features/applications/schemas';
import { isReviewable } from '@/features/applications/rules';
import {
  applyReview,
  getApplication,
  requiresFireCertificate,
  seedApplicationDetails,
  toSummary,
} from './applications';

const details = seedApplicationDetails();
const hasFire = (d: (typeof details)[number]) =>
  d.documents.some((doc) => doc.kind === 'fire_certificate');

describe('seedApplicationDetails', () => {
  it('extends the Plan 1 summaries without changing them', () => {
    expect(details.map(toSummary)).toEqual(seedApplications());
  });

  it('produces records that satisfy the detail contract', () => {
    expect(z.array(ApplicationDetailSchema).safeParse(details).success).toBe(true);
  });

  it('gives every record a timeline that starts with its submission and a matching version', () => {
    for (const d of details) {
      expect(d.timeline[0]?.kind).toBe('submitted');
      expect(d.version).toBe(d.timeline.length);
    }
  });

  it('never approves a premises that needs a fire certificate without one', () => {
    const inconsistent = details.filter(
      (d) => d.status === 'approved' && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
    );
    expect(inconsistent).toEqual([]);
  });

  it('contains an open application that the fire-certificate rule will block', () => {
    const blocked = details.find(
      (d) => isReviewable(d.status) && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
    );
    expect(blocked).toBeDefined();
  });
});

describe('applyReview', () => {
  const open = () => details.find((d) => isReviewable(d.status) && !requiresFireCertificate(d.premisesCategory))!;
  const now = new Date('2026-09-23T02:00:00.000Z');

  it('records a decision, appends a timeline event and bumps the version', () => {
    const target = open();
    const outcome = applyReview(
      target.id,
      { version: target.version, review: { decision: 'reject', reason: 'Premis di zon kediaman' } },
      now,
    );

    expect(outcome.kind).toBe('ok');
    const saved = getApplication(target.id)!;
    expect(saved.status).toBe('rejected');
    expect(saved.version).toBe(target.version + 1);
    expect(saved.assignedOfficerName).toBe('Pn. Hafizah');
    expect(saved.timeline.at(-1)).toMatchObject({
      kind: 'status_changed',
      from: target.status,
      to: 'rejected',
      note: 'Premis di zon kediaman',
      actor: 'Pn. Hafizah',
      at: now.toISOString(),
    });
  });

  it('records an information request with the requested documents', () => {
    const target = open();
    applyReview(
      target.id,
      {
        version: target.version,
        review: { decision: 'request_info', requestedInfo: ['floor_plan'], note: 'Sila hantar pelan lantai.' },
      },
      now,
    );
    expect(getApplication(target.id)?.timeline.at(-1)).toMatchObject({
      kind: 'info_requested',
      requestedInfo: ['floor_plan'],
    });
  });

  it('rejects a stale version as a conflict', () => {
    const target = open();
    const outcome = applyReview(target.id, {
      version: target.version - 1,
      review: { decision: 'approve', note: '' },
    });
    expect(outcome).toEqual({ kind: 'conflict' });
  });

  it('refuses to approve without a required fire certificate', () => {
    const target = details.find(
      (d) => isReviewable(d.status) && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
    )!;
    const outcome = applyReview(target.id, {
      version: target.version,
      review: { decision: 'approve', note: '' },
    });
    expect(outcome).toEqual({
      kind: 'invalid',
      fieldErrors: { decision: ['missing_fire_certificate'] },
    });
  });

  it('refuses to review an application that already has a decision', () => {
    const closed = details.find((d) => d.status === 'approved')!;
    const outcome = applyReview(closed.id, {
      version: closed.version,
      review: { decision: 'reject', reason: 'Tidak lagi sah.' },
    });
    expect(outcome).toEqual({ kind: 'invalid', fieldErrors: { decision: ['not_reviewable'] } });
  });

  it('reports an unknown application', () => {
    expect(
      applyReview('app-999', { version: 1, review: { decision: 'approve', note: '' } }),
    ).toEqual({ kind: 'not_found' });
  });
});
```

Merge these imports with the existing imports at the top of the file.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/mocks/db`
Expected: FAIL, missing exports.

- [ ] **Step 3: Implement**

In `src/mocks/db/applications.ts`, keep `seedApplications`, `SORTERS` and `queryApplications` exactly as they are. Add the following below the constants, and add `ApplicationDetail`, `ApplicationDocument`, `DocumentKind`, `ReviewRequest` and `TimelineEvent` to the existing `import type` list:

```ts
import { isReviewable, statusAfterDecision, type ReviewErrorCode } from '@/features/applications/rules';
import { assertNever } from '@/shared/lib/assertNever';

export const CURRENT_OFFICER = 'Pn. Hafizah';
const DAY_MS = 24 * HOUR_MS;
// Detail fields use their own random stream per record, so the summaries (and the
// Plan 1 tests built on them) stay exactly as they were.
const DETAIL_SEED_OFFSET = 1000;

const STREETS = ['Merdeka', 'Bunga Raya', 'Tun Razak', 'Sultan Ismail', 'Perdana', 'Kenanga'] as const;

export function requiresFireCertificate(category: PremisesCategory): boolean {
  return category === 'food_beverage' || category === 'entertainment';
}

const pad = (n: number) => String(n).padStart(2, '0');

function seedDocuments(summary: ApplicationSummary, random: ReturnType<typeof createRandom>): ApplicationDocument[] {
  const kinds: DocumentKind[] = ['ssm_certificate', 'premises_photo'];
  if (random.next() < 0.7) kinds.push('floor_plan');
  const mustHaveFire = summary.status === 'approved' && requiresFireCertificate(summary.premisesCategory);
  if (mustHaveFire || random.next() < 0.6) kinds.push('fire_certificate');
  return kinds.map((kind, index) => ({
    id: `${summary.id}-doc-${index + 1}`,
    kind,
    fileName: kind === 'premises_photo' ? `${kind}.jpg` : `${kind}.pdf`,
    sizeKb: random.int(80, 2400),
  }));
}

function seedTimeline(summary: ApplicationSummary, documents: ApplicationDocument[]): TimelineEvent[] {
  const at = (days: number) => new Date(Date.parse(summary.submittedAt) + days * DAY_MS).toISOString();
  const event = (n: number) => `${summary.id}-ev-${n}`;
  const officer = summary.assignedOfficerName ?? CURRENT_OFFICER;
  const events: TimelineEvent[] = [
    { id: event(1), kind: 'submitted', at: summary.submittedAt, actor: summary.applicantName },
  ];
  if (summary.status === 'submitted') return events;

  events.push({ id: event(2), kind: 'status_changed', at: at(1), actor: officer, from: 'submitted', to: 'under_review', note: null });

  switch (summary.status) {
    case 'under_review':
      break;
    case 'info_requested': {
      const missing = (['floor_plan', 'fire_certificate'] as const).filter(
        (kind) => !documents.some((doc) => doc.kind === kind),
      );
      events.push({
        id: event(3),
        kind: 'info_requested',
        at: at(2),
        actor: officer,
        requestedInfo: missing.length > 0 ? [...missing] : ['floor_plan'],
        note: 'Sila kemukakan dokumen tambahan.',
      });
      break;
    }
    case 'approved':
      events.push({ id: event(3), kind: 'status_changed', at: at(3), actor: officer, from: 'under_review', to: 'approved', note: 'Semua dokumen lengkap.' });
      break;
    case 'rejected':
      events.push({ id: event(3), kind: 'status_changed', at: at(3), actor: officer, from: 'under_review', to: 'rejected', note: 'Premis tidak mematuhi syarat zon.' });
      break;
    default:
      return assertNever(summary.status);
  }
  return events;
}

export function seedApplicationDetails(count = COUNT, seed = SEED): ApplicationDetail[] {
  return seedApplications(count, seed).map((summary, index) => {
    const random = createRandom(seed + DETAIL_SEED_OFFSET + index);
    const firstName = summary.applicantName.split(' ')[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? 'pemohon';
    const documents = seedDocuments(summary, random);
    const timeline = seedTimeline(summary, documents);
    return {
      ...summary,
      applicantIdNumber: `${pad(random.int(60, 99))}${pad(random.int(1, 12))}${pad(random.int(1, 28))}-${pad(random.int(1, 14))}-${random.int(1000, 9999)}`,
      applicantEmail: `${firstName}.${index + 1}@example.com.my`,
      applicantPhone: `01${random.int(0, 9)}-${random.int(100, 999)} ${random.int(1000, 9999)}`,
      businessAddress: `${random.int(1, 120)}, Jalan ${random.pick(STREETS)}, ${random.int(10000, 98000)} ${summary.state}`,
      documents,
      timeline,
      version: timeline.length,
    };
  });
}

export function toSummary(detail: ApplicationDetail): ApplicationSummary {
  const { id, referenceNo, applicantName, businessName, premisesCategory, state, submittedAt, status, assignedOfficerName } = detail;
  return { id, referenceNo, applicantName, businessName, premisesCategory, state, submittedAt, status, assignedOfficerName };
}
```

Replace the store section (`let applications = seedApplications();` through `resetApplications`) with:

```ts
let applications = seedApplicationDetails();

export function getApplications(): readonly ApplicationSummary[] {
  return applications.map(toSummary);
}

export function getApplication(id: string): ApplicationDetail | undefined {
  return applications.find((application) => application.id === id);
}

export function resetApplications(): void {
  applications = seedApplicationDetails();
}

export type ReviewOutcome =
  | { kind: 'ok'; detail: ApplicationDetail }
  | { kind: 'not_found' }
  | { kind: 'conflict' }
  | { kind: 'invalid'; fieldErrors: Record<string, ReviewErrorCode[]> };

/** The mock server's rules. The UI does not know the fire-certificate rule; it learns it from the 422. */
export function applyReview(id: string, request: ReviewRequest, now = new Date()): ReviewOutcome {
  const current = getApplication(id);
  if (!current) return { kind: 'not_found' };
  if (request.version !== current.version) return { kind: 'conflict' };
  if (!isReviewable(current.status)) return { kind: 'invalid', fieldErrors: { decision: ['not_reviewable'] } };

  const { review } = request;
  if (
    review.decision === 'approve' &&
    requiresFireCertificate(current.premisesCategory) &&
    !current.documents.some((doc) => doc.kind === 'fire_certificate')
  ) {
    return { kind: 'invalid', fieldErrors: { decision: ['missing_fire_certificate'] } };
  }

  const to = statusAfterDecision(review.decision);
  const base = { id: `${current.id}-ev-${current.timeline.length + 1}`, at: now.toISOString(), actor: CURRENT_OFFICER };
  let event: TimelineEvent;
  switch (review.decision) {
    case 'approve':
      event = { ...base, kind: 'status_changed', from: current.status, to, note: review.note === '' ? null : review.note };
      break;
    case 'reject':
      event = { ...base, kind: 'status_changed', from: current.status, to, note: review.reason };
      break;
    case 'request_info':
      event = { ...base, kind: 'info_requested', requestedInfo: review.requestedInfo, note: review.note };
      break;
    default:
      return assertNever(review);
  }

  const detail: ApplicationDetail = {
    ...current,
    status: to,
    assignedOfficerName: CURRENT_OFFICER,
    timeline: [...current.timeline, event],
    version: current.version + 1,
  };
  applications = applications.map((application) => (application.id === id ? detail : application));
  return { kind: 'ok', detail };
}
```

If the "contains an open application that the fire-certificate rule will block" test fails, the seed happens to contain no such record. Change `DETAIL_SEED_OFFSET` (try 2000, 3000, and so on) until it passes, record the value in the report, and do not change `seedApplications`.

- [ ] **Step 4: Run all tests** (the Plan 1 list tests must still pass)

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/mocks/db
git commit -m "Seed full application records and apply review rules in the mock server"
```

---

### Task 4: Detail and review endpoints, and the forced-conflict switch

**Files:**
- Modify: `src/mocks/devControls.ts`, `src/mocks/handlers/applications.ts`
- Test: `src/mocks/handlers/applications.test.ts` (append)

**Interfaces:**
- `DevControls` gains `conflictNext: boolean`, with default `false`. Once a review request uses it, it switches itself back off.
- `GET /api/applications/:id` returns `ApplicationDetail`, or `404 { message }`.
- `POST /api/applications/:id/review` takes the body `ReviewRequest` and returns the updated `ApplicationDetail`. Errors:
  - `404` if the application doesn't exist
  - `409` for a stale version, or when `conflictNext` is on
  - `422 { message, fieldErrors: Record<string, code[]> }` for an invalid body or a broken business rule. Field keys are relative to `review`, for example `reason`.
- Latency and failure simulation (`simulateNetwork`) applies to both endpoints.

- [ ] **Step 1: Write the failing tests** (append)

```ts
import { ApplicationDetailSchema } from '@/features/applications/schemas';
import { isReviewable } from '@/features/applications/rules';
import { getDevControls } from '../devControls';
import { requiresFireCertificate, seedApplicationDetails } from '../db/applications';

const details = seedApplicationDetails();
const openApp = details.find((d) => isReviewable(d.status) && !requiresFireCertificate(d.premisesCategory))!;
const getDetail = (id: string) => apiClient.get(`/applications/${id}`, ApplicationDetailSchema);
const postReview = (id: string, body: unknown) =>
  apiClient.post(`/applications/${id}/review`, ApplicationDetailSchema, body);

describe('GET /api/applications/:id', () => {
  it('returns the full record', async () => {
    await expect(getDetail(openApp.id)).resolves.toMatchObject({ id: openApp.id, version: openApp.version });
  });

  it('returns 404 for an unknown id', async () => {
    await expect(getDetail('app-999')).rejects.toMatchObject({ kind: 'http', status: 404 });
  });
});

describe('POST /api/applications/:id/review', () => {
  it('records the decision and returns the updated record', async () => {
    const saved = await postReview(openApp.id, {
      version: openApp.version,
      review: { decision: 'reject', reason: 'Premis di zon kediaman' },
    });
    expect(saved).toMatchObject({ status: 'rejected', version: openApp.version + 1 });
  });

  it('answers 422 with field error codes for an invalid body', async () => {
    await expect(
      postReview(openApp.id, { version: openApp.version, review: { decision: 'reject', reason: 'short' } }),
    ).rejects.toMatchObject({ kind: 'validation', fieldErrors: { reason: ['reason_too_short'] } });
  });

  it('answers 409 when the version is stale', async () => {
    await expect(
      // A future version is just as stale; version - 1 could be 0, which fails validation (422) instead.
      postReview(openApp.id, { version: openApp.version + 1, review: { decision: 'approve', note: '' } }),
    ).rejects.toMatchObject({ kind: 'conflict', status: 409 });
  });

  it('answers 409 once when the Dev Panel forces a conflict, then switches itself off', async () => {
    setDevControls({ conflictNext: true });
    await expect(
      postReview(openApp.id, { version: openApp.version, review: { decision: 'approve', note: '' } }),
    ).rejects.toMatchObject({ kind: 'conflict' });
    expect(getDevControls().conflictNext).toBe(false);
  });

  it('honours the Dev Panel failure setting', async () => {
    setDevControls({ failure: 'server' });
    await expect(
      postReview(openApp.id, { version: openApp.version, review: { decision: 'approve', note: '' } }),
    ).rejects.toMatchObject({ kind: 'http', status: 500 });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/mocks/handlers`
Expected: FAIL, because the 404 handler for `/api/applications/:id` is missing (MSW reports an unhandled request) and `conflictNext` is not a property.

- [ ] **Step 3: Implement**

`src/mocks/devControls.ts`: add `conflictNext: z.boolean()` to `DevControlsSchema`, and `conflictNext: false` to `DEFAULT_DEV_CONTROLS`. Older saved settings without the field fail to parse and fall back to the defaults, which is fine.

Append handlers to `applicationHandlers` in `src/mocks/handlers/applications.ts`:

```ts
import type { z } from 'zod';
import { ReviewRequestSchema } from '@/features/applications/schemas';
import { assertNever } from '@/shared/lib/assertNever';
import { applyReview, getApplication } from '../db/applications';
import { setDevControls } from '../devControls';

/** zod issues -> { field: [code] }, with paths relative to `review` (the form's field names). */
function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path[0] === 'review' ? issue.path.slice(1) : issue.path;
    const key = path.join('.') || 'root';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
```

```ts
  http.get('/api/applications/:id', async ({ params }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;

    const detail = getApplication(String(params.id));
    if (!detail) return HttpResponse.json({ message: 'Application not found' }, { status: 404 });
    return HttpResponse.json(detail);
  }),

  http.post('/api/applications/:id/review', async ({ params, request }) => {
    const failure = await simulateNetwork();
    if (failure) return failure;

    if (getDevControls().conflictNext) {
      setDevControls({ conflictNext: false });
      return HttpResponse.json({ message: 'Updated by another officer' }, { status: 409 });
    }

    const body: unknown = await request.json();
    const parsed = ReviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json(
        { message: 'Invalid review', fieldErrors: toFieldErrors(parsed.error) },
        { status: 422 },
      );
    }

    const outcome = applyReview(String(params.id), parsed.data);
    switch (outcome.kind) {
      case 'ok':
        return HttpResponse.json(outcome.detail);
      case 'not_found':
        return HttpResponse.json({ message: 'Application not found' }, { status: 404 });
      case 'conflict':
        return HttpResponse.json({ message: 'Updated by another officer' }, { status: 409 });
      case 'invalid':
        return HttpResponse.json(
          { message: 'Review rejected', fieldErrors: outcome.fieldErrors },
          { status: 422 },
        );
      default:
        return assertNever(outcome);
    }
  }),
```

- [ ] **Step 4: Run all tests**

Run: `npm run test:run`
Expected: PASS. The existing Dev Panel "active" detection now also covers `conflictNext` automatically, and the existing Dev Panel tests must still pass.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/mocks
git commit -m "Add detail and review endpoints with a forced-conflict switch"
```

---

### Task 5: Detail query and the optimistic review mutation

**Files:**
- Modify: `src/features/applications/api/keys.ts`, `src/features/applications/api/queries.ts`
- Create: `src/features/applications/api/mutations.ts`
- Test: `src/features/applications/api/keys.test.ts` (append), `src/features/applications/api/queries.test.tsx` (append), `src/features/applications/api/mutations.test.tsx`

**Interfaces:**
- `applicationKeys.details()`, `applicationKeys.detail(id)`
- `useApplication(id: string)`: a `UseQueryResult<ApplicationDetail, Error>`
- `useReviewApplication(id: string)`: a `UseMutationResult<ApplicationDetail, Error, ReviewRequest, ReviewContext>`.
  - **On mutate:** the status changes immediately in the detail cache and in every cached list page.
  - **On error:** both are rolled back.
  - **On success:** the detail cache is set to the server's record.
  - **On settle:** everything under `applicationKeys.all` is invalidated.

- [ ] **Step 1: Write the failing tests**

Append to `keys.test.ts`:

```ts
it('nests detail keys under details(), and details() under all', () => {
  expect(applicationKeys.detail('app-001')).toEqual(['applications', 'detail', 'app-001']);
  expect(applicationKeys.detail('app-001').slice(0, 2)).toEqual(applicationKeys.details());
});
```

Append to `queries.test.tsx`:

```tsx
describe('useApplication', () => {
  it('loads one application by id', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplication('app-001'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ id: 'app-001', referenceNo: 'LPP-2026-1000' });
  });

  it('exposes a 404 for an unknown id', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApplication('app-999'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404 });
  });
});
```

`src/features/applications/api/mutations.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { isReviewable } from '@/features/applications/rules';
import { requiresFireCertificate, seedApplicationDetails } from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { createWrapper } from '@/test/render';
import { DEFAULT_LIST_PARAMS } from '../schemas';
import type { ApplicationDetail, ApplicationList } from '../types';
import { applicationKeys } from './keys';
import { useReviewApplication } from './mutations';
import { useApplication, useApplications } from './queries';

const target = seedApplicationDetails().find(
  (d) => isReviewable(d.status) && !requiresFireCertificate(d.premisesCategory),
)!;

function setup() {
  const { Wrapper, queryClient } = createWrapper();
  const hook = renderHook(
    () => ({
      detail: useApplication(target.id),
      list: useApplications({ ...DEFAULT_LIST_PARAMS, q: target.referenceNo }),
      review: useReviewApplication(target.id),
    }),
    { wrapper: Wrapper },
  );
  return { ...hook, queryClient };
}

const rejectRequest = () => ({
  version: target.version,
  review: { decision: 'reject' as const, reason: 'Premis di zon kediaman' },
});

describe('useReviewApplication', () => {
  it('shows the new status immediately, before the server answers', async () => {
    const { result, queryClient } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess && result.current.list.isSuccess).toBe(true));
    setDevControls({ latencyMs: 800 });

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() =>
      expect(queryClient.getQueryData<ApplicationDetail>(applicationKeys.detail(target.id))?.status).toBe('rejected'),
    );
    expect(result.current.review.isPending).toBe(true);
    const list = queryClient.getQueryData<ApplicationList>(
      applicationKeys.list({ ...DEFAULT_LIST_PARAMS, q: target.referenceNo }),
    );
    expect(list?.items[0]?.status).toBe('rejected');

    await waitFor(() => expect(result.current.review.isSuccess).toBe(true));
    expect(result.current.review.data?.version).toBe(target.version + 1);
  });

  it('rolls back the optimistic status when the server fails', async () => {
    const { result, queryClient } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess && result.current.list.isSuccess).toBe(true));
    setDevControls({ failure: 'server' });

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() => expect(result.current.review.isError).toBe(true));
    expect(queryClient.getQueryData<ApplicationDetail>(applicationKeys.detail(target.id))?.status).toBe(target.status);
    const list = queryClient.getQueryData<ApplicationList>(
      applicationKeys.list({ ...DEFAULT_LIST_PARAMS, q: target.referenceNo }),
    );
    expect(list?.items[0]?.status).toBe(target.status);
  });

  it('surfaces a conflict as an ApiError of kind "conflict"', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.detail.isSuccess).toBe(true));
    setDevControls({ conflictNext: true });

    act(() => result.current.review.mutate(rejectRequest()));

    await waitFor(() => expect(result.current.review.isError).toBe(true));
    expect(result.current.review.error).toMatchObject({ kind: 'conflict' });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/applications/api`
Expected: FAIL, missing exports.

- [ ] **Step 3: Implement**

`keys.ts`: add

```ts
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
```

`queries.ts`: add (and import `ApplicationDetailSchema`)

```ts
export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: ({ signal }) =>
      apiClient.get(`/applications/${encodeURIComponent(id)}`, ApplicationDetailSchema, { signal }),
  });
}
```

`src/features/applications/api/mutations.ts`:

```ts
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import { statusAfterDecision } from '../rules';
import { ApplicationDetailSchema } from '../schemas';
import type { ApplicationDetail, ApplicationList, ReviewRequest } from '../types';
import { applicationKeys } from './keys';

type ReviewContext = {
  previousDetail: ApplicationDetail | undefined;
  previousLists: [QueryKey, ApplicationList | undefined][];
};

export function useReviewApplication(id: string) {
  const queryClient = useQueryClient();

  return useMutation<ApplicationDetail, Error, ReviewRequest, ReviewContext>({
    mutationFn: (request) =>
      apiClient.post(`/applications/${encodeURIComponent(id)}/review`, ApplicationDetailSchema, request),

    // Show the outcome straight away; the server's answer replaces or rolls it back.
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: applicationKeys.lists() });

      const previousDetail = queryClient.getQueryData<ApplicationDetail>(applicationKeys.detail(id));
      const previousLists = queryClient.getQueriesData<ApplicationList>({ queryKey: applicationKeys.lists() });
      const status = statusAfterDecision(request.review.decision);

      queryClient.setQueryData<ApplicationDetail>(applicationKeys.detail(id), (old) => old && { ...old, status });
      queryClient.setQueriesData<ApplicationList>({ queryKey: applicationKeys.lists() }, (old) =>
        old && { ...old, items: old.items.map((item) => (item.id === id ? { ...item, status } : item)) },
      );

      return { previousDetail, previousLists };
    },

    // The onMutate result is the 3rd argument in TanStack Query v5.
    onError: (_error, _request, context) => {
      if (!context) return;
      queryClient.setQueryData(applicationKeys.detail(id), context.previousDetail);
      for (const [key, data] of context.previousLists) queryClient.setQueryData(key, data);
    },

    onSuccess: (detail) => {
      queryClient.setQueryData(applicationKeys.detail(id), detail);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/applications/api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/features/applications/api
git commit -m "Add the detail query and an optimistic review mutation with rollback"
```

---

### Task 6: Strings, toast host and Dev Panel changes

**Files:**
- Modify: `src/shared/i18n/en.ts`, `src/shared/i18n/ms.ts`, `src/shared/lib/format.ts`, `src/app/AppLayout.tsx`, `src/app/dev-panel/DevPanel.tsx`
- Test: `src/shared/lib/format.test.ts` (append), `src/app/dev-panel/DevPanel.test.tsx` (append)

**Interfaces:**
- New i18n keys (below), used by Tasks 7–10.
- `formatDateTime(iso, language)`.
- `AutoToast` is mounted once in `AppLayout`.
- The Dev Panel gains a "Force a conflict on the next review" checkbox.
- The Dev Panel's Escape now closes it only when focus is inside the panel. This fixes the parked Plan 1 issue where Escape in a Select or Dialog also closed the Dev Panel.

- [ ] **Step 1: Write the failing tests**

Append to `src/shared/lib/format.test.ts`:

```ts
describe('formatDateTime', () => {
  it('shows date and time in Malaysian time', () => {
    const text = formatDateTime('2026-09-20T17:05:00.000Z', 'en');
    expect(text).toMatch(/21 Sep/);
    expect(text).toMatch(/1:05/);
  });
});
```

(Import `formatDateTime` alongside `formatDate`.)

Append to `src/app/dev-panel/DevPanel.test.tsx`:

```tsx
it('forces a conflict on the next review', async () => {
  const { user } = renderPanel();
  await user.click(screen.getByRole('button', { name: 'Dev Panel' }));

  await user.click(screen.getByRole('checkbox', { name: 'Force a conflict on the next review' }));

  expect(getDevControls().conflictNext).toBe(true);
});

it('ignores Escape pressed outside the panel', async () => {
  const { Wrapper } = createWrapper();
  const user = userEvent.setup();
  render(
    <>
      <button type="button">Elsewhere</button>
      <DevPanel />
    </>,
    { wrapper: Wrapper },
  );
  await user.click(screen.getByRole('button', { name: 'Dev Panel' }));
  screen.getByRole('button', { name: 'Elsewhere' }).focus();

  await user.keyboard('{Escape}');

  expect(screen.getByRole('region', { name: 'Mock API controls' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/shared/lib src/app/dev-panel`
Expected: FAIL.

- [ ] **Step 3: Add the strings**

In `src/shared/i18n/en.ts`, add these to the existing `applications` object:

```ts
    detail: {
      breadcrumbLabel: 'Breadcrumb',
      breadcrumb: 'Applications',
      loading: 'Loading application…',
      notFoundTitle: 'Application not found',
      notFoundBody: 'No application has this reference. It may have been removed.',
      loadErrorTitle: "Couldn't load this application",
      sections: {
        applicant: 'Applicant',
        business: 'Business',
        documents: 'Documents',
        timeline: 'Timeline',
      },
      fields: {
        name: 'Name',
        idNumber: 'IC number',
        email: 'Email',
        phone: 'Phone',
        businessName: 'Business name',
        address: 'Address',
        category: 'Category',
        state: 'State',
        submittedAt: 'Submitted',
        officer: 'Assigned officer',
      },
      unassigned: 'Unassigned',
      review: 'Review application',
      closed: 'A decision has been recorded. This application is closed.',
      documentSize: '{{size}} KB',
    },
```

Add these top-level objects:

```ts
  documents: {
    ssm_certificate: 'SSM certificate',
    premises_photo: 'Premises photo',
    floor_plan: 'Floor plan',
    fire_certificate: 'Fire safety certificate',
  },
  timeline: {
    submitted: 'Submitted by {{actor}}',
    status_changed: '{{actor}} changed the status from {{from}} to {{to}}',
    info_requested: '{{actor}} asked for more information',
    comment: '{{actor}} added a note',
    requested: 'Requested: {{documents}}',
  },
  review: {
    title: 'Review {{reference}}',
    description: 'Your decision is added to the application timeline.',
    decision: 'Decision',
    decisions: {
      approve: 'Approve',
      reject: 'Reject',
      request_info: 'Request more information',
    },
    note: 'Note (optional)',
    noteRequired: 'Note to the applicant',
    reason: 'Reason for rejection',
    requestedInfo: 'Documents needed',
    submit: 'Submit decision',
    submitting: 'Submitting…',
    cancel: 'Cancel',
    conflictTitle: 'Another officer updated this application',
    conflictBody: 'The latest version is loading. Check it, then submit your decision again.',
    reload: 'Reload latest',
    failedTitle: "Couldn't submit your decision",
    errorToast: 'Your decision was not saved',
    success: {
      approve: 'Application approved',
      reject: 'Application rejected',
      request_info: 'Information requested',
    },
    successBody: '{{reference}} is now {{status}}.',
    errors: {
      reason_too_short: 'Give a reason of at least 10 characters.',
      note_too_short: 'Write a note of at least 5 characters.',
      requested_info_required: 'Choose at least one document.',
      too_long: 'Keep this under 500 characters.',
      missing_fire_certificate:
        'This premises type needs a fire safety certificate before it can be approved.',
      not_reviewable: 'This application already has a decision.',
      unknown: 'Check this field and try again.',
    },
  },
```

Add `conflictNext: 'Force a conflict on the next review',` to `devPanel`.

In `src/shared/i18n/ms.ts`, add the same keys with these values:

```ts
    detail: {
      breadcrumbLabel: 'Laluan navigasi',
      breadcrumb: 'Permohonan',
      loading: 'Memuatkan permohonan…',
      notFoundTitle: 'Permohonan tidak ditemui',
      notFoundBody: 'Tiada permohonan dengan rujukan ini. Ia mungkin telah dikeluarkan.',
      loadErrorTitle: 'Permohonan ini tidak dapat dimuatkan',
      sections: {
        applicant: 'Pemohon',
        business: 'Perniagaan',
        documents: 'Dokumen',
        timeline: 'Garis masa',
      },
      fields: {
        name: 'Nama',
        idNumber: 'No. kad pengenalan',
        email: 'E-mel',
        phone: 'Telefon',
        businessName: 'Nama perniagaan',
        address: 'Alamat',
        category: 'Kategori',
        state: 'Negeri',
        submittedAt: 'Tarikh hantar',
        officer: 'Pegawai bertugas',
      },
      unassigned: 'Belum ditugaskan',
      review: 'Semak permohonan',
      closed: 'Keputusan telah direkodkan. Permohonan ini ditutup.',
      documentSize: '{{size}} KB',
    },
```

```ts
  documents: {
    ssm_certificate: 'Sijil SSM',
    premises_photo: 'Gambar premis',
    floor_plan: 'Pelan lantai',
    fire_certificate: 'Sijil keselamatan kebakaran',
  },
  timeline: {
    submitted: 'Dihantar oleh {{actor}}',
    status_changed: '{{actor}} menukar status daripada {{from}} kepada {{to}}',
    info_requested: '{{actor}} meminta maklumat tambahan',
    comment: '{{actor}} menambah catatan',
    requested: 'Diminta: {{documents}}',
  },
  review: {
    title: 'Semak {{reference}}',
    description: 'Keputusan anda ditambah pada garis masa permohonan.',
    decision: 'Keputusan',
    decisions: {
      approve: 'Lulus',
      reject: 'Tolak',
      request_info: 'Minta maklumat tambahan',
    },
    note: 'Catatan (pilihan)',
    noteRequired: 'Catatan kepada pemohon',
    reason: 'Sebab penolakan',
    requestedInfo: 'Dokumen diperlukan',
    submit: 'Hantar keputusan',
    submitting: 'Menghantar…',
    cancel: 'Batal',
    conflictTitle: 'Pegawai lain telah mengemas kini permohonan ini',
    conflictBody: 'Versi terkini sedang dimuatkan. Semak semula, kemudian hantar keputusan anda.',
    reload: 'Muat semula versi terkini',
    failedTitle: 'Keputusan anda tidak dapat dihantar',
    errorToast: 'Keputusan anda tidak disimpan',
    success: {
      approve: 'Permohonan diluluskan',
      reject: 'Permohonan ditolak',
      request_info: 'Maklumat tambahan diminta',
    },
    successBody: '{{reference}} kini {{status}}.',
    errors: {
      reason_too_short: 'Nyatakan sebab sekurang-kurangnya 10 aksara.',
      note_too_short: 'Tulis catatan sekurang-kurangnya 5 aksara.',
      requested_info_required: 'Pilih sekurang-kurangnya satu dokumen.',
      too_long: 'Hadkan kepada 500 aksara.',
      missing_fire_certificate:
        'Jenis premis ini memerlukan sijil keselamatan kebakaran sebelum boleh diluluskan.',
      not_reviewable: 'Permohonan ini sudah mempunyai keputusan.',
      unknown: 'Semak medan ini dan cuba lagi.',
    },
  },
```

Add `conflictNext: 'Paksa konflik pada semakan seterusnya',` to `devPanel`.

- [ ] **Step 4: Implement the format helper, the toast host and the Dev Panel changes**

`src/shared/lib/format.ts`: add

```ts
export function formatDateTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'ms' ? 'ms-MY' : 'en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur',
  }).format(new Date(iso));
}
```

`src/app/AppLayout.tsx`: `import { AutoToast } from '@govtechmy/myds-react/toast';`, then render `<AutoToast />` once, after `<DevPanel />`.

`src/app/dev-panel/DevPanel.tsx`:
- Add a `containerRef = useRef<HTMLDivElement>(null)` on the outer `div`.
- In the Escape effect, return early unless the event came from inside the panel:
  ```ts
  if (event.key !== 'Escape') return;
  // Only when focus is in the panel, so Escape in a dialog or dropdown doesn't also close it.
  if (!(event.target instanceof Node) || !containerRef.current?.contains(event.target)) return;
  ```
- Add a checkbox after "Return an empty list":
  ```tsx
  <label className="mb-4 flex items-center gap-2 text-body-sm">
    <input
      type="checkbox"
      checked={controls.conflictNext}
      onChange={(event) => update({ conflictNext: event.target.checked })}
    />
    {t('devPanel.conflictNext')}
  </label>
  ```
  Also change the "Return an empty list" label's `mb-4` to `mb-2` so the spacing stays even.

- [ ] **Step 5: Run all tests**

Run: `npm run test:run`
Expected: PASS, including the existing Escape test, where focus is inside the panel.

- [ ] **Step 6: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/shared src/app
git commit -m "Add detail and review strings, a toast host and a forced-conflict switch"
```

---

### Task 7: Facts, documents and timeline components

**Files:**
- Create: `src/features/applications/components/ApplicationFacts.tsx`, `DocumentList.tsx`, `Timeline.tsx`
- Test: `ApplicationFacts.test.tsx`, `DocumentList.test.tsx`, `Timeline.test.tsx` (same folder)

**Interfaces:**
- `ApplicationFacts({ application: ApplicationDetail })`: two sections, Applicant and Business, each with an `h2` and a MYDS `SummaryList`.
- `DocumentList({ documents })`: a `ul` of translated document names with sizes.
- `Timeline({ events })`: an `ol`, one `li` per event. It switches on `event.kind` with `assertNever`, and each entry has a `<time dateTime>`.

- [ ] **Step 1: Write the failing tests**

`ApplicationFacts.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { makeApplicationDetail } from '../fixtures';
import { ApplicationFacts } from './ApplicationFacts';

describe('ApplicationFacts', () => {
  it('lists applicant and business facts as labelled rows', () => {
    render(<ApplicationFacts application={makeApplicationDetail({ assignedOfficerName: null })} />);

    const applicant = screen.getByRole('region', { name: 'Applicant' });
    expect(within(applicant).getByRole('rowheader', { name: 'IC number' })).toBeInTheDocument();
    expect(within(applicant).getByText('850412-10-5523')).toBeInTheDocument();

    const business = screen.getByRole('region', { name: 'Business' });
    expect(within(business).getByText('Retail')).toBeInTheDocument();
    expect(within(business).getByText('Unassigned')).toBeInTheDocument();
  });
});
```

`DocumentList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { makeApplicationDetail } from '../fixtures';
import { DocumentList } from './DocumentList';

it('lists each document with its translated name and size', () => {
  render(<DocumentList documents={makeApplicationDetail().documents} />);
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('SSM certificate');
  expect(items[0]).toHaveTextContent('320 KB');
});
```

`Timeline.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import type { TimelineEvent } from '../types';
import { Timeline } from './Timeline';

const at = '2026-09-20T09:00:00.000Z';
const events: TimelineEvent[] = [
  { id: 'e1', kind: 'submitted', at, actor: 'Tan Wei Jie' },
  { id: 'e2', kind: 'status_changed', at, actor: 'En. Kumar', from: 'submitted', to: 'under_review', note: null },
  { id: 'e3', kind: 'info_requested', at, actor: 'En. Kumar', requestedInfo: ['floor_plan', 'fire_certificate'], note: 'Sila hantar dokumen.' },
  { id: 'e4', kind: 'comment', at, actor: 'Pn. Hafizah', note: 'Lawatan tapak selesai.' },
];

describe('Timeline', () => {
  it('describes every kind of event in order', () => {
    render(<Timeline events={events} />);
    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Submitted by Tan Wei Jie');
    expect(items[1]).toHaveTextContent('En. Kumar changed the status from Submitted to Under review');
    expect(items[2]).toHaveTextContent('Requested: Floor plan, Fire safety certificate');
    expect(items[2]).toHaveTextContent('Sila hantar dokumen.');
    expect(items[3]).toHaveTextContent('Pn. Hafizah added a note');
  });

  it('marks up each timestamp as a machine-readable time', () => {
    const { container } = render(<Timeline events={events.slice(0, 1)} />);
    expect(container.querySelector('time')).toHaveAttribute('datetime', at);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/applications/components`
Expected: FAIL, missing modules.

- [ ] **Step 3: Implement**

`ApplicationFacts.tsx`:

```tsx
import {
  SummaryList,
  SummaryListBody,
  SummaryListDetail,
  SummaryListRow,
  SummaryListTerm,
} from '@govtechmy/myds-react/summary-list';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/lib/format';
import type { ApplicationDetail } from '../types';

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <SummaryListRow>
      <SummaryListTerm>{term}</SummaryListTerm>
      <SummaryListDetail>{children}</SummaryListDetail>
    </SummaryListRow>
  );
}

function FactsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-2 font-heading text-body-lg font-semibold">
        {title}
      </h2>
      <SummaryList>
        <SummaryListBody>{children}</SummaryListBody>
      </SummaryList>
    </section>
  );
}

export function ApplicationFacts({ application }: { application: ApplicationDetail }) {
  const { t, i18n } = useTranslation();
  const field = (name: keyof typeof fieldKeys) => t(fieldKeys[name]);

  return (
    <>
      <FactsSection id="applicant-heading" title={t('applications.detail.sections.applicant')}>
        <Fact term={field('name')}>{application.applicantName}</Fact>
        <Fact term={field('idNumber')}>{application.applicantIdNumber}</Fact>
        <Fact term={field('email')}>{application.applicantEmail}</Fact>
        <Fact term={field('phone')}>{application.applicantPhone}</Fact>
      </FactsSection>
      <FactsSection id="business-heading" title={t('applications.detail.sections.business')}>
        <Fact term={field('businessName')}>{application.businessName}</Fact>
        <Fact term={field('address')}>{application.businessAddress}</Fact>
        <Fact term={field('category')}>{t(`category.${application.premisesCategory}`)}</Fact>
        <Fact term={field('state')}>{application.state}</Fact>
        <Fact term={field('submittedAt')}>{formatDate(application.submittedAt, i18n.language)}</Fact>
        <Fact term={field('officer')}>
          {application.assignedOfficerName ?? t('applications.detail.unassigned')}
        </Fact>
      </FactsSection>
    </>
  );
}

const fieldKeys = {
  name: 'applications.detail.fields.name',
  idNumber: 'applications.detail.fields.idNumber',
  email: 'applications.detail.fields.email',
  phone: 'applications.detail.fields.phone',
  businessName: 'applications.detail.fields.businessName',
  address: 'applications.detail.fields.address',
  category: 'applications.detail.fields.category',
  state: 'applications.detail.fields.state',
  submittedAt: 'applications.detail.fields.submittedAt',
  officer: 'applications.detail.fields.officer',
} as const;
```

If the typed `t()` rejects `fieldKeys[name]`, replace the `field()` helper with direct `t('applications.detail.fields.name')` calls in each `Fact`.

`DocumentList.tsx`:

```tsx
import { DocumentIcon } from '@govtechmy/myds-react/icon';
import { useTranslation } from 'react-i18next';
import type { ApplicationDocument } from '../types';

export function DocumentList({ documents }: { documents: readonly ApplicationDocument[] }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y divide-otl-divider rounded-lg border border-otl-divider">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-body-sm">
          <span className="flex items-center gap-2">
            <DocumentIcon aria-hidden="true" className="size-4 text-txt-black-500" />
            {t(`documents.${doc.kind}`)}
          </span>
          <span className="text-txt-black-500">
            {t('applications.detail.documentSize', { size: doc.sizeKb })}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

`Timeline.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { assertNever } from '@/shared/lib/assertNever';
import { formatDateTime } from '@/shared/lib/format';
import type { TimelineEvent } from '../types';

export function Timeline({ events }: { events: readonly TimelineEvent[] }) {
  const { i18n } = useTranslation();
  return (
    <ol className="flex flex-col gap-5 border-l border-otl-divider pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-bg-primary-600"
          />
          <TimelineEntry event={event} />
          <time dateTime={event.at} className="text-body-xs text-txt-black-500">
            {formatDateTime(event.at, i18n.language)}
          </time>
        </li>
      ))}
    </ol>
  );
}

/** One case per event kind; adding a kind to the schema without rendering it is a compile error. */
function TimelineEntry({ event }: { event: TimelineEvent }) {
  const { t } = useTranslation();
  const note = (text: string | null) =>
    text ? <p className="mt-1 text-body-sm text-txt-black-700">{text}</p> : null;

  switch (event.kind) {
    case 'submitted':
      return <p className="text-body-sm font-medium">{t('timeline.submitted', { actor: event.actor })}</p>;
    case 'status_changed':
      return (
        <>
          <p className="text-body-sm font-medium">
            {t('timeline.status_changed', {
              actor: event.actor,
              from: t(`status.${event.from}`),
              to: t(`status.${event.to}`),
            })}
          </p>
          {note(event.note)}
        </>
      );
    case 'info_requested':
      return (
        <>
          <p className="text-body-sm font-medium">{t('timeline.info_requested', { actor: event.actor })}</p>
          <p className="mt-1 text-body-sm">
            {t('timeline.requested', {
              documents: event.requestedInfo.map((kind) => t(`documents.${kind}`)).join(', '),
            })}
          </p>
          {note(event.note)}
        </>
      );
    case 'comment':
      return (
        <>
          <p className="text-body-sm font-medium">{t('timeline.comment', { actor: event.actor })}</p>
          {note(event.note)}
        </>
      );
    default:
      return assertNever(event);
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/applications/components`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src/features/applications/components
git commit -m "Add application facts, document list and an exhaustive timeline"
```

---

### Task 8: The detail route and nested routing

**Files:**
- Create: `src/features/applications/components/DetailStates.tsx`, `src/features/applications/routes/DetailRoute.tsx`
- Modify: `src/features/applications/components/ListStates.tsx`, `src/features/applications/routes/ListRoute.tsx`, `src/app/router.ts`, `src/main.tsx`, `src/app/router.test.tsx`
- Test: `src/features/applications/routes/DetailRoute.test.tsx`, `src/app/router.test.tsx`

**Interfaces:**
- `LoadError({ title, error, onRetry })`: its `title` is now a prop. The list passes `t('errors.title')`.
- `createRoutes(): RouteObject[]` replaces `routes`. `main.tsx` and every test call it.
- The route tree is `applications`, containing:
  - `{ index }`: the list
  - `:id`: the detail, which contains the `review` child (Task 10)
- `DetailRoute` renders:
  - the breadcrumb (with a translated `aria-label`)
  - the `h1` reference number and a `StatusBadge`
  - a "Review application" link to `review`, only when `isReviewable`; otherwise the "closed" text
  - the facts, documents and timeline
  - an `<Outlet />` for the review dialog
- For a 404 it renders `DetailNotFound`. For other errors it renders `LoadError`.

- [ ] **Step 1: Write the failing tests**

`src/features/applications/routes/DetailRoute.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { isReviewable } from '@/features/applications/rules';
import { seedApplicationDetails } from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { renderRoutes } from '@/test/render';
import { Component as DetailRoute } from './DetailRoute';

const details = seedApplicationDetails();
const open = details.find((d) => isReviewable(d.status))!;
const closed = details.find((d) => d.status === 'approved')!;

const renderDetail = (id: string) =>
  renderRoutes([{ path: '/applications/:id', Component: DetailRoute }], {
    initialEntries: [`/applications/${id}`],
  });

describe('/applications/:id', () => {
  it('shows the application with its facts, documents and timeline', async () => {
    renderDetail(open.id);

    expect(await screen.findByRole('heading', { level: 1, name: open.referenceNo })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Applicant' })).toHaveTextContent(open.applicantIdNumber);
    expect(screen.getByRole('region', { name: 'Documents' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Timeline' })).getAllByRole('listitem')).toHaveLength(
      open.timeline.length,
    );
  });

  it('links back to the list from a translated breadcrumb', async () => {
    renderDetail(open.id);
    const crumbs = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Applications' })).toHaveAttribute('href', '/applications');
  });

  it('offers review only while the application is open', async () => {
    const { unmount } = renderDetail(open.id);
    expect(await screen.findByRole('link', { name: 'Review application' })).toHaveAttribute(
      'href',
      `/applications/${open.id}/review`,
    );
    unmount();

    renderDetail(closed.id);
    expect(await screen.findByText('A decision has been recorded. This application is closed.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review application' })).not.toBeInTheDocument();
  });

  it('explains an unknown reference', async () => {
    renderDetail('app-999');
    expect(await screen.findByRole('heading', { name: 'Application not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to applications' })).toHaveAttribute('href', '/applications');
  });

  it('shows a retryable error when loading fails', async () => {
    setDevControls({ failure: 'server' });
    const { user } = renderDetail(open.id);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this application");
    setDevControls({ failure: 'none' });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: open.referenceNo })).toBeInTheDocument();
  });
});
```

In `src/app/router.test.tsx`, replace `routes` with `createRoutes()` in every `renderRoutes(...)` call. Update the import to `import { createRoutes } from './router';`, and add:

```tsx
it('opens an application from the list', async () => {
  const { user, router } = renderRoutes(createRoutes(), { initialEntries: ['/applications'] });
  const [firstLink] = await screen.findAllByRole('link', { name: /^LPP-2026-/ });

  await user.click(firstLink!);

  expect(await screen.findByRole('heading', { level: 1, name: firstLink!.textContent ?? '' })).toBeInTheDocument();
  expect(router.state.location.pathname).toMatch(/^\/applications\/app-\d{3}$/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/applications/routes/DetailRoute.test.tsx src/app/router.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`ListStates.tsx`: give `LoadError` a required `title: string` prop, and render it instead of `t('errors.title')`. In `ListRoute.tsx`, pass `title={t('errors.title')}`.

`src/features/applications/components/DetailStates.tsx`:

```tsx
import { Spinner } from '@govtechmy/myds-react/spinner';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export function DetailLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3">
      <Spinner size="medium" />
      <span className="text-body-sm text-txt-black-500">{t('applications.detail.loading')}</span>
    </div>
  );
}

export function DetailNotFound() {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-heading text-heading-xs font-semibold">{t('applications.detail.notFoundTitle')}</h1>
      <p className="text-txt-black-700">{t('applications.detail.notFoundBody')}</p>
      <Link to="/applications" className="font-medium text-txt-primary underline">
        {t('errors.route.home')}
      </Link>
    </section>
  );
}
```

`src/features/applications/routes/DetailRoute.tsx`:

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@govtechmy/myds-react/breadcrumb';
import { Button } from '@govtechmy/myds-react/button';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useParams } from 'react-router';
import { ApiError } from '@/shared/api/ApiError';
import { useApplication } from '../api/queries';
import { ApplicationFacts } from '../components/ApplicationFacts';
import { DetailLoading, DetailNotFound } from '../components/DetailStates';
import { DocumentList } from '../components/DocumentList';
import { LoadError } from '../components/ListStates';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { isReviewable } from '../rules';

export function Component() {
  const { t } = useTranslation();
  const { id = '' } = useParams<'id'>();
  const { data, error, isPending, isError, refetch } = useApplication(id);

  // Only replace the page when there is nothing to show. A failed background refetch
  // (e.g. after a failed review) keeps the last good data and the open dialog on screen.
  if (data === undefined) {
    if (isPending) return <DetailLoading />;
    if (isError && error instanceof ApiError && error.status === 404) return <DetailNotFound />;
    return (
      <LoadError
        title={t('applications.detail.loadErrorTitle')}
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <article aria-labelledby="application-heading" className="flex flex-col gap-6">
      <Breadcrumb aria-label={t('applications.detail.breadcrumbLabel')}>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/applications">{t('applications.detail.breadcrumb')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{data.referenceNo}</BreadcrumbPage>
        </BreadcrumbItem>
      </Breadcrumb>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 id="application-heading" className="font-heading text-heading-xs font-semibold">
            {data.referenceNo}
          </h1>
          <StatusBadge status={data.status} />
        </div>
        {isReviewable(data.status) ? (
          <Button asChild variant="primary-fill" size="medium">
            <Link to="review">{t('applications.detail.review')}</Link>
          </Button>
        ) : (
          <p className="text-body-sm text-txt-black-500">{t('applications.detail.closed')}</p>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <ApplicationFacts application={data} />
          <section aria-labelledby="documents-heading">
            <h2 id="documents-heading" className="mb-2 font-heading text-body-lg font-semibold">
              {t('applications.detail.sections.documents')}
            </h2>
            <DocumentList documents={data.documents} />
          </section>
        </div>
        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="mb-3 font-heading text-body-lg font-semibold">
            {t('applications.detail.sections.timeline')}
          </h2>
          <Timeline events={data.timeline} />
        </section>
      </div>

      {/* The review dialog renders here, so it sits over this page and has its own URL. */}
      <Outlet />
    </article>
  );
}
```

If MYDS `Breadcrumb` does not let the `aria-label` override win (the test for the translated name fails), read its dist source. Then either wrap it the way the pagination was wrapped in Plan 1, or record it as a known limitation in a code comment and change the test to query `name: 'breadcrumb'`. List whichever you did under Concerns.

`src/app/router.ts`: replace `export const routes = [...]` with:

```ts
/**
 * A factory, not a shared array: React Router mutates lazy route objects once they
 * resolve, so every router instance (and every test) needs its own copy.
 */
export function createRoutes(): RouteObject[] {
  return [
    {
      path: '/',
      Component: AppLayout,
      ErrorBoundary: RouteError,
      HydrateFallback: PageSpinner,
      children: [
        { index: true, Component: PageSpinner, loader: () => redirect('/applications') },
        {
          path: 'applications',
          ErrorBoundary: RouteError,
          children: [
            {
              index: true,
              lazy: {
                Component: async () =>
                  (await import('@/features/applications/routes/ListRoute')).Component,
              },
            },
            {
              path: ':id',
              lazy: {
                Component: async () =>
                  (await import('@/features/applications/routes/DetailRoute')).Component,
              },
            },
          ],
        },
        { path: '*', Component: NotFound },
      ],
    },
  ];
}
```

Keep the two existing comments (the index `Component` and the `ErrorBoundary`) on the matching lines. In `src/main.tsx`, use `createBrowserRouter(createRoutes())`.

- [ ] **Step 4: Run all tests**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add src
git commit -m "Add the application detail page and nested application routes"
```

---

### Task 9: The review form

**Files:**
- Create: `src/features/applications/components/ReviewForm.tsx`
- Modify: `package.json` (dependencies)
- Test: `src/features/applications/components/ReviewForm.test.tsx`

**Interfaces:**
- `ReviewForm({ isSubmitting, onSubmit, onCancel })`.
  - `onSubmit(review: ReviewDecision): Promise<void>`.
  - If `onSubmit` rejects with an `ApiError` of kind `validation`, the form maps each `fieldErrors` entry onto the matching field (`decision`, `reason`, `note` or `requestedInfo`). Anything else goes to `root.server`. Codes are translated with `reviewErrorKey`.
  - Other rejections are left to the caller (the route shows the banner or toast).
- **Fields:**
  - the decision radiogroup (a fieldset and legend)
  - `note` (an optional note when approving; a required note when requesting information)
  - `reason` (only when rejecting)
  - `requestedInfo` checkboxes (only when requesting information)
- **Errors:** each field error is linked to its field with `aria-invalid` and `aria-describedby`.

- [ ] **Step 1: Install the form libraries**

Run: `npm i react-hook-form@7.88.0 @hookform/resolvers@5.9.1`
Expected: installs with no ERESOLVE error.

- [ ] **Step 2: Write the failing tests**

`src/features/applications/components/ReviewForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/shared/api/ApiError';
import { ReviewForm } from './ReviewForm';

function renderForm(onSubmit = vi.fn(() => Promise.resolve())) {
  const user = userEvent.setup();
  render(<ReviewForm isSubmitting={false} onSubmit={onSubmit} onCancel={vi.fn()} />);
  return { user, onSubmit };
}

describe('ReviewForm', () => {
  it('approves by default with an optional note', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ decision: 'approve', note: '' }));
  });

  it('asks for a reason when rejecting and links the error to the field', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Reject' }));
    await user.type(screen.getByRole('textbox', { name: 'Reason for rejection' }), 'Too short');
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    const reason = screen.getByRole('textbox', { name: 'Reason for rejection' });
    expect(await screen.findByText('Give a reason of at least 10 characters.')).toBeInTheDocument();
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveAccessibleDescription('Give a reason of at least 10 characters.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks which documents are needed when requesting information', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Request more information' }));
    await user.type(screen.getByRole('textbox', { name: 'Note to the applicant' }), 'Sila hantar pelan lantai.');
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));
    expect(await screen.findByText('Choose at least one document.')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Floor plan' }));
    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        decision: 'request_info',
        requestedInfo: ['floor_plan'],
        note: 'Sila hantar pelan lantai.',
      }),
    );
  });

  it('shows a rule the server enforced (422) on the decision field', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(
        new ApiError({
          kind: 'validation',
          status: 422,
          message: 'Review rejected',
          fieldErrors: { decision: ['missing_fire_certificate'] },
        }),
      ),
    );
    const { user } = renderForm(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(
      await screen.findByText('This premises type needs a fire safety certificate before it can be approved.'),
    ).toBeInTheDocument();
  });

  it('falls back to a general message for server codes or fields it does not know', async () => {
    const onSubmit = vi.fn(() =>
      Promise.reject(
        new ApiError({ kind: 'validation', status: 422, message: 'x', fieldErrors: { version: ['stale'] } }),
      ),
    );
    const { user } = renderForm(onSubmit);

    await user.click(screen.getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByText('Check this field and try again.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/features/applications/components/ReviewForm.test.tsx`
Expected: FAIL, missing module.

- [ ] **Step 4: Implement**

`src/features/applications/components/ReviewForm.tsx`:

```tsx
import { Button } from '@govtechmy/myds-react/button';
import { Checkbox } from '@govtechmy/myds-react/checkbox';
import { Label } from '@govtechmy/myds-react/label';
import { Radio, RadioButton, RadioItem, RadioLabel } from '@govtechmy/myds-react/radio';
import { TextArea } from '@govtechmy/myds-react/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch, type UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/shared/api/ApiError';
import { reviewErrorKey } from '../rules';
import { DOCUMENT_KINDS, ReviewDecisionSchema } from '../schemas';
import type { ReviewDecision, ReviewDecisionInput } from '../types';

const FORM_FIELDS = ['decision', 'reason', 'note', 'requestedInfo'] as const;
type FormField = (typeof FORM_FIELDS)[number];
const isFormField = (key: string): key is FormField => (FORM_FIELDS as readonly string[]).includes(key);

type ReviewFormProps = {
  isSubmitting: boolean;
  onSubmit: (review: ReviewDecision) => Promise<void>;
  onCancel: () => void;
};

export function ReviewForm({ isSubmitting, onSubmit, onCancel }: ReviewFormProps) {
  const { t } = useTranslation();
  const { control, register, handleSubmit, setError, getFieldState, formState } = useForm<
    ReviewDecisionInput,
    unknown,
    ReviewDecision
  >({
    resolver: zodResolver(ReviewDecisionSchema),
    defaultValues: { decision: 'approve', note: '' },
  });
  const decision = useWatch({ control, name: 'decision' });

  // getFieldState works for every branch of the union without casting `errors`.
  const errorCode = (name: FormField) => getFieldState(name, formState).error?.message;
  const serverError = formState.errors.root?.server?.message;

  async function submit(review: ReviewDecision) {
    try {
      await onSubmit(review);
    } catch (error) {
      if (!(error instanceof ApiError) || error.kind !== 'validation') return;
      for (const [key, codes] of Object.entries(error.fieldErrors)) {
        const code = codes[0] ?? 'unknown';
        if (isFormField(key)) setError(key, { type: 'server', message: code });
        else setError('root.server', { type: 'server', message: code });
      }
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend id="decision-legend" className="mb-1 text-body-sm font-medium">
          {t('review.decision')}
        </legend>
        <Controller
          control={control}
          name="decision"
          render={({ field }) => (
            <Radio
              value={field.value}
              onValueChange={field.onChange}
              name={field.name}
              aria-labelledby="decision-legend"
              aria-describedby={errorCode('decision') ? 'decision-error' : undefined}
            >
              {(['approve', 'reject', 'request_info'] as const).map((value) => (
                <RadioItem key={value}>
                  <RadioButton id={`decision-${value}`} value={value} />
                  <RadioLabel htmlFor={`decision-${value}`}>{t(`review.decisions.${value}`)}</RadioLabel>
                </RadioItem>
              ))}
            </Radio>
          )}
        />
        <FieldError id="decision-error" code={errorCode('decision')} />
      </fieldset>

      {decision === 'reject' && (
        <TextField
          id="review-reason"
          label={t('review.reason')}
          code={errorCode('reason')}
          registration={register('reason')}
        />
      )}

      {decision === 'request_info' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-body-sm font-medium">{t('review.requestedInfo')}</legend>
          <Controller
            control={control}
            name="requestedInfo"
            // Its own default: this field exists only in one branch of the union.
            defaultValue={[]}
            render={({ field }) => {
              const selected = field.value ?? [];
              return (
                <>
                  {DOCUMENT_KINDS.map((kind) => (
                    <div key={kind} className="flex items-center gap-2">
                      <Checkbox
                        id={`requested-${kind}`}
                        checked={selected.includes(kind)}
                        onCheckedChange={(next) =>
                          field.onChange(next === true ? [...selected, kind] : selected.filter((k) => k !== kind))
                        }
                      />
                      <Label htmlFor={`requested-${kind}`}>{t(`documents.${kind}`)}</Label>
                    </div>
                  ))}
                </>
              );
            }}
          />
          <FieldError id="requested-info-error" code={errorCode('requestedInfo')} />
        </fieldset>
      )}

      {decision !== 'reject' && (
        <TextField
          id="review-note"
          label={decision === 'request_info' ? t('review.noteRequired') : t('review.note')}
          code={errorCode('note')}
          registration={register('note')}
        />
      )}

      {serverError && <FieldError id="review-server-error" code={serverError} />}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="default-outline" onClick={onCancel}>
          {t('review.cancel')}
        </Button>
        <Button type="submit" variant="primary-fill" disabled={isSubmitting}>
          {isSubmitting ? t('review.submitting') : t('review.submit')}
        </Button>
      </div>
    </form>
  );
}

function TextField({
  id,
  label,
  code,
  registration,
}: {
  id: string;
  label: string;
  code: string | undefined;
  registration: UseFormRegisterReturn;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <TextArea
        id={id}
        rows={3}
        aria-invalid={code ? true : undefined}
        aria-describedby={code ? errorId : undefined}
        {...registration}
      />
      <FieldError id={errorId} code={code} />
    </div>
  );
}

function FieldError({ id, code }: { id: string; code: string | undefined }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <p id={id} className="text-body-sm text-txt-danger">
      {t(reviewErrorKey(code))}
    </p>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/features/applications/components/ReviewForm.test.tsx`
Expected: PASS with no React warnings.

- [ ] **Step 6: Commit**

```bash
npm run format && npm run typecheck && npm run lint
git add package.json package-lock.json src/features/applications/components
git commit -m "Add the review form with per-decision fields and translated server errors"
```

---

### Task 10: The review dialog route

**Files:**
- Create: `src/features/applications/routes/ReviewRoute.tsx`
- Modify: `src/app/router.ts` (add the `review` child under `:id`)
- Test: `src/features/applications/routes/ReviewRoute.test.tsx`, `src/app/router.test.tsx` (append)

**Interfaces:**
- `/applications/:id/review` renders a MYDS `Dialog` over the detail page, named "Review {{reference}}". Closing it (Cancel, Escape or the overlay) runs `navigate('..')`.
- **Deep links:** a review URL for a closed application redirects to the detail page, using `replace`.
- **On submit:** `mutateAsync({ version, review })`.
  - **Success:** a success toast, then the dialog closes.
  - **409:** the conflict banner is shown and the form keeps its values. Invalidation reloads the latest version, and a "Reload latest" button refetches on demand.
  - **Other non-validation errors:** an error toast plus a danger callout inside the dialog.
  - **Validation errors:** left to the form.

- [ ] **Step 1: Write the failing tests**

`src/features/applications/routes/ReviewRoute.test.tsx`:

```tsx
import { AutoToast } from '@govtechmy/myds-react/toast';
import { screen, waitFor, within } from '@testing-library/react';
import { Outlet } from 'react-router';
import { isReviewable } from '@/features/applications/rules';
import { requiresFireCertificate, seedApplicationDetails } from '@/mocks/db/applications';
import { setDevControls } from '@/mocks/devControls';
import { renderRoutes } from '@/test/render';
import { Component as DetailRoute } from './DetailRoute';
import { Component as ReviewRoute } from './ReviewRoute';

const details = seedApplicationDetails();
const hasFire = (d: (typeof details)[number]) => d.documents.some((doc) => doc.kind === 'fire_certificate');
const approvable = details.find(
  (d) => isReviewable(d.status) && (!requiresFireCertificate(d.premisesCategory) || hasFire(d)),
)!;
const blocked = details.find(
  (d) => isReviewable(d.status) && requiresFireCertificate(d.premisesCategory) && !hasFire(d),
)!;
const closed = details.find((d) => d.status === 'approved')!;

function Shell() {
  return (
    <>
      <Outlet />
      <AutoToast />
    </>
  );
}

const renderReview = (id: string) =>
  renderRoutes(
    [
      {
        Component: Shell,
        children: [
          {
            path: '/applications/:id',
            Component: DetailRoute,
            children: [{ path: 'review', Component: ReviewRoute }],
          },
        ],
      },
    ],
    { initialEntries: [`/applications/${id}/review`] },
  );

const heading = (d: { referenceNo: string }) => screen.findByRole('heading', { level: 1, name: d.referenceNo });

describe('/applications/:id/review', () => {
  it('opens as a named dialog with focus inside, and Escape returns to the detail page', async () => {
    const { user, router } = renderReview(approvable.id);

    const dialog = await screen.findByRole('dialog', { name: `Review ${approvable.referenceNo}` });
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe(`/applications/${approvable.id}`);
  });

  it('records an approval, confirms it and closes', async () => {
    const { user, router } = renderReview(approvable.id);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByText('Application approved')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe(`/applications/${approvable.id}`));
    expect(await screen.findByText('A decision has been recorded. This application is closed.')).toBeInTheDocument();
  });

  it('updates the status optimistically while the request is in flight', async () => {
    const { user } = renderReview(approvable.id);
    await heading(approvable);
    const dialog = await screen.findByRole('dialog');
    setDevControls({ latencyMs: 800 });

    await user.click(within(dialog).getByRole('radio', { name: 'Reject' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason for rejection' }), 'Premis di zon kediaman');
    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(within(dialog).getByRole('button', { name: 'Submitting…' })).toBeDisabled();
    const header = (await heading(approvable)).parentElement!;
    expect(within(header).getByText('Rejected')).toBeInTheDocument();
  });

  it('rolls back and explains when the server fails', async () => {
    const { user } = renderReview(approvable.id);
    const dialog = await screen.findByRole('dialog');
    setDevControls({ failure: 'server' });

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(await screen.findByText('Your decision was not saved')).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent("Couldn't submit your decision");
    const header = (await heading(approvable)).parentElement!;
    expect(within(header).queryByText('Approved')).not.toBeInTheDocument();
  });

  it('shows the fire-certificate rule the server enforced', async () => {
    const { user } = renderReview(blocked.id);
    const dialog = await screen.findByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(
      await within(dialog).findByText(
        'This premises type needs a fire safety certificate before it can be approved.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps what the officer typed after a conflict, and lets them submit again', async () => {
    const { user } = renderReview(approvable.id);
    const dialog = await screen.findByRole('dialog');
    setDevControls({ conflictNext: true });

    await user.click(within(dialog).getByRole('radio', { name: 'Reject' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason for rejection' }), 'Premis di zon kediaman');
    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));

    expect(await within(dialog).findByText('Another officer updated this application')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Reason for rejection' })).toHaveValue('Premis di zon kediaman');

    await user.click(within(dialog).getByRole('button', { name: 'Submit decision' }));
    expect(await screen.findByText('Application rejected')).toBeInTheDocument();
  });

  it('redirects a review link for a closed application to its detail page', async () => {
    const { router } = renderReview(closed.id);
    await heading(closed);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/applications/${closed.id}`));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

Append to `src/app/router.test.tsx` (add `import { isReviewable } from '@/features/applications/rules';` and `import { seedApplicationDetails } from '@/mocks/db/applications';` to its imports):

```tsx
it('opens the review dialog from the detail page', async () => {
  const reviewable = seedApplicationDetails().find((d) => isReviewable(d.status))!;
  const { user, router } = renderRoutes(createRoutes(), {
    initialEntries: [`/applications/${reviewable.id}`],
  });

  await user.click(await screen.findByRole('link', { name: 'Review application' }));

  expect(await screen.findByRole('dialog', { name: `Review ${reviewable.referenceNo}` })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe(`/applications/${reviewable.id}/review`);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/applications/routes/ReviewRoute.test.tsx src/app/router.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/features/applications/routes/ReviewRoute.tsx`:

```tsx
import { Button } from '@govtechmy/myds-react/button';
import { Callout, CalloutAction, CalloutContent, CalloutTitle } from '@govtechmy/myds-react/callout';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@govtechmy/myds-react/dialog';
import { useToast } from '@govtechmy/myds-react/hooks';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/shared/api/ApiError';
import { apiErrorMessageKey } from '@/shared/api/errorMessage';
import { useReviewApplication } from '../api/mutations';
import { useApplication } from '../api/queries';
import { ReviewForm } from '../components/ReviewForm';
import { isReviewable } from '../rules';
import type { ReviewDecision } from '../types';

/** A route that renders as a dialog: it has a URL, Back closes it, and focus is trapped inside. */
export function Component() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id = '' } = useParams<'id'>();
  const { data, refetch } = useApplication(id);
  const review = useReviewApplication(id);

  const close = () => {
    void navigate('..');
  };

  // The detail page (the parent route) owns loading and not-found states.
  if (!data) return null;
  if (!isReviewable(data.status) && review.isIdle) return <Navigate to=".." replace />;

  async function submit(decision: ReviewDecision) {
    if (!data) return;
    try {
      const saved = await review.mutateAsync({ version: data.version, review: decision });
      toast({
        variant: 'success',
        title: t(`review.success.${decision.decision}`),
        description: t('review.successBody', {
          reference: saved.referenceNo,
          status: t(`status.${saved.status}`),
        }),
      });
      close();
    } catch (error) {
      if (!(error instanceof ApiError && (error.kind === 'validation' || error.kind === 'conflict'))) {
        toast({ variant: 'error', title: t('review.errorToast') });
      }
      throw error;
    }
  }

  const error = review.error;
  const isConflict = error instanceof ApiError && error.kind === 'conflict';
  const isOtherFailure =
    error !== null && !isConflict && !(error instanceof ApiError && error.kind === 'validation');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogBody hideClose>
        <DialogHeader>
          <DialogTitle>{t('review.title', { reference: data.referenceNo })}</DialogTitle>
          <DialogDescription>{t('review.description')}</DialogDescription>
        </DialogHeader>
        <DialogContent className="flex flex-col gap-4">
          {isConflict && (
            <Callout variant="warning">
              <CalloutTitle>{t('review.conflictTitle')}</CalloutTitle>
              <CalloutContent>{t('review.conflictBody')}</CalloutContent>
              <CalloutAction>
                <Button variant="default-outline" size="small" onClick={() => void refetch()}>
                  {t('review.reload')}
                </Button>
              </CalloutAction>
            </Callout>
          )}
          {isOtherFailure && (
            <Callout variant="danger">
              <CalloutTitle>{t('review.failedTitle')}</CalloutTitle>
              <CalloutContent>{t(apiErrorMessageKey(error))}</CalloutContent>
            </Callout>
          )}
          <ReviewForm isSubmitting={review.isPending} onSubmit={submit} onCancel={close} />
        </DialogContent>
      </DialogBody>
    </Dialog>
  );
}
```

Two notes on the conflict case:
- `onSettled` invalidation refetches the detail after the 409, so the form's next submit sends the latest `version`.
- The conflict callout is `role="alert"`, like every MYDS Callout. If two alerts showing at once confuses a test, query inside `dialog` as the tests already do.

In `src/app/router.ts`, give the `:id` route a child:

```ts
              children: [
                {
                  path: 'review',
                  lazy: {
                    Component: async () =>
                      (await import('@/features/applications/routes/ReviewRoute')).Component,
                  },
                },
              ],
```

- [ ] **Step 4: Run all tests**

Run: `npm run test:run`
Expected: PASS, with no React, Radix or React Router warnings in the output.

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: exit 0, coverage thresholds met, and no chunk-size warning. If the new routes add weight to the entry chunk, check that `DetailRoute`, `ReviewRoute` and react-hook-form end up in lazy chunks, not in the entry chunk.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src
git commit -m "Add the review dialog route with optimistic updates, conflicts and server errors"
```

---

### Task 11: Browser check, pull request and deploy

This task is done by the controller, not a subagent. **Pushing, merging and deploying need the user's approval.**

- [ ] **Step 1: Check in a real browser** (the dev server on port 5173, using Playwright MCP)

1. From the list, click a reference. The detail page shows the facts, documents, timeline, breadcrumb and the Review button.
2. Click Review. The dialog opens, focus is inside, and Tab stays inside. Escape closes it and the URL returns to the detail page.
3. Reject with a short reason to see the field error. Then fix the reason and submit: the badge flips at once, a toast appears, and the dialog closes.
4. On a food or entertainment application without a fire certificate, choose Approve. The translated 422 message appears on the decision.
5. Dev Panel → Force conflict, then submit. The banner appears and the typed text stays. Submit again and it succeeds.
6. Dev Panel → Server error (500), then submit. The badge rolls back, the error toast appears, and so does the callout.
7. Switch to Malay (`localStorage['semakan.language'] = 'ms'`, then reload). No English is left on the detail page or in the dialog.
8. At 360px width there is no page overflow, and the dialog fits.
9. The console shows no warnings. Then `npm run build && npm run preview` and repeat steps 1–3.

- [ ] **Step 2: Push the branch and open a PR** (ask first)

`git push -u origin plan-2-detail-review && gh pr create --base main ...`

- [ ] **Step 3: After merging, redeploy** (ask first)

`vercel deploy --prod --yes`, then check https://semakan-plum.vercel.app.
