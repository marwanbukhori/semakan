# Plan 3 review log

Review log for Plan 3 (data.gov.my Fuel Prices). Published from the build ledger; agent IDs and local paths removed.

Spec: docs/specs/2026-09-23-semakan-design.md (§7a)
Branch: plan-3-open-data (from main @ 735abbc)
Dev server: http://localhost:5173 (controller) — implementers must not use port 5173 or browser tools.

## Pre-flight scan

| Pair / task | Produces → consumes | Finding |
|---|---|---|
| T1 → T8 | shared LoadError, errors.rateLimited/notFound | Match |
| T2 → T3, T4, T6, T7, T8 | schemas, types, FUEL_KEYS/RANGES, rangeStart, fixture, pinDate | Match |
| T3 → T4, T8 tests | DATA_GOV_CATALOGUE_URL, dataGov dev control (test default fixture) | Match |
| T4 → T6, T7, T8 | fuel.* strings, formatPrice/formatMonthYear, useFuelPrices, useFuelFilters | T4 adds all strings before their consumers |
| T5 → T6 | geometry helpers, useElementWidth | Match |
| T6/T7 → T8 | FuelFilters, FuelPriceChart, LatestPricesTable, ChartDataTable, DataFreshness | Props match |
| T3 self | DevPanel "active" badge vs test-mode default | Default is 'fixture' in tests, so not active — plan calls it out |
| T6 self | findLastIndex needs ES2023 lib | Plan gives the choice; implementer reports |
| T8 self | router test pinDate inside test body | Leak risk if it fails mid-test; acceptable (minor) |

## Rulings

- Ruling P3-R1: Controller created the branch; skip branch creation — cost if wrong: none.
- Ruling P3-R2: Hand-built SVG chart instead of the spec's "small chart library" (dataviz spec control, no dependency, a11y) — cost if wrong: more code to maintain.
- Ruling P3-R3: Author's BUDI95 note moves from the product page to /about/experience (Plan 5) — cost if wrong: one sentence moves back.
- Ruling P3-R4: Implementers use sonnet; final review and fix wave use opus — cost if wrong: token cost.

## Progress
Task 1: dispatched (base 735abbc, sonnet)
Task 1: note — plan bug: errors.notFound collided with existing key; implementer renamed old key to errors.pageNotFound (router test covers the 404 page)
Task 1: complete (commits 735abbc..9a72724, review clean)
Task 2: dispatched (base 9a72724, sonnet)
- Ruling P3-R5: Plan contradiction in Task 2 (FuelFiltersSchema reorders to palette order, but the test expected URL order). The palette order is the rule (global constraints, Task 4 hook test, column order), so restore the reorder transform and change the test expectation to ['ron95','diesel'] — cost if wrong: none.
Task 2: fix round 1/5 dispatched before review (fix base 45d2ad3)
Task 2: fix round 1/5 done (9dcbba0) — full task review dispatched on 9a72724..9dcbba0
Task 2: minor (deferred): malaysiaDateTime transform throws RangeError (not ZodError) for regex-valid but impossible dates — use ctx.addIssue/z.NEVER
Task 2: minor (deferred): pinDate first exercised in Task 4
Task 2: complete (commits 9a72724..9dcbba0, 1 fix round, review clean)
Task 3: dispatched (base 9dcbba0, sonnet)
Task 3: complete (commits 9dcbba0..9d5715c, review clean)
Task 4: dispatched (base 9d5715c, sonnet)
Task 4: minor (deferred): no direct test of useFuelPrices staleTime edge cases (past next_update, no data)
Task 4: complete (commits 9d5715c..e4dfe24, review clean)
Task 5: dispatched (base e4dfe24, sonnet)
- Ruling P3-R6: Task 5 plan-mandated Importants — fix both: monthTickIndexes returns [] for maxTicks <= 0; niceDomain gets the same 1e-9 tolerance as ticks(). Also document layoutEndLabels' overcrowded behaviour (bounds and order win over gap) — cost if wrong: none.
Task 5: fix round 1/5 dispatched (fix base 8ccbde7)
Task 5: minor (deferred): no dedicated useElementWidth test (zero-width measurement keeps previous width)
Task 5: fix round 1/5 (3 addressed; commits 8ccbde7..ccc7cc9)
Task 5: complete (commits e4dfe24..ccc7cc9, 1 fix round, review clean)
Task 6: dispatched (base ccc7cc9, opus — most intricate component)
- Ruling P3-R7: Task 6 fix round covers the 3 plan-mandated Importants (clipped BUDI95 end label, tooltip placement/overflow, hidden-toggle contrast) plus minors M1 (empty-data guard), M3 (remove unreachable `?? 0`, dedupe readout/tooltip rows), M4 (let modified arrow keys through; mention Escape), M5 (live region announces keyboard/focus only), M7 (null-gap test). Deferred: M2 single-point bare M (end dot still shows); M6 NVDA/JAWS browse-mode note (table view is the equivalent — Plan 4 a11y pass) — cost if wrong: small.
Task 6: fix round 1/5 dispatched (fix base eac29e7)
Task 6: fix round 1/5 done (eac29e7..df410a5, 3 commits); browser verification of I1/I2 deferred to Task 9 (page not routed until Task 8)
Task 6: fix round 1/5 (8 addressed, 0 open; commits eac29e7..df410a5)
Task 6: complete (commits ccc7cc9..df410a5, 1 fix round, review clean; browser check of label fit + tooltip placement in Task 9)
Task 7: dispatched (base df410a5, sonnet)
- Ruling P3-R8: Task 7 plan-mandated Importants — give the null "—" an accessible meaning (aria-hidden dash + sr-only "Not available"/"Tiada data"), and test the down, no-change and null branches; include the whitespace-nowrap minors (ChartDataTable value cells, all table headers) — cost if wrong: none.
Task 7: fix round 1/5 dispatched (fix base 1c3aa96)
Task 7: fix round 1/5 (3 addressed; commits 1c3aa96..1222cbd)
Task 7: complete (commits df410a5..1222cbd, 1 fix round, review clean)
Task 8: dispatched (base 1222cbd, sonnet)
Task 9 browser check (controller, 14:34–14:40) — LIVE API: GET https://api.data.gov.my/data-catalogue/?id=fuelprice&date_start=2026-03-23%40date&sort=date&meta=true → 200 (preceded by one StrictMode-aborted duplicate in dev).
 OK: header nav link; four lines in validated palette; direct end labels incl. "RON95 (BUDI95) RM 1.99" fit (I1 confirmed); hover crosshair + value-first sorted tooltip flipping left near the edge (I2 OK); hover leaves the live region silent (M5); keyboard focus/Left/Home/Escape readout; latest-weeks table with neutral arrows; freshness footer (data as of 24 Sept 2026 12:01 am, next 30 Sept, Source: MOF via data.gov.my); Dev Panel 429 → translated rate-limit alert with retry; 360px light Malay: scrollWidth 360, no direct labels, legend shown, no English left, "Mac 2026" month labels.
 FINDING F1 (Important, visual): desktop x-axis — first tick "Mar 2026" (index 0, 26 Mar) overlaps "Apr 2026" (first April week one step later). monthTickIndexes always keeps index 0; it should drop a leading partial-month tick when the next month tick is closer than the minimum label spacing (or skip index 0 when its date is after day 7).
 Observation: after a failed refetch on a NEW range (429), the chart disappears (placeholder data is not kept on error) and only the error shows — acceptable.
