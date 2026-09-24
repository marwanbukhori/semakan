# Plan 6a: Monorepo and Shared Contract — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the repo into an npm-workspaces monorepo. Move the frontend, unchanged, to `apps/web`, and extract the API contract into `packages/contract`. CI, the live Vercel site and the about pages must keep working exactly as before.

**Architecture:**
- The repo root becomes the workspace root: `apps/*` and `packages/*`.
- `apps/web` is today's app, moved with `git mv` so history is kept.
- `packages/contract` ships plain TypeScript source, exported as `@semakan/contract`. The web app imports it through npm's workspace symlink.
- The about pages now resolve every repo path relative to the repo root, through one `toRepoPath()` helper. This works because Vite's `import.meta.glob` keys are relative to the importing file.

**Tech Stack:** As before, plus npm workspaces. No new runtime dependencies.

**Spec:** `docs/specs/2026-09-24-semakan-api-design.md` (§2 layout, §12 plan 6a); the frontend spec is `docs/specs/2026-09-23-semakan-design.md`.

## Global Constraints

- **No behaviour changes:** 6a is a pure restructure, and the app must behave identically. The full test count must be the same or higher, never lower.
- **Keep history:** move files with `git mv`, never delete and recreate.
- **Package names:**
  - `semakan` for the root (private)
  - `@semakan/web` for `apps/web`
  - `@semakan/contract` for `packages/contract`
- **Versions:** exact, as in today's `package.json`. No version changes and no new dependencies.
- **Node:** `.nvmrc` stays at the root, and CI uses it.
- **Vercel:** the project stays linked at the repo root (`.vercel/` is untouched). The root `vercel.json` sets `buildCommand` and `outputDirectory`; dashboard settings are not needed.
- **Verified in a spike on 2026-09-24:**
  - `import.meta.glob(['../../../docs/**/*.md', '../../../AGENTS.md', './**/*.ts'], { query: '?raw', import: 'default' })` from `apps/web/src/files.ts` works in Vitest and `vite build`.
  - The keys are relative to the importing file, e.g. `"../../../docs/a.md"` and `"./files.test.ts"`.
  - A workspace package exporting `./src/index.ts` is importable by name.
- **Tests never call the real api.data.gov.my.**
- **Commits:** run `npm run format` before every commit.
- **The about pages stay truthful:** every evidence path and code region must still resolve, and the integrity test proves it.

---

## File Map

```
package.json                  REWRITTEN: workspace root (workspaces, root scripts, prettier)
vercel.json                   + buildCommand, outputDirectory, installCommand
.prettierignore               paths updated
.github/workflows/ci.yml      runs root `npm run check`
apps/web/                     ← git mv of: src public index.html vite.config.ts eslint.config.js
                                tailwind.config.ts postcss.config.js tsconfig.json tsconfig.app.json
                                tsconfig.node.json
apps/web/package.json         NEW: today's package.json minus root-only bits, name @semakan/web
apps/web/src/features/about/source/repoPath.ts        NEW: toRepoPath()
apps/web/src/features/about/source/files.ts           globs relative to the repo root
apps/web/src/features/about/content/*.ts              repo paths: src/… → apps/web/src/… etc.
apps/web/src/features/about/content/integrity.test.ts globs relative to the repo root
packages/contract/package.json, tsconfig.json, eslint.config.js, vitest.config.ts
packages/contract/src/{applications.ts,types.ts,errors.ts,index.ts,errors.test.ts}
apps/web/src/features/applications/{schemas.ts,types.ts} → one-line re-exports of @semakan/contract
apps/web/src/features/applications/rules.ts           REVIEW_ERROR_CODES now imported from the contract
```

---

### Task 1: Move the frontend to `apps/web` and make it a workspace

