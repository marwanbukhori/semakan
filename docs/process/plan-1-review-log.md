# Plan 1 review log

Review log for Plan 1 (Foundation and Applications List). Published from the build ledger; agent IDs and local paths removed.

Spec: docs/specs/2026-09-23-semakan-design.md
Branch: plan-1-foundation (from main @ e386413)

## Pre-flight scan

| Pair / task | Produces → consumes | Finding |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| T1 ↔ T3 ↔ T5 ↔ T6 (src/test/setup.ts) | T1 base; T3 replaces (MSW); T5 replaces (resets); T6 adds i18n import | Consistent: each version is a superset of the previous |
| T1 ↔ T2 (eslint.config.js) | boundaries config → violation proof | Consistent |
| T3 ↔ T5, T6 (apiClient.get) | get(path, schema, {params, signal}) | T6 passes ApplicationListParams (object type alias) as params: assignable to Record<string, QueryValue>. OK |
| T3 ↔ T5 (handlers/index.ts) | empty array → replaced with applicationHandlers | Consistent |
| T4 ↔ T5, T7, T8, T9 (schemas/types/fixtures) | PAGE_SIZE, PREMISES_CATEGORIES, params schema, DEFAULT_LIST_PARAMS, StatusFilterSchema, makeApplicationSummary | Names and signatures match across tasks |
| T5 ↔ T6, T9, T10 (devControls, db) | setDevControls, getDevControls, LATENCY/FAILURE_OPTIONS, resetApplications, seedApplications | Match |
| T5 ↔ T9 (seed facts) | "Restoran Selera Kampung" exists in seed | NOT GUARANTEED: random pick; ~5% chance absent. See ruling R3 |
| T6 ↔ T7–T10 (renderRoutes/createWrapper) | helpers | Match |
| T6 ↔ T8–T10 (en strings used in tests) | All asserted strings exist in en.ts | Checked each: match ('2000 ms' comes from template, not en.ts) |
| T8 ↔ T9 (ApplicationTable props) | items/isLoading/sort/order/onSortChange/emptyState | Match |
| T9 ↔ T10 (ListRoute Component) | named export `Component` → lazy route | Match |
| T1 self | coverage thresholds set, but coverage skipped in T1 step 12 | Intentional; first enforced at T9 step 7 and CI |
| T2 self | throwaway files created and deleted | OK |
| T3 self | tests 10 vs code | OK |
| T4 self | 6 tests vs schemas | OK |
| T5 self | tests reference LPP-2026-1056 = 1000 + 56 with 57 items | OK |
| T7 self | Probe uses <output> (role status) | OK |
| T8 self | skeleton rows use index keys | Plan-mandated; static list, acceptable (R4) |
| T9 self | pagination next-button name unverified; plan gives an adapt instruction | OK |
| T10 self | Browser check needs Playwright MCP (controller-side tools) | See R5 |
| T11 self | gh repo create / push / vercel deploy are external side effects | See R2 |

## Rulings

- Ruling R1: Work on branch `plan-1-foundation` in the repo directory instead of a separate worktree — the repo is brand new with only docs on main, so a branch gives the same isolation — cost if wrong: none; merge to main at the end.
- Ruling R2: Task 11 steps 2–4 (GitHub repo creation, push, Vercel deploy) are stop points — ask the user before running them — cost if wrong: a short pause.
- Ruling R3: In Task 9, the search test must derive its search term from seeded data (first seeded business name present), not assume "Restoran Selera Kampung" exists; if that name IS present in the seed, keep the plan's literal — the plan's literal is not guaranteed by the seed — cost if wrong: none, the test stays meaningful.
- Ruling R4: Skeleton rows keep index keys (static, never reordered) — cost if wrong: a reviewer nit.
- Ruling R5: Task 10 step 8 (real-browser check) is done by the controller with Playwright MCP after the implementer finishes steps 1–7 and 9 — subagents may not have those tools — cost if wrong: none.

## Progress

Task 1: dispatched (base e386413, model sonnet)
Task 1: minor (deferred): polyfills.ts uses one eslint-disable block over 4 lines instead of per-line disables
Task 1: complete (commits e386413..a674dcd, review clean)
Task 2: dispatched (base a674dcd, model haiku)
Task 2: complete (commits a674dcd..991dc22, review clean)
Task 3: dispatched (base 991dc22, model sonnet)

- Ruling R6: Add `<workspace>` to .prettierignore (and eslint globalIgnores if lint picks it up) in Task 4's commit — prettier formats the git-ignored SDD scratch dir locally, which can make local format:check fail — cost if wrong: one extra ignore line.
 Task 3: minor (deferred): ApiError.fromResponse uses same fallback message for malformed vs message-less bodies
 Task 3: minor (deferred): no test covers abort/signal passthrough in client.ts send()
 Task 3: complete (commits 991dc22..1bff5a6, review clean)
 Task 4: dispatched (base 1bff5a6, model haiku)
