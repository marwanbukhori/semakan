# Semakan

![CI](https://github.com/marwanbukhori/semakan/actions/workflows/ci.yml/badge.svg)

A demo frontend for reviewing business premises licence applications, built to
show how I structure and test a React + TypeScript app for government services.

**Live demo:** https://semakan-plum.vercel.app

- **Stack:** Vite, React 19, TypeScript, React Router, TanStack Query, zod,
  MYDS (Malaysia Government Design System), Tailwind, MSW, Vitest.
- **Mock API:** the app's API is simulated in the browser with MSW. Open the
  **Dev Panel** (bottom right) to add latency or force errors and empty results.
- **Design and plans:** `docs/specs/` and `docs/plans/`.

## Run it

    npm install
    npm run dev

## Run the backend locally

The NestJS API (`apps/api`) serves the same contract from Postgres. You need
Docker and Node 24.

    npm run db:up                               # Postgres on localhost:55432
    cp apps/api/.env.example apps/api/.env
    npm run db:seed                             # migrate, then seed an empty database
    npm run dev:api                             # http://localhost:3100, docs at /docs
    npm run dev                                 # web app on http://localhost:5173

In the web app, open the **Dev Panel** and set **API source** to
**Real API (localhost:3100)**. Stop Postgres with `npm run db:down` (the data
volume is kept).

To run Postgres and the API together in containers instead, use
`docker compose -f infra/docker-compose.yml up -d --build`. The API container
migrates and seeds on start, and serves http://localhost:3100 (no `/docs`,
because it runs in production mode).

## Check it

    npm run check   # typecheck, lint, format, tests with coverage, build

The API tests start their own Postgres with Testcontainers, so Docker must be
running.