**Files:**
- Move (`git mv`) into `apps/web/`: `src`, `public`, `index.html`, `vite.config.ts`, `eslint.config.js`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`.
- Create: `apps/web/package.json`, `apps/web/src/features/about/source/repoPath.ts` and its test.
- Modify: root `package.json`, `vercel.json`, `.prettierignore`, `.github/workflows/ci.yml`, `apps/web/src/features/about/source/files.ts`, `apps/web/src/features/about/content/{practices,requirements,experience,architecture,overview,aiWorkflow}.ts` (paths only), `apps/web/src/features/about/content/integrity.test.ts`, and any about test that asserts a path.

**Interfaces:**
- `toRepoPath(key: string, importerDir: string): string` turns a glob key into a repo-root-relative path such as `apps/web/src/app/router.ts`.
  - `importerDir` is the importer's directory relative to the repo root, e.g. `apps/web/src/features/about/source`.
  - Resolve with `new URL(key, \`file:///repo/${importerDir}/\`).pathname`, then strip the leading `/repo/`.
- `loadSource(path)` takes a **repo-root-relative** path (`apps/web/src/...`, `docs/...`, `.github/...`).
- About content paths become repo-root-relative:
  - `src/…` → `apps/web/src/…`
  - `eslint.config.js`, `tsconfig.app.json`, `vite.config.ts`, `tailwind.config.ts` → `apps/web/<same>`
  - `vercel.json`, `AGENTS.md`, `docs/…`, `.github/…` → unchanged

- [ ] **Step 1: Write the failing `toRepoPath` test**

`apps/web/src/features/about/source/repoPath.test.ts`. Create the file after the move; see Step 3 for order.

```ts
import { toRepoPath } from './repoPath';

const HERE = 'apps/web/src/features/about/source';

describe('toRepoPath', () => {
  it('resolves keys that climb out of the importer to repo-root paths', () => {
    expect(toRepoPath('../../../../../../docs/a.md', HERE)).toBe('docs/a.md');
    expect(toRepoPath('../../../../../../AGENTS.md', HERE)).toBe('AGENTS.md');
    expect(toRepoPath('../../../app/router.ts', HERE)).toBe('apps/web/src/app/router.ts');
  });

  it('resolves keys inside the importer directory', () => {
    expect(toRepoPath('./files.ts', HERE)).toBe('apps/web/src/features/about/source/files.ts');
  });

  it('keeps dot-directories', () => {
    expect(toRepoPath('../../../../../../.github/workflows/ci.yml', HERE)).toBe(
      '.github/workflows/ci.yml',
    );
  });
});
```

- [ ] **Step 2: Move the files**

```bash
mkdir -p apps/web
git mv src public index.html vite.config.ts eslint.config.js tailwind.config.ts postcss.config.js tsconfig.json tsconfig.app.json tsconfig.node.json apps/web/
```

- [ ] **Step 3: Workspace `package.json` files**

`apps/web/package.json`: today's root `package.json` with these changes:
- `"name": "@semakan/web"`
- remove `"engines"`, `"overrides"` and the `format`/`format:check` scripts (those move to the root)
- `"check": "npm run typecheck && npm run lint && npm run coverage && npm run build"` (no format; the root runs it once)
- keep `"msw": { "workerDirectory": ["public"] }`
- keep all dependencies and devDependencies, except `prettier`, which moves to the root

Root `package.json`:

```json
{
  "name": "semakan",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=24.15" },
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev --workspace @semakan/web",
    "build": "npm run build --workspace @semakan/web",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "test:run": "npm run test:run --workspaces --if-present",
    "coverage": "npm run coverage --workspaces --if-present",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "npm run format:check && npm run check --workspaces --if-present"
  },
  "devDependencies": { "prettier": "3.9.9" },
  "overrides": { "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }
}
```

Then run `npm install`. The lockfile is regenerated with workspace entries, and the versions of all existing packages must stay the same: check with `git diff package-lock.json | grep '"version"' | head`. Only new workspace entries may appear.

- [ ] **Step 4: Root configs**

`vercel.json`:

```json
{
  "installCommand": "npm ci",
  "buildCommand": "npm run build --workspace @semakan/web",
  "outputDirectory": "apps/web/dist",
  "rewrites": [{ "source": "/((?!assets/|api/).*)", "destination": "/index.html" }]
}
```

`.prettierignore`:

```
**/dist
**/coverage
docs
apps/web/public/mockServiceWorker.js
package-lock.json
.superpowers
```

`.github/workflows/ci.yml`: replace the five `npm run …` steps with one step, `- run: npm run check`.

`apps/web/eslint.config.js`: `tsconfigRootDir: import.meta.dirname` and `project: './tsconfig.app.json'` already resolve inside `apps/web`, so no change should be needed. If `scripts` appears in its global ignores, remove that entry (scripts now live at the root). The root has no ESLint config, and `scripts/` stays unlinted as before.

- [ ] **Step 5: Repo-root paths in the about pages**

`apps/web/src/features/about/source/repoPath.ts`:

```ts
/**
 * `import.meta.glob` keys are relative to the importing file. The about pages talk about
 * repo-root paths (the same paths GitHub shows), so every key is resolved to one.
 */
export function toRepoPath(key: string, importerDir: string): string {
  return new URL(key, `file:///repo/${importerDir}/`).pathname.replace(/^\/repo\//, '');
}
```

`apps/web/src/features/about/source/files.ts`: this file is 6 directories deep, so the repo root is `../../../../../../`.

```ts
import { toRepoPath } from './repoPath';

