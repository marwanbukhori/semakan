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

## Check it

    npm run check   # typecheck, lint, format, tests with coverage, build
