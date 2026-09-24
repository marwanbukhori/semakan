# Semakan — About Pages Design (addendum to the main spec)

**Date:** 2026-09-24
**Extends:** `docs/specs/2026-09-23-semakan-design.md` §5 (showcase routes), §8 (practices), §8a (AI workflow)
**Status:** Approved in brainstorming on 2026-09-24

## Why this changed

A second interview came in: **Backend Developer** at the same company (event-driven services, DDD, Go/TS/Python, tests, on-call). Both interviews are in October 2026. The about pages now have to serve both, and the backend service (`semakan-api`, TypeScript) is planned as Plan 6.

## 1. Pages and navigation

- Five public pages under one `/about` layout with a sub-navigation:
  - `/about`: Overview
  - `/about/architecture`: Architecture
  - `/about/practices`: Practices
  - `/about/experience`: Experience
  - `/about/ai-workflow`: AI workflow
- Header link: "About this build" / "Tentang binaan ini".
- `/` now redirects to `/about` (previously `/applications`), so a shared link lands on the explanation first, matching the demo script.

## 2. Content model

- Long-form content lives in typed modules shaped `{ en: T; ms: T }`, so a missing language is a type error. Short UI labels stay in `en.ts`/`ms.ts`. The Malay is drafted by the assistant and corrected by the author.
- Code excerpts come from the real source through Vite `?raw` imports, cut by named region markers (`// #region practice:<id>` … `// #endregion`). A test fails if a region is missing.
- Evidence links point at `https://github.com/marwanbukhori/semakan/blob/main/<path>`. A test fails if any linked path does not exist in the repo.

## 3. Pages

### Overview
What Semakan is and why it exists (both roles), the stack, the CI badge, links to the live app and repo, and an interactive folder tree: each top-level folder expands to explain what belongs in it.

### Architecture
A layer diagram (routes → feature hooks → `apiClient` + zod → MSW / data.gov.my) with a text description, and one request traced step by step with links to each file.

### Practices
The main spec's §8 catalogue. Each entry has **What**, **Why**, **Where** (a live code excerpt and a link) and **Enforced by**, plus a status:
- **Enforced:** a lint rule, the type checker, a test or CI makes it hold.
- **Partial:** enforced for part of the code, or by review only. The page says which.
- **Planned:** named with the plan that delivers it (e.g. Playwright + axe in Plan 4, Storybook in Plan 4 if time allows).

Backend practices are added with Plan 6.

### Experience
- **Role switch** at the top, stored in the URL (`?role=frontend|backend`, default `frontend`).
- **Update (2026-09-24):** the author is focusing on the Backend role, so the default is now `backend` (`?role=frontend` shows the frontend view).
- **Project cards**, each with a **Frontend** and a **Backend** section (what was built, the hard problem, the pattern in Semakan). Items are tagged with requirement IDs from the job descriptions. The active role's section comes first; a project with nothing for the active role is dimmed, not hidden.
  - **Update (2026-09-24):** the role switch filters: each card shows only the selected role's work, and projects with none are hidden.
- **Requirements map**: one row per requirement from the selected role's job description (must-have and nice-to-have), with evidence from past work (links to cards) and evidence in Semakan (links to code). Rows without Semakan evidence yet are marked **Planned** with the plan number.
- Requirement tags are typed: a tag that does not exist in `requirements.ts` fails the type check.
- **Cards** (facts from the author's portfolio content, corrected by the author on 2026-09-24):
  - **E-Invoice System (EIS), Silentmode.**
    - Frontend: the entire frontend in Vue with PrimeVue.
    - Backend: built from scratch with NestJS; event-driven on AWS (SQS, ECS, Lambda, DynamoDB); CQRS and DDD; the e-invoice submission module integrated with LHDN using message-queue patterns; production support.
  - **Verus Virtus company site.** Frontend only: designed and built with Next.js, Tailwind and Vercel as the first engineer; positioning-led; CSS-only motion.
  - **Rembayung booking queue** (personal project).
    - Frontend: Angular 20 console reading pods, quota and autoscalers live and starting load runs.
    - Backend: Java/Spring Boot services on OpenShift; a queue gate that admits at a fixed rate; per-slot pessimistic row locks; an Oracle CHECK constraint as the oversell guard; k6 load tests in-cluster; Splunk and Dynatrace; Ansible deploys with automatic rollback; 203 tests against real Oracle via Testcontainers.
  - **CloudBOS reporting, Terato Tech (outsourced to Silentmode).** A Laravel monolith with Vue components. Reports (fuel totalizer, sales movement) used across 1,000+ Petronas, Shell and BHPetrol stations; the Electronic Shelf Label system with PDF and Excel generation; configurable planograms.
  - **RON95 subsidy (BUDI95) and POS features, Silentmode.** Backend: NestJS with DDD and TDD (Jest, MongoDB, Docker); integration with the CDB team for about 800,000 subsidy transactions a day; loyalty points and MyDebit support with Invenco. Links to the fuel prices page, which shows the BUDI95 price.
  - **Security hardening, Geomotion.** Backend/security: rate limiting, WAF rules and security headers across six microservice repositories after an audit; CSP and SRI; automated scanning in CI/CD (Grype, GitLab SAST, pip-audit).
  - **Python services** (personal): the resume RAG chat (LangGraph, FastMCP server and a `POST /api/chat` endpoint) and the local chef agent (LangChain, LangGraph, Ollama). Evidence for Python, which the backend job description lists.
- Excluded at the author's request: Betaqwa; the Nexus configurator; adding CSP to Semakan.

### AI workflow
- The pipeline: brainstorm → spec → verify before planning (spikes, API probes) → plan → a fresh agent per task with TDD → task review → fix rounds with rulings → final review on the strongest model → real-browser check → PR, CI, merge and deploy with the author's approval.
- Tools actually used: Claude Code; Superpowers skills (brainstorming, writing-plans, subagent-driven-development, finishing-a-development-branch); the dataviz skill with its palette validator; Playwright MCP for real-browser checks; `gh` and `vercel` CLIs; model tiers per role.
- **What I own and what the AI does**, as a two-column table.
- **Caught by review**: real incidents, each linking to its entry in the published logs:
  - Haiku's unreported switch to the deprecated `z.string().datetime()` API
  - the modal focus trap an agent removed to make tests pass
  - an implementer taking the wrong side of a plan contradiction (palette order)
  - the MYDS Select `open` bug
  - the React Router 8 `setSearchParams` finding
  - the clipped chart label and tooltip overflow found in the real browser
  - the date parser that could throw
- Numbers counted from the published logs: tasks, reviews, fix rounds, rulings.

## 4. Published review logs

The SDD ledgers for Plans 1–3 are copied to `docs/process/plan-N-review-log.md`:
- Agent IDs, local absolute paths and scratchpad paths are removed.
- Tasks, verdicts, fix rounds and every ruling (with its "cost if wrong") are kept.

Later plans publish theirs the same way.

## 5. Testing

- Each page renders in EN and MS with no missing keys (the type check, plus a render test per language).
- The role switch URL state, and keyboard use of the folder tree and the role switch.
- Content integrity:
  - every requirement tag is valid (type level)
  - every code region exists (test)
  - every evidence path exists in the repo (test)