/**
 * The page reads the real source, so excerpts can never drift from the code.
 * Lazy: each file becomes its own small chunk, loaded only when an excerpt needs it.
 * (A glob, not an import, so feature-boundary rules don't apply to it.)
 */
const globbed = import.meta.glob<string>(
  [
    '../../../**/*.{ts,tsx}',
    '../../../../eslint.config.js',
    '../../../../tsconfig.app.json',
    '../../../../vite.config.ts',
    '../../../../../../packages/contract/src/**/*.ts',
    '../../../../../../.github/workflows/ci.yml',
  ],
  { query: '?raw', import: 'default' },
);

const sources = new Map(
  Object.entries(globbed).map(([key, load]) => [
    toRepoPath(key, 'apps/web/src/features/about/source'),
    load,
  ]),
);

export function loadSource(path: string): Promise<string> {
  const load = sources.get(path);
  return load ? load() : Promise.reject(new Error(`Unknown source file: ${path}`));
}
```

`../../../**/*.{ts,tsx}` from `…/about/source` is `apps/web/src/**`. Check that the key for this file's own directory still resolves: `./files.ts` becomes `apps/web/src/features/about/source/files.ts`.

`apps/web/src/features/about/content/integrity.test.ts`: `content` is also 6 directories deep.

```ts
const globbed = import.meta.glob<string>(
  [
    '../../../../../../apps/web/**/*.{ts,tsx,js,json,css,html}',
    '../../../../../../packages/**/*.{ts,json}',
    '../../../../../../docs/**/*',
    '../../../../../../.github/**/*',
    '../../../../../../*.{md,json}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  { query: '?raw', import: 'default', eager: true },
);
const repoFiles = new Map(
  Object.entries(globbed).map(([key, text]) => [
    toRepoPath(key, 'apps/web/src/features/about/content'),
    text,
  ]),
);

