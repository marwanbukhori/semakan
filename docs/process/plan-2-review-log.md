# Plan 2 review log

Review log for Plan 2 (Application Detail and Review). Published from the build ledger; agent IDs and local paths removed.

Spec: docs/specs/2026-09-23-semakan-design.md
Branch: plan-2-detail-review (from main @ 8612607)
Dev server: http://localhost:5173 (controller background task) — implementers must not use port 5173 or browser tools.

## Pre-flight scan

| Pair / task | Produces → consumes | Finding |
|---|---|---|
| T1 → T4, T5, T10 | apiClient.post(path, schema, body, options) | Match |
| T2 → T3, T5, T8, T9, T10 | schemas (Detail, Timeline union, ReviewDecision/Request, DOCUMENT_KINDS), types, rules (isReviewable, statusAfterDecision, reviewErrorKey) | Names and signatures match |
| T3 → T4, T5, T8, T10 tests | seedApplicationDetails, toSummary, requiresFireCertificate, getApplication, applyReview, CURRENT_OFFICER | Match; T3 guards Plan 1 seed invariant with a test |
| T3 self | "blocked" app must exist in seed | Not guaranteed; plan gives DETAIL_SEED_OFFSET fallback |
| T4 → T5, T6, T10 | conflictNext on DevControls | T4 precedes its consumers |
| T4 self | stale-version test | Fixed in plan self-review (version + 1) |
| T6 → T7–T10 | en/ms keys | Checked every string asserted in T7–T10 tests: all present in T6 |
| T6 → T10 | AutoToast mounted in AppLayout | Router test renders layout; ReviewRoute test mounts its own Shell |
| T8 → T10 | createRoutes(), `:id` route with Outlet | T10 adds the `review` child |
| T8 → ListRoute | LoadError gains `title` | T8 updates ListRoute |
| T8 self | error state vs background refetch | Fixed in plan self-review (only when data undefined) |
| T9 → T10 | ReviewForm({ isSubmitting, onSubmit, onCancel }) | Match |
| T10 self | router test used stale links | Fixed in plan self-review (deep link) |
| T11 | push / PR / deploy | Controller + user approval |

## Rulings

- Ruling P2-R1: Branch created by the controller before Task 1; Task 1 step 1 (create branch) is already done — cost if wrong: none.
- Ruling P2-R2: All implementers use sonnet (Plan 1 haiku made an unreported API substitution) — cost if wrong: slightly higher token cost.
- Ruling P2-R3: Task 11 browser check by controller; push/PR/deploy need user approval — cost if wrong: a short pause.