- Ruling P3-R9: Task 8's plan-mandated Important (router test pins the date without try/finally) is a one-line fix — folded into the final fix wave with browser finding F1 instead of a separate round — cost if wrong: none (the final wave is reviewed).
Task 8: minor (deferred): no test for the error-with-cached-data branch
Task 8: complete (commits 1222cbd..db1a16e, review approved; its Important carried into the final fix wave per P3-R9)
Final review: dispatched (735abbc..db1a16e, opus)
Final review: With fixes — 0 critical, 5 important (F1 tick overlap, missing RM-per-litre unit, malaysiaDateTime can throw, misleading "without retrying" test, P3-R9 date-pin leak).
- Ruling P3-R10: One final fix wave: Important 1–5 + minors (x by real dates, switch+assertNever in the row split, pointer-focus does not announce, toggleFuel from previous params, lazy fixture import). Deferred to Plan 4: range buttons as a radiogroup; summary start date; cached-data-error test — cost if wrong: small.
Final fix wave: dispatched (fix base db1a16e, opus)
Final fix wave: done (db1a16e..3c17559, 9 commits; 240 tests). Notes: RR8 setSearchParams(fn) receives last-rendered params (pending-write ref for M4); monthTickIndexes now (dates, xs, minSpacing); margin.top 32 for the unit label.
Final browser recheck (14:54): I3 'RM per litre' axis title OK; I1 ticks no longer overlap (first 'Apr 2026'); M1 date-spaced x in 1y view; dark palette OK; console 0 warnings; live API 200.
Final fix wave re-review: all addressed (db1a16e..3c17559).
Final: parked — monthTickIndexes doc says "partial month" but it also drops a full first month when months < 72px apart — Ruling: comment-only inaccuracy; fix with Plan 4 — cost if wrong: none.
Final: parked — memoised fixture import caches a rejected load until reload — Ruling: dev/demo-only mock path; clear on catch in Plan 4 — cost if wrong: a reload after a chunk-load blip.
Final: parked — identical dates would collapse x positions — Ruling: impossible for weekly sorted data — cost if wrong: none today.
PR #3 opened (user approved option 2).
CI: PR #3 result recorded.
Plan 3 merged (559e9dd) and deployed to https://semakan-plum.vercel.app.
Prod check: live data.gov.my call confirmed via performance entries on https://semakan-plum.vercel.app/open-data/fuel-prices; 0 console warnings.
