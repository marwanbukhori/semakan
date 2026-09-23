# Semakan: agent instructions

Read `docs/specs/2026-09-23-semakan-design.md` before changing behaviour.
Implementation plans live in `docs/plans/`.

## Commands

- `npm run dev`: dev server, with the mock API (MSW) running in the browser
- `npm test`: Vitest in watch mode
- `npm run check`: typecheck, lint, format check, tests with coverage, build.
  It must pass before any task is called done.

## Architecture rules

- `src/features/<name>` never imports another feature. Shared code goes in
  `src/shared`. Enforced by `eslint-plugin-boundaries`.
- Routes are thin. Data access lives in `features/<name>/api` hooks, markup in
  `components/`.
- Every API response is parsed with a zod schema: `apiClient.get(path, schema)`.
- Query keys come from the feature's key factory (e.g. `applicationKeys`).
- Filter, sort and page state lives in the URL and is parsed with zod.
- UI strings go through i18next. `ms.ts` must type-check against `en.ts`.
- Use MYDS components (`@govtechmy/myds-react/<name>`) and MYDS tokens
  (`bg-bg-*`, `text-txt-*`, `border-otl-*`). The MYDS preset removes
  Tailwind's default palette.

## Testing rules

- Write the failing test first.
- Query by role and label. Avoid test IDs.
- Mock the network only with MSW handlers in `src/mocks`, never by mocking
  `fetch` or modules.

## Pinned versions

- Node 24 LTS.
- TypeScript 6.0.3: typescript-eslint 8.70 does not support TypeScript 7 yet.
- Tailwind 3.4: `@govtechmy/myds-style` is a Tailwind 3 preset.