## Progress
Task 1: dispatched (base 8612607, sonnet)
Task 1: complete (commits 8612607..8eb21e4, review clean)
Task 2: dispatched (base 8eb21e4, sonnet)
Task 2: minor (deferred): version schema duplicated in Detail and Request schemas
Task 2: complete (commits 8eb21e4..28affce, review clean)
Task 3: dispatched (base 28affce, sonnet)
Task 3: seed facts — 43/57 reviewable, 6 blocked; DETAIL_SEED_OFFSET 1000
Task 3: complete (commits 28affce..6c4bede, review clean)
Task 4: dispatched (base 6c4bede, sonnet)
Task 4: minor (deferred): toFieldErrors joins nested paths (requestedInfo.0) which the form would treat as a root error
Task 4: complete (commits 6c4bede..5a637a0, review clean)
Task 5: dispatched (base 5a637a0, sonnet)
- Ruling P2-R4: Task 5 review Important (plan-mandated): waitFor spanning 800 ms latency with 1 s default timeout — fix with { timeout: 3000 }; same rule carried into Task 10's latency test — cost if wrong: none.
Task 5: fix round 1/5 dispatched (fix base 43a7166)
Task 5: fix round 1/5 (1 addressed, 0 open; commits 43a7166..078246b)
Task 5: minor (deferred): sequential cancelQueries could be Promise.all; no multi-page list test
Task 5: complete (commits 5a637a0..078246b, 1 fix round, review clean)
Task 6: dispatched (base 078246b, sonnet)
Task 6: minor (deferred, ask user): ms notFoundBody 'dikeluarkan' may read as 'issued'; consider 'dipadam'
Task 6: minor (deferred): no test for Escape with focus on the Dev Panel toggle itself
Task 6: complete (commits 078246b..506c26f, review clean)
Task 7: dispatched (base 506c26f, sonnet)
Task 7: warning resolved: i18n keys added in Task 6, enforced by typecheck
Task 7: minor (deferred): timeline dot offset magic number; repeated case shape (intentional)
Task 7: complete (commits 506c26f..4834fbf, review clean)
Task 8: dispatched (base 4834fbf, sonnet)
Task 8: complete (commits 4834fbf..b55bf1f, review clean)
Task 9: dispatched (base b55bf1f, sonnet)
- Ruling P2-R5: Task 9 Important #1 (plan-mandated a11y): link decision radiogroup and requestedInfo checkbox-group errors (aria-invalid on the controls, aria-describedby on the group), move focus to the first invalid control on client-side failure and after a server 422 (manual focus by element id, since Radix group roots are not focusable), and make the form-level server error role="alert" — cost if wrong: small extra code.
- Ruling P2-R6: Task 9 Important #2 (plan-mandated): clear errors when the decision changes; keep typed values (payload is safe — zod strips other branches; keeping text is better UX when toggling back) — cost if wrong: an officer sees their earlier text again, which is intended.
Task 9: fix round 1/5 dispatched (fix base bf183a8)
Task 9: fix round 1/5 (2 addressed, 0 open; commits bf183a8..40e4ee2)
Task 9: minor (deferred): focusFirstError stops at first present field even if its element is not rendered (server error for a hidden branch field)
Task 9: minor (deferred): no aria-required / required indicator on reason/required note
Task 9: complete (commits b55bf1f..40e4ee2, 1 fix round, review clean)
Task 10: dispatched (base 40e4ee2, sonnet)
- Ruling P2-R7: Task 10 implementer set `<Dialog modal={false}>` to make two plan tests pass (Radix modal hides the background page via aria-hidden). Overruled: the product must keep the modal (focus trap + backdrop are spec'd demo behaviour); fix the tests instead — background assertions use `{ hidden: true }` (the page behind a modal is correctly inert) — cost if wrong: none; production a11y preserved.
Task 10: fix round 1/5 dispatched before review (controller-confirmed gap; fix base 77c9dc9)
Task 10: fix round 1/5 (1 addressed; commits 77c9dc9..66e3cd7) — full task review dispatched on 40e4ee2..66e3cd7
Task 11 browser check (controller, 11:27–11:29, dev server restarted — it had cached a stale import error from a branch switch):
  OK: detail page facts/documents/timeline/breadcrumb; review dialog modal (inert dimmed background, focus inside); Escape closes to /applications/:id; 422 fire rule on app-002 shows translated message, radios aria-invalid, focus on decision; 409 conflict banner keeps typed reason, resubmit succeeds; success → badge Rejected, timeline entry with officer + reason, closed text, toast; 500 → error toast + callout, badge rolled back; Malay: no English on detail page except below.
  FINDINGS for final fix wave:
  B1 (Important) 360px: detail page scrollWidth 394 — MYDS SummaryList tables overflow (long values like email / labels); must fit or wrap at 360px.
  B2 (Important, a11y) Focus goes to <body> after the review dialog closes (Escape and after success). Should return to the Review link (Escape/cancel) or to the page heading when the application is now closed.
  B3 (Important, i18n) MYDS AutoToast viewport has English aria-label "Notifications (F8)" — translate (Radix ToastViewport `label` prop) or record as limitation.
  Demo note: with the modal open the Dev Panel is unreachable — set Dev Panel options on the detail page before clicking Review (server error keeps cached detail usable).
  Minor: toast overlaps the Dev Panel toggle; conflict copy "The latest version is loading" stays after load completes.
Task 10: minor (deferred): no test for overlay-click close (same path as Escape)
Task 10: complete (commits 40e4ee2..66e3cd7, 1 fix round, review clean)
Final review: dispatched (8612607..66e3cd7, opus)
Final review: With fixes — 1 critical (B2 focus return), 7 important (B1, B3 extended, mid-submit close navigates, dialog scroll on short screens, silent 422 without fieldErrors, stale conflict copy + no reset, BM 'dikeluarkan'), minors triaged.
- Ruling P2-R8: One final fix wave: Critical 1, Important 2–8, plus cheap minors (T4 toFieldErrors path[0]; aria-invalid also on the radiogroup root; toast viewport moved off the Dev Panel toggle; show document fileName). BM notFoundBody → "Ia mungkin telah dipadam." (user to confirm wording) — cost if wrong: a one-word copy change.
- Ruling P2-R9: Deferred to Plan 4 (a11y/E2E): per-route document.title and focus-to-h1 after list→detail navigation; Playwright 360px scrollWidth check for /applications/:id and dialog height at 360×640 — cost if wrong: minor SPA a11y gaps until Plan 4.
Final fix wave: dispatched (fix base 66e3cd7, opus)
Final fix wave: done (commits 66e3cd7..bd56ec3, 11 commits; 173 tests; 95% stmts). Deviations: I7 guard extended instead of reset effect; toasts not trimmed (Radix removes); rebuilt toast icon/progress; toasts bottom-12 right; also fixed a leaking latency test.
Final browser recheck (controller, 11:52–11:54): I2 OK (detail scrollWidth 360 at 360px); I5 OK (dialog 16..624 in 640 viewport, overflow-y auto, scrolls); C1 OK (Escape → focus #review-link; success → focus #application-heading); I3 OK (region label from i18n, close button "Dismiss notification", no overlap with Dev Panel toggle); console 0 warnings.
Final: parked — real-browser focus order: with requestedInfo AND note invalid, focus lands on the note (RHF's shouldFocusError runs after our onInvalid and focuses the first ref-registered field) — Ruling: still focuses an invalid field; fix in Plan 4 a11y pass with useForm({ shouldFocusError: false }) + a test where both are invalid — cost if wrong: minor keyboard-order imperfection in the demo if both are left empty.
Final: parked — toast viewport invisible band captures clicks (inherited from AutoToast) — Ruling: Plan 4 a11y pass, add pointer-events-none to the viewport — cost if wrong: an occasional dead click area above the Dev Panel. Final fix wave re-review: all addressed (66e3cd7..bd56ec3).
PR #2 opened (user approved option 2).
CI: PR #2 run 35865064450 success.
Plan 2 merged (cc003fa) and deployed to https://semakan-plum.vercel.app; live check OK. User confirmed BM 'dipadam' wording.