Task 4: minor (deferred): schemas.ts uses deprecated z.string().datetime() instead of brief's z.iso.datetime() (silent deviation from brief; verified z.iso.datetime works in zod 4.6.5) — should be fixed before merge, showcase repo
Task 4: complete (commits 1bff5a6..a43a32d, review clean)
Task 5: dispatched (base a43a32d, model sonnet). Ruling R7: implementers use sonnet from here — haiku made an unreported API substitution in Task 4 — cost if wrong: slightly higher token cost.
Ruling R3 resolved: seed contains 'Restoran Selera Kampung' x2 — Task 9 keeps the plan's literal.
Task 5: minor (deferred): unreachable trailing return in weightedStatus (applications.ts)
Task 5: minor (deferred): sort tiebreak reverses with direction; add a comment
Task 5: complete (commits a43a32d..f3b8a8f, review clean)
Task 6: dispatched (base f3b8a8f, model sonnet)
Task 6: warning resolved: typed t() accepts template-literal keys and plural keys (controller tsc probe, clean)
Task 6: warning deferred to Task 7: renderRoutes first exercised there
Task 6: minor (deferred): duplicated localStorage read pattern (providers.tsx / i18n/index.ts)
Task 6: complete (commits f3b8a8f..0dc9d70, review clean)
Task 7: dispatched (base 0dc9d70, model sonnet)
Task 6: warning resolved: renderRoutes worked as-is in Task 7
Task 7: minor (deferred): prefer act(() => { vi.advanceTimersByTime(300); }) over void act(...) in useDebouncedCallback.test.ts
Task 7: complete (commits 0dc9d70..a9920f4, review clean)
Task 8: dispatched (base a9920f4, model sonnet)
Task 8: minor (deferred): SortableHead icon choice coupled to isActive gate; add a comment
Task 8: minor (deferred): no test asserts aria-busy on the table while loading
Task 8: complete (commits a9920f4..14ae95c, review clean)
Task 9: dispatched (base 14ae95c, model sonnet)
Task 9: note: MYDS SelectItem requires an element child (Radix ItemText asChild) — plain strings crash; wrapped in <span>. Evidence for the AI-workflow page.
Task 9: minor (deferred): comment that the render-time state adoption in ApplicationFilters must not move into an effect
Task 9: minor (deferred): no aria-busy on the table region during background refresh
Task 9: complete (commits 14ae95c..22d039d, review clean)
Task 10: dispatched (base 22d039d, model sonnet; step 8 browser check reserved for controller per R5)
Dev server: running on http://localhost:5173 (controller background task) — implementers must not use port 5173
Task 10: browser check paused — concurrent reviewer shared the Playwright browser (spurious page/status changes observed at 08:48, not an app bug). Resume after reviewer. Observed so far: check 1 OK (redirect, 57 applications, 10 rows); layout: Status select taller than Search input (misaligned); console: React 'Select is changing from controlled to uncontrolled' warning in real browser too; favicon 404.
- Ruling R8: Task 10 review Important #1 (plan-mandated router warning "Matched leaf route at location '/' does not have an element or Component") — fix at source by adding `Component: PageSpinner` to the index redirect route, not by mocking console.error — cost if wrong: a spinner component that is never visible.
- Ruling R9: The "Select is changing from controlled to uncontrolled" warning (pre-existing since Task 9, also visible in the real browser console) is load-bearing for the demo — fixed in Task 10's fix round by root cause, never suppressed; Task 9's "pristine" claim was inaccurate — cost if wrong: extra fix time.
- Ruling R10: Controller browser finding — Status Select (size medium) is taller than the Search Input — fold alignment fix into Task 10's fix round — cost if wrong: minor styling churn.
Task 10: fix round 1/5 dispatched (fix base 90c4c91; findings R8, R9, R10)
Task 10 browser check (controller, 08:50): 1 OK; 6 OK but skeleton rows shorter than data rows and column widths shift (spec says no layout shift); 7 OK (500 → 2 retries → callout at ~3.9s); 8 OK; 9 OK (dark persists across reload); 10 FAIL: at 360px page scrollWidth 391 — AutoPagination UL overflows; reference/business cells wrap mid-token ("LPP-/2026-/1036"), table should keep nowrap cells and scroll inside its overflow-auto wrapper; favicon.ico 404.
Pending for fix round 2: mobile pagination overflow, table cell nowrap, skeleton row height/column widths, favicon.
Task 9/10 note: MYDS Select bug — useEffect(() => setOpen(props.open)) with no guard overwrites false with undefined when open is uncontrolled → Radix controlled/uncontrolled warning; fixed by controlling open/onOpenChange ourselves (16a386d). Evidence for AI-workflow page.
Task 10: fix round 1/5 done (3 fixed per implementer; commits 90c4c91..16a386d) — scoped re-review dispatched. Fix round 2/5 dispatched (fix base 16a386d; findings: mobile pagination overflow, cell nowrap, skeleton row height, favicon)
Task 10: fix round 1/5 re-review (3 addressed, 0 open; commits 90c4c91..16a386d). Out-of-scope minor: index spinner could flash on client nav to / (acceptable).
Task 10 browser check (controller, 09:03) after fix rounds: 1–5 OK (redirect, status filter, debounced search ?q=Selera → 2, sort aria-sort + URL, next page keeps sort); 6–9 OK; 10 OK (360px scrollWidth 345, nowrap cells, 0 console warnings); production preview OK (MSW runs, 57 applications, 0 console messages).
Task 10: fix round 2/5 (4 addressed, 0 open; commits 16a386d..5bffbf9)
Task 10: complete (commits 22d039d..5bffbf9, 2 fix rounds, review clean)
Task 11: step 1 dispatched (base 5bffbf9, haiku); steps 2–4 held for user approval per R2
Task 11: step 1 complete (commits 5bffbf9..b8a61dc, review clean); warning resolved by controller: npm run check green (18 files/78 tests, 92.3% stmts, build OK)
Task 11: minor (deferred): vite build prints chunk-size warning (>500 kB chunk) — relevant to claimed practice #17 route-level code splitting
Final review: dispatched (e386413..b8a61dc, opus)
Final review: With fixes — 0 critical, 7 important, 13 minor; triage says fix T3, T4, T7, T8, T9, T11.
- Ruling R11: One final fix wave covers Important 1–7, triage fixes, and minors M1–M3, M5–M7, M9–M13 — all cheap and demo-visible — cost if wrong: a slightly larger fix diff.
- Ruling R12: Deferred: M4 (reference links 404 until Plan 2 — Plan 2 must land before the link is shared publicly), M8 (no eslint-plugin-react for keys — Plan 5 practices page must name review as enforcement for #7, or add the plugin then) — cost if wrong: a broken-looking link if Plan 2 slips.
- Ruling R13: Class-name layout tests deleted (I3); the 360px no-overflow and skeleton-vs-data row-height checks become mandatory Playwright tests in Plan 4 — cost if wrong: mobile regressions uncaught until Plan 4.
- Ruling R14: Plan 5 practices page must mark not-yet-built enforcement (Storybook #12, Playwright/axe #13/#14, i18n key-coverage #18 is a type-check) as "planned" or reword — cost if wrong: an interviewer catches an overclaim.
Final fix wave: dispatched (fix base b8a61dc, opus)
Final fix wave: done (commits b8a61dc..213eb1e, 10 commits; 21 files/99 tests; coverage 94.35%; no chunk warning). Concerns: own ListPagination (MYDS PaginationPrevious/Next force English aria-label), debounce returns [fn, cancel], clamped-page sync via useEffect. Scoped re-review dispatched.
Final fix wave re-review: all findings addressed, no new Critical/Important (commits b8a61dc..213eb1e).
Final: parked — DevPanel Escape listener ignores event.defaultPrevented (Escape in an open Select also closes the Dev Panel) — Ruling: real, minor; carry into Plan 4 a11y pass (one-line `if (event.defaultPrevented) return;`) — cost if wrong: small focus annoyance in demo if both are open.
Final: parked — M1 edge: pending q still commits after "Clear filters" when URL q was already '' — Ruling: harmless (input and URL agree); leave — cost if wrong: none visible.
Final: parked — out-of-scope: MockApiBanner before skip link; focus lost when Prev/Next becomes disabled — Ruling: Plan 4 a11y pass — cost if wrong: minor keyboard oddity.
Plan 1 implementation complete at 213eb1e; Task 11 steps 2–4 (GitHub, push, Vercel) await user approval.
Task 11: step 2 done with user approval — public repo https://github.com/marwanbukhori/semakan created, main + plan-1-foundation pushed, PR #1 opened. Vercel deploy (step 3) not yet approved.
CI: PR #1 run 35843593240 success (Node 24 on ubuntu).
Task 11: complete — PR #1 merged (fa8c8a7), deployed to https://semakan-plum.vercel.app (Vercel account player1-dev, CLI deploy; not Git-connected), README live link pushed.