function readFile(path: string): string | undefined {
  return repoFiles.get(path);
}
```

The folder check (the overview's folders) becomes: `[...repoFiles.keys()].some((k) => k.startsWith(`${path}/`))`. Import `toRepoPath` from `../source/repoPath`. Keep the rest of the test unchanged.

Content paths: in `practices.ts`, `requirements.ts`, `experience.ts`, `architecture.ts`, `overview.ts` and `aiWorkflow.ts`, rewrite every repo path as described in Interfaces:
- `src/` → `apps/web/src/`
- the four web config files → `apps/web/…`

Overview folders:
- `src/app`, `src/features/*`, `src/shared`, `src/mocks` → `apps/web/src/…`
- `docs` and `.github/workflows` unchanged
- keep every folder's text verbatim

Do not change any app-route `href` (such as `/applications`). Update any about test that asserts a literal repo path the same way.

- [ ] **Step 6: Run everything**

```bash
npx vitest run --root apps/web apps/web/src/features/about   # focused, incl. the new repoPath test
npm run check                                                  # root: format + web check
npm run dev -- --port 5174 --strictPort &                      # smoke: then curl -s localhost:5174 | grep -c '<div id="root">' ; kill %1
```

Expected:
- everything passes, with the same test count plus the new `repoPath` tests
- the build output is in `apps/web/dist`
- the dev server serves on 5174

Never use port 5173: the user's dev server runs there.

- [ ] **Step 7: Commit**

```bash
npm run format
git add -A
git status --short | grep -v '^R ' | head -40   # review: only expected new/modified files
git commit -m "Move the frontend to apps/web in an npm-workspaces monorepo"
```

---

### Task 2: Extract the API contract into `packages/contract`

**Files:**
- Create: `packages/contract/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts}`, `packages/contract/src/{applications.ts,types.ts,errors.ts,index.ts,errors.test.ts}`
- Move (`git mv`): `apps/web/src/features/applications/schemas.ts` → `packages/contract/src/applications.ts`, and `apps/web/src/features/applications/types.ts` → `packages/contract/src/types.ts`
- Create (as re-exports at the old paths): `apps/web/src/features/applications/schemas.ts`, `apps/web/src/features/applications/types.ts`
- Modify: `apps/web/src/features/applications/rules.ts`, `apps/web/package.json` (dependency on `@semakan/contract`), about content paths for the moved files

**Interfaces:**
- `@semakan/contract` exports:
  - everything that was in `schemas.ts` and `types.ts`
  - `REVIEW_ERROR_CODES`, `type ReviewErrorCode` and `isReviewErrorCode`, moved from `rules.ts`
- `apps/web/src/features/applications/schemas.ts` contains `export * from '@semakan/contract';`, and `types.ts` contains `export type * from '@semakan/contract';`. Every existing importer (17 files, plus mocks and tests) keeps working unchanged.
- `rules.ts` imports `REVIEW_ERROR_CODES`, `ReviewErrorCode` and `isReviewErrorCode` from `@semakan/contract` and re-exports them, so its importers (including `src/mocks/db/applications.ts`) are unchanged. `reviewErrorKey`, `REVIEWABLE_STATUSES`, `isReviewable` and `statusAfterDecision` stay in `rules.ts`: they are frontend or domain concerns, and the domain package comes in 6b.

- [ ] **Step 1: Failing test for the contract package**

`packages/contract/src/errors.test.ts`:

```ts
import { isReviewErrorCode, REVIEW_ERROR_CODES } from './errors';

describe('review error codes', () => {
  it('recognises every published code and nothing else', () => {
    for (const code of REVIEW_ERROR_CODES) expect(isReviewErrorCode(code)).toBe(true);
    expect(isReviewErrorCode('made_up')).toBe(false);
  });

  it('includes the codes the server sends', () => {
    expect(REVIEW_ERROR_CODES).toEqual(
      expect.arrayContaining(['missing_fire_certificate', 'not_reviewable', 'unknown']),
    );
  });
});
```

- [ ] **Step 2: Package scaffolding**

`packages/contract/package.json`:

```json
{
  "name": "@semakan/contract",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test:run": "vitest run",
    "coverage": "vitest run --coverage",
    "check": "npm run typecheck && npm run lint && npm run coverage"
  },
  "dependencies": { "zod": "4.6.5" }
}
```

Dev tools (typescript, eslint, vitest, typescript-eslint, @vitest/coverage-v8) come from the workspace root's hoisted `node_modules` through `apps/web`'s devDependencies. If `npm run check -w @semakan/contract` can't resolve one, add the **same exact version** to the contract's `devDependencies` and say so.

`packages/contract/tsconfig.json`: use the same strict options as `apps/web/tsconfig.app.json`, without DOM, JSX or `paths`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "ES2023.Array"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["vitest/globals"],
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "erasableSyntaxOnly": true
  },
  "include": ["src", "*.config.ts"]
}
```

`packages/contract/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/index.ts'],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
});
```

`packages/contract/eslint.config.js`:

```js
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['coverage', 'dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: { '@typescript-eslint/no-deprecated': 'error' },
  },
  { files: ['*.config.{js,ts}'], extends: [tseslint.configs.disableTypeChecked] },
]);
```

- [ ] **Step 3: Move the code**

```bash
git mv apps/web/src/features/applications/schemas.ts packages/contract/src/applications.ts
git mv apps/web/src/features/applications/types.ts packages/contract/src/types.ts
```

- In `packages/contract/src/types.ts`, change `from './schemas'` to `from './applications'`. The `#region practice:types-from-schemas` markers move with the file.
- `packages/contract/src/errors.ts`: move `REVIEW_ERROR_CODES`, `ReviewErrorCode` and `isReviewErrorCode` here verbatim from `rules.ts`, with their comments.
- `packages/contract/src/index.ts`:

```ts
export * from './applications';
export type * from './types';
export * from './errors';
```

Recreate the web files at their old paths:
- `apps/web/src/features/applications/schemas.ts`:

```ts
/** The API contract lives in `@semakan/contract`, shared with the backend. */
export * from '@semakan/contract';
```

- `apps/web/src/features/applications/types.ts`:

```ts
export type * from '@semakan/contract';
```

- `rules.ts`: `import { isReviewErrorCode, REVIEW_ERROR_CODES, type ReviewErrorCode } from '@semakan/contract';`, plus `export { isReviewErrorCode, REVIEW_ERROR_CODES, type ReviewErrorCode };`. Remove the moved declarations.

Add `"@semakan/contract": "0.1.0"` to `apps/web/package.json` dependencies, then run `npm install`.

**ESLint boundaries in web:** `@semakan/contract` is an external package, not a `src/` element, so the boundaries rule shouldn't flag it. If it does, add the smallest possible allowance for that package and explain it.

**About content paths:**
- The practice `types-from-schemas` source path becomes `packages/contract/src/types.ts`.
- Requirement and architecture links to `…/applications/schemas.ts` become `packages/contract/src/applications.ts`.
- Add an overview folder entry, `packages/contract`, with EN text *"The API contract: zod schemas and types shared by the frontend and the backend."* Write the MS yourself.
- `files.ts` already globs `packages/contract/src`. Integrity tests must stay green.

- [ ] **Step 4: Run everything**

```bash
npm run check -w @semakan/contract
npm run check          # root
```

Expected: everything passes. The web test count is unchanged, and the contract adds its own tests.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git commit -m "Extract the API contract into packages/contract"
```

---

### Task 3: Verify, pull request and deploy (controller)

- [ ] Restart the user's dev server on port 5173 from the repo root (`npm run dev -- --port 5173 --strictPort`, which now delegates to `apps/web`).
- [ ] Real-browser check:
  - `/about` loads, and all 20 excerpts load on the Practices page.
  - The fuel page and the applications list work.
  - The console shows no warnings.
  - The GitHub links now use `apps/web/...` paths (they resolve once merged).
- [ ] Push the branch and open a PR. CI must be green, and the Vercel preview must build with the new `vercel.json` and serve `/about`.
- [ ] Merge and deploy with `vercel --prod` from the root, after the user approves. Then smoke-check production.
