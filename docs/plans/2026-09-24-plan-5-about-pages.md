# Plan 5: About Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five public, bilingual `/about` pages that explain Semakan for both the Frontend and the Backend interviews: Overview, Architecture, Practices (with live code excerpts), Experience (with a role switch and a requirements map), and AI workflow (linked to published review logs). `/` redirects to `/about`.

**Architecture:** A new `about` feature. Its content is typed data in `{ en, ms }` form, read through a `useLocalized()` hook. Code excerpts are read from the real source with a lazy `import.meta.glob(..., { query: '?raw' })` and cut by `#region practice:<id>` markers. Integrity tests use an eager glob of the repo to prove that every region and every linked path exists. The review ledgers for Plans 1–3 are published to `docs/process/`.

**Tech Stack:** As in Plans 1–3. No new dependencies.

**Spec:** `docs/specs/2026-09-24-about-pages-design.md` (addendum), and `docs/specs/2026-09-23-semakan-design.md` §5, §8 and §8a.

## Global Constraints

Everything in the Plan 1–3 Global Constraints still applies:
- MYDS per-component imports, and MYDS tokens only.
- React Router 8, `createRoutes()`, `void navigate`.
- TanStack Query v5.
- Every UI string through i18next, with `ms.ts` type-checked against `en.ts`.
- TDD; MSW as the only network mock; `npm run format` before every commit.

Also:

- The controller creates branch `plan-5-about` from `main`.
- **Truthfulness is a requirement.**
  - Content states only facts given in this plan (they come from the author's portfolio and the corrections the author approved on 2026-09-24).
  - Do not invent metrics, versions, dates or achievements. If a sentence needs a fact this plan does not give, leave it out and say so under Concerns.
- **Bilingual content.**
  - Long-form content is typed `Localized<T> = Record<'en' | 'ms', T>`. Short UI labels go in `en.ts`/`ms.ts`.
  - English text is given here and used verbatim.
  - You write the Malay: natural Bahasa Melayu in a formal government register, consistent with the existing `ms.ts`.
  - Keep product and technology names in English (React, TypeScript, NestJS, MYDS, SQS, CI/CD, "frontend" and "backend" when used as role names).
  - The author will correct the Malay after review.
- **Code excerpts.**
  - A region is marked with a line `// #region practice:<id>` and a line `// #endregion`. Use `#` instead of `//` in YAML.
  - Markers go around whole top-level declarations or blocks, never inside JSX.
  - Adding markers must not change any behaviour.
- **Evidence links** use `https://github.com/marwanbukhori/semakan/blob/main/<path>`. A code link carries `#L<start>-L<end>`, taken from the region.
- **Accessibility.** Each page has one `h1`; sections use `h2`/`h3`. The section navigation marks the current page with `aria-current`. Text stays at `txt-black-500` or darker: do not dim cards with opacity.
- **Do not change product behaviour.** The only exceptions are the redirect from `/` and the new header link.

---

## File Map

```
docs/process/
  README.md                                   NEW: what these logs are
  plan-1-review-log.md, plan-2-..., plan-3-...
scripts/publish-review-logs.mjs               NEW: ledger -> sanitised markdown
src/
  app/router.ts                               + /about routes, `/` -> /about
  app/AppLayout.tsx                           + "About this build" nav link
  shared/i18n/en.ts, ms.ts                    + app.nav.about, about.* labels
  features/about/
    localized.ts                              Localized<T>, useLocalized()
    source/regions.ts                         extractRegion()
    source/repo.ts                            REPO_URL, blobUrl(), commitUrl()
    source/files.ts                           loadSource() (lazy raw glob)
    source/keys.ts                            aboutKeys
    components/CodeExcerpt.tsx
    components/FolderTree.tsx
    components/PracticeStatus.tsx
    components/RoleSwitch.tsx
    components/ProjectCard.tsx
    components/RequirementsMap.tsx
    hooks/useRole.ts
    content/overview.ts
    content/architecture.ts
    content/practices.ts
    content/requirements.ts
    content/experience.ts
    content/aiWorkflow.ts
    content/integrity.test.ts                 every region and linked path exists
    routes/AboutLayout.tsx
    routes/OverviewRoute.tsx
    routes/ArchitectureRoute.tsx
    routes/PracticesRoute.tsx
    routes/ExperienceRoute.tsx
    routes/AiWorkflowRoute.tsx
+ `// #region practice:<id>` markers in about 20 existing source files (Task 4)
```

---

### Task 1: About layout, routes, redirect and localisation helpers

**Files:**
- Create: `src/features/about/localized.ts`, `src/features/about/routes/AboutLayout.tsx`, `src/features/about/routes/OverviewRoute.tsx` (placeholder: an `h1` only; Task 3 fills it in)
- Modify: `src/app/router.ts`, `src/app/AppLayout.tsx`, `src/shared/i18n/en.ts`, `src/shared/i18n/ms.ts`, `src/app/router.test.tsx`
- Test: `src/features/about/localized.test.tsx`, `src/features/about/routes/AboutLayout.test.tsx`, `src/app/router.test.tsx`

**Interfaces:**
- `type Localized<T> = Record<Language, T>`. `useLocalized()` returns `pick<T>(value: Localized<T>): T` for the current language (`ms` or `en`).
- Routes: `/about` (index: Overview), plus `architecture`, `practices`, `experience` and `ai-workflow`, all lazy and under `AboutLayout` with a route `ErrorBoundary`.
- `/` redirects to `/about`.
- The header gets a NavLink to `/about` with the label `app.nav.about`.

- [ ] **Step 1: Write the failing tests**

`src/features/about/localized.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react';
import { i18n } from '@/shared/i18n';
import { useLocalized } from './localized';

describe('useLocalized', () => {
  afterEach(() => void i18n.changeLanguage('en'));

  it('picks the value for the current language', async () => {
    const { result, rerender } = renderHook(() => useLocalized());
    expect(result.current({ en: 'Hello', ms: 'Helo' })).toBe('Hello');

    await act(() => i18n.changeLanguage('ms'));
    rerender();
    expect(result.current({ en: 'Hello', ms: 'Helo' })).toBe('Helo');
  });
});
```

`src/features/about/routes/AboutLayout.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import { renderRoutes } from '@/test/render';
import { Component as AboutLayout } from './AboutLayout';

const routes = [
  {
    path: '/about',
    Component: AboutLayout,
    children: [
      { index: true, element: <h1>Overview page</h1> },
      { path: 'practices', element: <h1>Practices page</h1> },
    ],
  },
];

describe('AboutLayout', () => {
  it('links every about section and marks the current one', async () => {
    renderRoutes(routes, { initialEntries: ['/about/practices'] });

    const nav = await screen.findByRole('navigation', { name: 'About this build' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Overview',
      'Architecture',
      'Practices',
      'Experience',
      'AI workflow',
    ]);
    expect(within(nav).getByRole('link', { name: 'Practices' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { level: 1, name: 'Practices page' })).toBeInTheDocument();
  });
});
```

In `src/app/router.test.tsx`, change the existing redirect test so `/` now lands on `/about`, with the about layout's navigation shown. Leave every other test alone, except those that relied on `/` going to `/applications`: point those at `/applications` directly.

```tsx
it('redirects / to the about pages', async () => {
  const { router } = renderRoutes(createRoutes(), { initialEntries: ['/'] });
  expect(await screen.findByRole('navigation', { name: 'About this build' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/about');
});

it('links to the about pages from the header', async () => {
  const { user, router } = renderRoutes(createRoutes(), { initialEntries: ['/applications'] });
  await user.click(await screen.findByRole('link', { name: 'About this build' }));
  expect(router.state.location.pathname).toBe('/about');
});
```

The first test finds the section navigation by name. The header link has the same text but is a link, not a navigation landmark, so the role query tells them apart.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/about src/app/router.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/features/about/localized.ts`:

```ts
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@/shared/i18n';

/** Long-form content in both languages; missing one is a type error. */
export type Localized<T> = Record<Language, T>;

export function useLocalized() {
  const { i18n } = useTranslation();
  const language: Language = i18n.language === 'ms' ? 'ms' : 'en';
  return useCallback(<T,>(value: Localized<T>): T => value[language], [language]);
}
```

(`.ts` files don't need the `<T,>` comma. Use `<T>` if lint or format prefers it.)

`src/features/about/routes/AboutLayout.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';

const SECTIONS = [
  { to: '/about', key: 'overview', end: true },
  { to: '/about/architecture', key: 'architecture', end: false },
  { to: '/about/practices', key: 'practices', end: false },
  { to: '/about/experience', key: 'experience', end: false },
  { to: '/about/ai-workflow', key: 'aiWorkflow', end: false },
] as const;

export function Component() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8">
      <nav aria-label={t('about.nav.label')} className="overflow-x-auto border-b border-otl-divider">
        <ul className="flex gap-1 whitespace-nowrap">
          {SECTIONS.map((section) => (
            <li key={section.key}>
              <NavLink
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  `inline-block border-b-2 px-3 py-2 text-body-sm font-medium ${
                    isActive
                      ? 'border-otl-primary-300 text-txt-primary'
                      : 'border-transparent text-txt-black-700 hover:text-txt-black-900'
                  }`
                }
              >
                {t(`about.nav.${section.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
```

`src/features/about/routes/OverviewRoute.tsx` (placeholder):

```tsx
import { useTranslation } from 'react-i18next';

export function Component() {
  const { t } = useTranslation();
  return <h1 className="font-heading text-heading-xs font-semibold">{t('about.nav.overview')}</h1>;
}
```

`src/app/router.ts`:
- Change the index route's redirect to `redirect('/about')`.
- Add a sibling of `applications`:

```ts
        {
          path: 'about',
          ErrorBoundary: RouteError,
          lazy: {
            Component: async () => (await import('@/features/about/routes/AboutLayout')).Component,
          },
          children: [
            { index: true, lazy: { Component: async () => (await import('@/features/about/routes/OverviewRoute')).Component } },
            { path: 'architecture', lazy: { Component: async () => (await import('@/features/about/routes/ArchitectureRoute')).Component } },
            { path: 'practices', lazy: { Component: async () => (await import('@/features/about/routes/PracticesRoute')).Component } },
            { path: 'experience', lazy: { Component: async () => (await import('@/features/about/routes/ExperienceRoute')).Component } },
            { path: 'ai-workflow', lazy: { Component: async () => (await import('@/features/about/routes/AiWorkflowRoute')).Component } },
          ],
        },
```

Architecture, Practices, Experience and AI workflow routes don't exist yet. Create each as a placeholder in this task, like `OverviewRoute` (an `h1` with its `about.nav.*` label), so the build and typecheck pass. Tasks 3–7 replace them.

`src/app/AppLayout.tsx`: add a third `NavLink` to `/about`, labelled `t('app.nav.about')`, after Fuel prices, with the same classes.

Strings:

`en.ts`: add `about: 'About this build'` to `app.nav`, and a top-level

```ts
  about: {
    nav: {
      label: 'About this build',
      overview: 'Overview',
      architecture: 'Architecture',
      practices: 'Practices',
      experience: 'Experience',
      aiWorkflow: 'AI workflow',
    },
  },
```

`ms.ts`: add `about: 'Tentang binaan ini'` to `app.nav`, and

```ts
  about: {
    nav: {
      label: 'Tentang binaan ini',
      overview: 'Gambaran keseluruhan',
      architecture: 'Seni bina',
      practices: 'Amalan',
      experience: 'Pengalaman',
      aiWorkflow: 'Aliran kerja AI',
    },
  },
```

- [ ] **Step 4: Run all tests and the full check**

Run: `npm run test:run`, then `npm run typecheck && npm run lint`
Expected: PASS. Each about route must be its own lazy chunk.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src
git commit -m "Add the about section layout, routes and a redirect from /"
```

---

### Task 2: Source excerpts from the real code

**Files:**
- Create: `src/features/about/source/regions.ts`, `source/repo.ts`, `source/files.ts`, `source/keys.ts`, `src/features/about/components/CodeExcerpt.tsx`
- Modify: `src/shared/i18n/en.ts`, `src/shared/i18n/ms.ts`
- Test: `src/features/about/source/regions.test.ts`, `source/repo.test.ts`, `src/features/about/components/CodeExcerpt.test.tsx`

**Interfaces:**
- `extractRegion(text: string, id: string): { code: string; startLine: number; endLine: number } | null`. It finds `// #region practice:<id>` (or `# #region practice:<id>`) up to the next `#endregion`.
  - `code` is the body, dedented, with any nested region marker lines removed.
  - `startLine`/`endLine` are the 1-based lines of the first and last body line.
- `REPO_URL = 'https://github.com/marwanbukhori/semakan'`
- `blobUrl(path, lines?)` returns `${REPO_URL}/blob/main/${path}` plus `#L<s>-L<e>` when `lines` is given.
- `commitUrl(sha)` returns `${REPO_URL}/commit/${sha}`.
- `loadSource(path): Promise<string>` reads the file's text through a lazy raw glob over `/src/**/*.{ts,tsx}`, `/eslint.config.js`, `/tsconfig.app.json`, `/vite.config.ts` and `/.github/workflows/ci.yml`. An unknown path rejects.
- `aboutKeys.source(path)`
- `CodeExcerpt({ path, region })`: a `<figure>` whose caption shows the path and a GitHub link to exactly the region's lines, over a scrollable `<pre><code>`. It shows a loading text, and an alert if the region is missing.

- [ ] **Step 1: Write the failing tests**

`src/features/about/source/regions.test.ts`:

```ts
import { extractRegion } from './regions';

const text = [
  'import x from "y";',
  '',
  '// #region practice:first',
  '  export function a() {',
  '    return 1;',
  '  }',
  '// #endregion',
  '# #region practice:yaml',
  'jobs:',
  '  check: true',
  '# #endregion',
].join('\n');

describe('extractRegion', () => {
  it('returns the dedented body and its 1-based line range', () => {
    expect(extractRegion(text, 'first')).toEqual({
      code: 'export function a() {\n  return 1;\n}',
      startLine: 4,
      endLine: 6,
    });
  });

  it('understands # comments for YAML', () => {
    expect(extractRegion(text, 'yaml')?.code).toBe('jobs:\n  check: true');
  });

  it('returns null for a missing region or a region that never ends', () => {
    expect(extractRegion(text, 'nope')).toBeNull();
    expect(extractRegion('// #region practice:open\nconst a = 1;', 'open')).toBeNull();
  });

  it('does not match a region whose id only starts the same', () => {
    expect(extractRegion('// #region practice:firstly\nx\n// #endregion', 'first')).toBeNull();
  });

  it('drops marker lines of other regions nested inside', () => {
    const nested = '// #region practice:outer\na\n// #region practice:inner\nb\n// #endregion\n// #endregion';
    expect(extractRegion(nested, 'outer')?.code).toBe('a\nb');
  });
});
```

The nested case: the first `#endregion` after `outer` closes `inner`, so the outer body ends early. Keep regions **unnested** in the source. The test pins that nested markers are dropped from whatever body is returned. With the input above, the result for `outer` must be `'a\nb'`, which means the implementation must skip `#endregion` lines that close an inner region. Do that by counting depth.

`src/features/about/source/repo.test.ts`:

```ts
import { blobUrl, commitUrl } from './repo';

it('builds GitHub links to files, line ranges and commits', () => {
  expect(blobUrl('src/shared/api/client.ts')).toBe(
    'https://github.com/marwanbukhori/semakan/blob/main/src/shared/api/client.ts',
  );
  expect(blobUrl('src/shared/api/client.ts', { startLine: 10, endLine: 24 })).toBe(
    'https://github.com/marwanbukhori/semakan/blob/main/src/shared/api/client.ts#L10-L24',
  );
  expect(commitUrl('66e3cd7')).toBe('https://github.com/marwanbukhori/semakan/commit/66e3cd7');
});
```

`src/features/about/components/CodeExcerpt.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { createWrapper } from '@/test/render';
import { CodeExcerpt } from './CodeExcerpt';

describe('CodeExcerpt', () => {
  it('shows a real excerpt with a link to its exact lines on GitHub', async () => {
    const { Wrapper } = createWrapper();
    render(<CodeExcerpt path="src/shared/lib/assertNever.ts" region="test-fixture" />, { wrapper: Wrapper });

    expect(await screen.findByText(/export function assertNever/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /View on GitHub/ });
    expect(link.getAttribute('href')).toMatch(
      /^https:\/\/github\.com\/marwanbukhori\/semakan\/blob\/main\/src\/shared\/lib\/assertNever\.ts#L\d+-L\d+$/,
    );
  });

  it('says so when the region is missing', async () => {
    const { Wrapper } = createWrapper();
    render(<CodeExcerpt path="src/shared/lib/assertNever.ts" region="does-not-exist" />, { wrapper: Wrapper });
    expect(await screen.findByRole('alert')).toHaveTextContent("This excerpt couldn't be found in the source.");
  });
});
```

For the first test, add a region `test-fixture` around the `assertNever` function in `src/shared/lib/assertNever.ts`. Task 4 renames that region to `exhaustive-switch`, and this test should then use the new name.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/about`
Expected: FAIL.

- [ ] **Step 3: Implement**

`source/regions.ts`:

```ts
export type SourceRegion = { code: string; startLine: number; endLine: number };

const OPEN = /^\s*(?:\/\/|#)\s*#region\s+practice:([\w-]+)\s*$/;
const CLOSE = /^\s*(?:\/\/|#)\s*#endregion\b/;

/** Cut a named `#region practice:<id>` out of a source file. */
export function extractRegion(text: string, id: string): SourceRegion | null {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => OPEN.exec(line)?.[1] === id);
  if (start < 0) return null;

  const body: string[] = [];
  let depth = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (OPEN.test(line)) {
      depth += 1;
      continue;
    }
    if (CLOSE.test(line)) {
      if (depth === 0) return finish(body, start + 2, i);
      depth -= 1;
      continue;
    }
    body.push(line);
  }
  return null;
}

function finish(body: string[], startLine: number, endLine: number): SourceRegion {
  const indents = body.filter((line) => line.trim() !== '').map((line) => /^\s*/.exec(line)![0].length);
  const cut = indents.length > 0 ? Math.min(...indents) : 0;
  return { code: body.map((line) => line.slice(cut)).join('\n'), startLine, endLine };
}
```

`startLine` is the file line just after the marker, `start + 2` in 1-based terms. `endLine` is the line before the closing marker; in 1-based terms that is `i`. Check both against the test.

`source/repo.ts`:

```ts
export const REPO_URL = 'https://github.com/marwanbukhori/semakan';

export function blobUrl(path: string, lines?: { startLine: number; endLine: number }): string {
  return `${REPO_URL}/blob/main/${path}${lines ? `#L${lines.startLine}-L${lines.endLine}` : ''}`;
}

export function commitUrl(sha: string): string {
  return `${REPO_URL}/commit/${sha}`;
}
```

`source/files.ts`:

```ts
/**
 * The page reads the real source, so excerpts can never drift from the code.
 * Lazy: each file becomes its own small chunk, loaded only when an excerpt needs it.
 * (A glob, not an import, so feature-boundary rules don't apply to it.)
 */
const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '/eslint.config.js', '/tsconfig.app.json', '/vite.config.ts', '/.github/workflows/ci.yml'],
  { query: '?raw', import: 'default' },
);

export function loadSource(path: string): Promise<string> {
  const load = sources[`/${path}`];
  return load ? load() : Promise.reject(new Error(`Unknown source file: ${path}`));
}
```

Check that `/.github/workflows/ci.yml` is matched even though it is in a dot folder. If Vite's glob skips it, drop it from the list and say so; no practice needs the YAML file.

`source/keys.ts`:

```ts
export const aboutKeys = {
  all: ['about'] as const,
  source: (path: string) => [...aboutKeys.all, 'source', path] as const,
};
```

`components/CodeExcerpt.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { aboutKeys } from '../source/keys';
import { loadSource } from '../source/files';
import { extractRegion } from '../source/regions';
import { blobUrl } from '../source/repo';

export function CodeExcerpt({ path, region }: { path: string; region: string }) {
  const { t } = useTranslation();
  const { data, isPending } = useQuery({
    queryKey: aboutKeys.source(path),
    queryFn: () => loadSource(path),
    staleTime: Infinity,
  });
  const excerpt = data === undefined ? null : extractRegion(data, region);

  return (
    <figure className="overflow-hidden rounded-md border border-otl-divider">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-otl-divider bg-bg-washed px-3 py-2 text-body-xs">
        <code className="text-txt-black-700">{path}</code>
        <a href={blobUrl(path, excerpt ?? undefined)} className="font-medium text-txt-primary underline underline-offset-2">
          {excerpt
            ? t('about.code.viewLines', { start: excerpt.startLine, end: excerpt.endLine })
            : t('about.code.view')}
        </a>
      </figcaption>
      <ExcerptBody isPending={isPending} code={excerpt?.code} />
    </figure>
  );
}

function ExcerptBody({ isPending, code }: { isPending: boolean; code: string | undefined }) {
  const { t } = useTranslation();
  if (isPending) return <p className="p-3 text-body-sm text-txt-black-500">{t('about.code.loading')}</p>;
  if (code === undefined) {
    return (
      <p role="alert" className="p-3 text-body-sm text-txt-danger">
        {t('about.code.missing')}
      </p>
    );
  }
  return (
    // A scrollable region must be reachable by keyboard (axe: scrollable-region-focusable).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <pre tabIndex={0} className="overflow-x-auto p-3 text-body-xs leading-relaxed focus-visible:outline-none focus-visible:ring focus-visible:ring-fr-primary">
      <code>{code}</code>
    </pre>
  );
}
```

`blobUrl(path, excerpt ?? undefined)`: `excerpt` has `startLine` and `endLine`, so it satisfies the parameter type. If TypeScript objects to the extra `code` property, pass `{ startLine, endLine }` explicitly.

Strings. `en.ts`, under `about`:

```ts
    code: {
      loading: 'Loading code…',
      view: 'View on GitHub',
      viewLines: 'View on GitHub (lines {{start}}–{{end}})',
      missing: "This excerpt couldn't be found in the source.",
    },
```

`ms.ts`:

```ts
    code: {
      loading: 'Memuatkan kod…',
      view: 'Lihat di GitHub',
      viewLines: 'Lihat di GitHub (baris {{start}}–{{end}})',
      missing: 'Petikan ini tidak ditemui dalam kod sumber.',
    },
```

- [ ] **Step 4: Run all tests, typecheck and lint**

Run: `npm run test:run && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src
git commit -m "Show code excerpts read from the real source with links to their lines"
```

---

### Task 3: Overview and Architecture pages

**Files:**
- Create: `src/features/about/content/overview.ts`, `content/architecture.ts`, `components/FolderTree.tsx`
- Modify: `routes/OverviewRoute.tsx`, `routes/ArchitectureRoute.tsx`, `en.ts`, `ms.ts`
- Test: `routes/OverviewRoute.test.tsx`, `routes/ArchitectureRoute.test.tsx`

**Interfaces:**
- `overview` content: `{ title, intro: string[], stack: string[] (not localised), tour: { label, href }[], folders: { path, text }[] }`, with localised fields as `Localized<...>`.
- `FolderTree({ folders })`: a list of native `<details>/<summary>`, keyboard-operable for free. Each summary shows the folder path in `<code>`; the body shows the text and a "View on GitHub" link (`blobUrl` of the folder, `…/tree/main/<path>`). Add `treeUrl(path)` to `source/repo.ts` for folders.
- `architecture` content:
  - `layers: { name, text, paths: string[] }[]`
  - `trace: { title, text, path, region? }[]`
  - a `diagramLabel` (the text alternative)
- The page shows:
  - the layers as a vertical flow of boxes with arrows (HTML/CSS), inside a `<figure>` whose `<figcaption>` is the text alternative
  - the trace as an ordered list, with a file link per step and a `CodeExcerpt` where a `region` is given (regions are added in Task 4; in this task only link the files)

**English content (verbatim):**

Overview:
- Title: "About this build"
- Intro:
  1. "Semakan is a demo of a government web application. Council officers review business premises licence applications, and anyone can check weekly fuel prices published on data.gov.my."
  2. "I built it to show how I work: typed contracts at every boundary, accessible components from the Malaysia Government Design System (MYDS), tests that describe behaviour, and an AI-assisted workflow in which every task is reviewed before the next one starts."
  3. "It is the demo for two interviews, Frontend Engineer and Backend Developer. The backend service comes next, built against the same API contract the frontend already uses."
- CI badge: an image link, `https://github.com/marwanbukhori/semakan/actions/workflows/ci.yml/badge.svg` with alt text "CI status", linking to `https://github.com/marwanbukhori/semakan/actions/workflows/ci.yml`; plus links to the live app (`https://semakan-plum.vercel.app`) and the repo.
- Stack: React 19, TypeScript, Vite, React Router, TanStack Query, zod, react-hook-form, MYDS + Tailwind CSS, i18next (BM/EN), MSW, Vitest + Testing Library, GitHub Actions, Vercel
- Tour (label, href):
  - "Licence applications" → `/applications`
  - "A review decision (dialog)" → `/applications/app-001/review`
  - "Fuel prices from data.gov.my" → `/open-data/fuel-prices`
  - "Source code on GitHub" → `https://github.com/marwanbukhori/semakan`
- Tour note: "Open the Dev Panel (bottom right) to slow the API down, force errors or empty results, or switch data.gov.my between live and recorded data."
- Folders:
  - `src/app`: "The shell: routes, layout, providers, error boundaries, and the Dev Panel that controls the mock API."
  - `src/features/applications`: "Licence applications: list, detail and the review dialog. Schemas, queries, mutations, hooks and components live together."
  - `src/features/open-data`: "Fuel prices from the real data.gov.my API: the contract, the client, URL filters and the SVG chart."
  - `src/features/about`: "These pages. Content is typed data in both languages; code excerpts are read from the real source."
  - `src/shared`: "Code any feature may use: the validated API client, ApiError, i18n, formatting, hooks and shared UI."
  - `src/mocks`: "The mock API (MSW): seeded data, the review rules the 'server' enforces, and the data.gov.my switch."
  - `docs`: "The specs, the implementation plans and the published review logs."
  - `.github/workflows`: "CI: typecheck, lint, format, tests with coverage and the production build."

Architecture:
- Title: "Architecture"
- Intro: "Each layer has one job, and the lint rules stop features from reaching into each other."
- Layers:
  1. "Routes" — "Read the URL, call hooks, compose components. Every page is loaded lazily." — `src/app/router.ts`, `src/features/applications/routes/ListRoute.tsx`
  2. "Feature hooks" — "Queries, mutations and URL state. Components never fetch on their own." — `src/features/applications/api/queries.ts`, `src/features/applications/api/mutations.ts`, `src/features/applications/hooks/useApplicationFilters.ts`
  3. "API client and contract" — "Every response is parsed with a zod schema; a failure becomes a typed ApiError with a kind the UI can switch on." — `src/shared/api/client.ts`, `src/shared/api/ApiError.ts`, `src/features/applications/schemas.ts`
  4. "Network" — "The app's own API is mocked with MSW, in tests and in production. data.gov.my is called for real." — `src/mocks/handlers/applications.ts`, `src/mocks/handlers/dataGov.ts`
- Diagram text alternative: "Four layers, top to bottom: routes call feature hooks; hooks call the API client; the client sends requests to the network layer, either the MSW mock API or data.gov.my, and validates every response on the way back."
- Trace title: "One request, end to end: an officer records a decision"
  1. "The form validates first" — "react-hook-form checks the decision against the same zod schema the server uses." — `src/features/applications/components/ReviewForm.tsx`
  2. "The screen updates immediately" — "The mutation changes the status in the detail and in every cached list page before the server answers." — `src/features/applications/api/mutations.ts`
  3. "The request is validated both ways" — "apiClient posts the decision and parses the reply against ApplicationDetailSchema." — `src/shared/api/client.ts`
  4. "The server applies its rules" — "The mock server checks the version (409 on a conflict) and rules the UI does not know, such as the fire safety certificate (422 with an error code)." — `src/mocks/db/applications.ts`
  5. "The UI settles" — "Success replaces the cache; a failure rolls it back; 422 codes land on the right field; a 409 shows the conflict banner and keeps what the officer typed." — `src/features/applications/routes/ReviewRoute.tsx`

**Tests** (write them first):

`OverviewRoute.test.tsx`:
- The page has `h1` "About this build", the three intro paragraphs, every stack item, and the tour links with the correct hrefs.
- Folder tree: each folder is a `group`-free `<details>`, so query by summary text. Clicking `src/mocks` reveals its text; pressing Enter on a focused summary toggles it (native behaviour, checked with `user.keyboard`).
- In Malay (`i18n.changeLanguage('ms')` in the test, restored in `afterEach`), the `h1` is the Malay title and no English intro sentence is present.

`ArchitectureRoute.test.tsx`:
- The `figure` is named by its caption: `getByRole('figure', { name: /Four layers/ })`.
- There are four layer headings in order.
- The trace is an ordered list of 5 items, each with a GitHub link to its file.

- [ ] Steps: write the failing tests → see them fail → add `treeUrl` (plus a test in `repo.test.ts`) → write the content files (EN verbatim, MS translated) → implement `FolderTree` and the two routes → run the tests → `npm run test:run && npm run typecheck && npm run lint` → `npm run format` → commit as `Add the overview and architecture pages`.

---

### Task 4: Region markers and the practices content

**Files:**
- Modify: about 20 source files (markers only), `src/features/about/components/CodeExcerpt.test.tsx` (rename `test-fixture` to `exhaustive-switch`, see below)
- Create: `src/features/about/content/practices.ts`, `src/features/about/content/integrity.test.ts`

**Interfaces:**
- `type PracticeStatus = 'enforced' | 'partial' | 'planned'`
- `type Practice = { id: string; title: Localized<string>; what: Localized<string>; why: Localized<string>; enforcedBy: Localized<string>; status: PracticeStatus; plan?: number; source: { path: string; region: string } }`
- `PRACTICES: readonly Practice[]` (20 entries)
- `integrity.test.ts` loads every repo file eagerly with `import.meta.glob(['/src/**/*', '/docs/**/*', '/.github/**/*', '/*.{js,ts,json}'], { query: '?raw', import: 'default', eager: true })`. It asserts, for every practice, that the file exists and `extractRegion` finds the region. Tasks 5–7 extend it to experience, requirement and AI-workflow evidence paths.

**Add these regions.** Put each marker pair around the named declaration or block; markers only, no code changes.

| id | file | around |
|---|---|---|
| `strict-typescript` | `tsconfig.app.json` | the `strict` and `noUnchecked…` / `noUnused…` options |
| `exhaustive-switch` | `src/features/applications/components/Timeline.tsx` | `function TimelineEntry` |
| `types-from-schemas` | `src/features/applications/types.ts` | the exported types |
| `composition` | `src/features/applications/routes/ListRoute.tsx` | the `<ApplicationTable … emptyState={…} />` usage. Markers can't go inside JSX, so wrap the whole `Component` function instead. |
| `thin-routes` | `src/features/open-data/routes/FuelPricesRoute.tsx` | `export function Component` |
| `derive-dont-sync` | `src/features/applications/hooks/useApplicationFilters.ts` | `export function useApplicationFilters` |
| `stable-keys` | `src/features/applications/components/ApplicationTable.tsx` | the function that maps rows (by `item.id`) |
| `measured-memo` | `src/features/open-data/components/FuelPriceChart.tsx` | the `geometry` `useMemo` |
| `validate-at-boundary` | `src/shared/api/client.ts` | `async function request` |
| `query-keys` | `src/features/applications/api/keys.ts` | `applicationKeys` |
| `url-state` | `src/features/open-data/hooks/useFuelFilters.ts` | `toSearchParams` |
| `async-states` | `src/features/open-data/routes/FuelPricesRoute.tsx` | not possible inside the component; wrap `export function Component` in `thin-routes` only, and for this id use `src/shared/ui/LoadError.tsx` (`export function LoadError`) |
| `semantic-forms` | `src/features/applications/components/ReviewForm.tsx` | `function TextField` |
| `keyboard` | `src/features/open-data/components/FuelPriceChart.tsx` | `function onKeyDown` |
| `test-behaviour` | `src/features/applications/routes/ReviewRoute.test.tsx` | the test that asserts the inert background and the focus trap |
| `feature-boundaries` | `eslint.config.js` | the `'boundaries/dependencies'` rule block |
| `code-splitting` | `vite.config.ts` | the `codeSplitting` groups |
| `typed-translations` | `src/shared/i18n/en.ts` | the `Widen` / `Translation` types |
| `optimistic-rollback` | `src/features/applications/api/mutations.ts` | the `onMutate` and `onError` options (wrap the whole `useReviewApplication` function if markers inside the object literal break formatting) |
| `accessible-chart` | `src/features/open-data/components/FuelPriceChart.tsx` | wrap the top-level `visibleValues` helper, or the smallest top-level declaration that holds the text-alternative logic. Say which you chose. |

After moving the Task 2 fixture: the `CodeExcerpt` test uses `exhaustive-switch` in `Timeline.tsx`, and the `test-fixture` markers in `assertNever.ts` are removed.

**`PRACTICES` content: English, verbatim** (write the Malay yourself):

1. `strict-typescript`: status **enforced**.
   - **Title:** Strict TypeScript, no `any`
   - **What:** Strict mode with unchecked index access, plus a lint error for `any`.
   - **Why:** Values that might be missing must be handled before use.
   - **Enforced by:** The TypeScript compiler and typescript-eslint, in CI.
2. `exhaustive-switch`: status **enforced**.
   - **Title:** Discriminated unions, handled exhaustively
   - **What:** Timeline events and review decisions are unions on one field, and every `switch` ends in `assertNever`.
   - **Why:** Adding a new kind without handling it everywhere becomes a compile error, not a blank screen.
   - **Enforced by:** The compiler, through `assertNever(value: never)`.
3. `types-from-schemas`: status **enforced**.
   - **Title:** Types come from the contract
   - **What:** Types are inferred from zod schemas, never written twice.
   - **Why:** The runtime check and the type can't disagree.
   - **Enforced by:** `z.infer` and the type check in CI.
4. `composition`: status **partial**.
   - **Title:** Composition over configuration
   - **What:** Components take content, not flags: the table receives its empty state as an element.
   - **Why:** Fewer boolean props means fewer combinations to test and fewer surprises.
   - **Enforced by:** Code review. Storybook stories for each state are planned.
   - Plan: **4**.
5. `thin-routes`: status **partial**.
   - **Title:** Thin routes, logic in hooks
   - **What:** A route reads the URL, calls hooks and composes components.
   - **Why:** Logic in hooks can be tested without rendering a page.
   - **Enforced by:** Folder conventions, and the boundaries lint rule for imports. The route size itself is checked in review.
6. `derive-dont-sync`: status **partial**.
   - **Title:** Derive state, don't copy it
   - **What:** Filters are parsed from the URL on every render instead of being copied into component state.
   - **Why:** One source of truth: back, forward and shared links just work.
   - **Enforced by:** react-hooks lint (React Compiler rules) and review.
7. `stable-keys`: status **partial**.
   - **Title:** Stable keys for lists
   - **What:** List items are keyed by their id, not their position.
   - **Why:** Sorting or filtering must not mix up the state of rows.
   - **Enforced by:** Code review. No lint rule enforces it yet.
8. `measured-memo`: status **partial**.
   - **Title:** Memoise where it pays
   - **What:** The chart memoises its geometry because hovering re-renders it on every pointer move; the rest of the app does not memoise by default.
   - **Why:** Memoisation has a cost; it earns its place only where renders are frequent.
   - **Enforced by:** Review. No profiler measurements are recorded yet.
9. `validate-at-boundary`: status **enforced**.
   - **Title:** Validate every response at the boundary
   - **What:** The API client requires a schema for every call; a mismatch is logged and becomes an ApiError of kind 'schema'.
   - **Why:** Bad data fails loudly at the edge instead of deep in the UI.
   - **Enforced by:** The client's function signature, so a call without a schema does not compile.
10. `query-keys`: status **enforced**.
    - **Title:** One query-key factory per feature
    - **What:** Keys are built in one place and nested (all → lists → one list).
    - **Why:** One invalidation reaches every page of a list, and keys never collide.
    - **Enforced by:** Unit tests on the key factory.
11. `url-state`: status **enforced**.
    - **Title:** The URL is the state for filters
    - **What:** Filters, sorting, pages, ranges and visible fuels live in the URL, parsed with zod and without default values.
    - **Why:** Any view can be shared or bookmarked, and Back works as expected.
    - **Enforced by:** Integration tests on the list and fuel pages.
12. `async-states`: status **partial**.
    - **Title:** Every async view has all four states
    - **What:** Loading, empty, error (with a message per error kind) and success, and a dimmed frame while refetching.
    - **Why:** Real networks are slow and fail; the Dev Panel shows every state live.
    - **Enforced by:** Integration tests for each state. A Storybook story per state is planned.
    - Plan: **4**.
13. `semantic-forms`: status **partial**.
    - **Title:** Semantic, labelled, linked
    - **What:** Every field has a label; errors are linked with aria-describedby and marked with aria-invalid; focus moves to the first invalid field.
    - **Why:** Screen-reader users hear what went wrong and where.
    - **Enforced by:** jsx-a11y lint and tests by role and label. Automated axe checks are planned.
    - Plan: **4**.
14. `keyboard`: status **partial**.
    - **Title:** Everything works from the keyboard
    - **What:** The review dialog traps focus and returns it on close; the chart can be read week by week with arrow keys.
    - **Why:** Many officers use the keyboard, and some can't use a mouse at all.
    - **Enforced by:** Component tests for focus and keys. End-to-end keyboard journeys are planned.
    - Plan: **4**.
15. `test-behaviour`: status **enforced**.
    - **Title:** Tests describe behaviour
    - **What:** Tests query by role and label and assert what a user can see; the network is mocked only at the HTTP layer.
    - **Why:** Tests survive refactors and double as accessibility checks.
    - **Enforced by:** Conventions in AGENTS.md, and a coverage threshold in CI.
16. `feature-boundaries`: status **enforced**.
    - **Title:** Features don't import each other
    - **What:** A feature may import only itself and shared code.
    - **Why:** Features stay independent and can be changed or removed safely.
    - **Enforced by:** eslint-plugin-boundaries, in CI.
17. `code-splitting`: status **partial**.
    - **Title:** Split by route and by vendor
    - **What:** Every page is a lazy chunk, and framework code is split into cacheable vendor chunks.
    - **Why:** The first page loads only what it needs.
    - **Enforced by:** Lazy routes and build configuration. The build's chunk-size warning is visible in CI but does not fail it yet.
18. `typed-translations`: status **partial**.
    - **Title:** No hardcoded text, in two languages
    - **What:** All UI text goes through i18next, and the Malay file must have exactly the English file's keys.
    - **Why:** A missing translation is caught by the compiler, not by a user.
    - **Enforced by:** The type checker, for key parity. No lint rule catches literal text in JSX yet.
19. `optimistic-rollback`: status **enforced**.
    - **Title:** Optimistic updates that roll back
    - **What:** A decision shows immediately in the detail and in every cached list page, and is restored exactly if the server refuses.
    - **Why:** The interface feels instant without lying when a request fails.
    - **Enforced by:** Mutation tests for both success and rollback.
20. `accessible-chart`: status **partial**.
    - **Title:** Charts people can read without seeing them
    - **What:** A text summary, a keyboard readout, a full data table, and a colour palette validated for colour blindness and contrast in both themes.
    - **Why:** A chart is only one way into the data.
    - **Enforced by:** Component tests for the summary, the readout and the table. The palette was validated with a checking script. Automated axe checks are planned.
    - Plan: **4**.

**Tests** (write first): `integrity.test.ts` must fail before the markers exist and pass after. Also check the ids are unique, and that every `planned` item, or any item mentioning a later plan, has `plan` set.

- [ ] Steps: failing integrity test → add markers → content (EN verbatim, MS translated) → tests pass → `npm run test:run && npm run typecheck && npm run lint` → format → commit as `Mark practice regions in the source and add the practices content`.

---

### Task 5: The practices page

**Files:**
- Create: `components/PracticeStatus.tsx`, `routes/PracticesRoute.tsx` (replaces the placeholder)
- Modify: `en.ts`, `ms.ts`
- Test: `routes/PracticesRoute.test.tsx`, `components/PracticeStatus.test.tsx`

**Interfaces:**
- `PracticeStatus({ status, plan })`: a MYDS `Tag`:
  - enforced: `success`
  - partial: `warning`
  - planned: `default`
  - text such as "Enforced", "Partial", or "Planned · Plan 4". The status is always in words, never colour alone.
- The page contains:
  - `h1` "Practices"
  - an intro: "Each practice shows where it lives in the code and what keeps it true. Partial and planned items say so."
  - a summary line with the counts, e.g. "9 enforced · 10 partial · 1 planned", computed from the content
  - one `article` per practice, labelled by its `h2`, with the status, a `dl` (What / Why / Enforced by), and a `CodeExcerpt`

**Strings:**
- `about.practices`:
  - `title` "Practices"
  - `intro` (above)
  - `summary` "{{enforced}} enforced · {{partial}} partial · {{planned}} planned"
  - `what` "What"
  - `why` "Why"
  - `enforcedBy` "Enforced by"
- `about.status`:
  - `enforced` "Enforced"
  - `partial` "Partial"
  - `planned` "Planned"
  - `plan` "Plan {{plan}}"

MS: translate them.

**Tests:**
- 20 articles, and the summary counts match `PRACTICES`.
- The "Validate every response at the boundary" article shows an excerpt containing `schema.safeParse` and a link to `src/shared/api/client.ts#L…`.
- A partial item with a plan shows "Partial" and "Plan 4". Word it as a regex in case of a separator.
- In Malay, the `h1` and the status words are Malay.

- [ ] Steps: failing tests → implement → pass → full test/typecheck/lint → format → commit as `Add the practices page with live code excerpts`.

---

### Task 6: Experience page with role switch and requirements map

**Files:**
- Create: `content/requirements.ts`, `content/experience.ts`, `hooks/useRole.ts`, `components/RoleSwitch.tsx`, `components/ProjectCard.tsx`, `components/RequirementsMap.tsx`, `routes/ExperienceRoute.tsx`
- Modify: `en.ts`, `ms.ts`, `content/integrity.test.ts` (Semakan evidence paths exist)
- Test: `hooks/useRole.test.tsx`, `routes/ExperienceRoute.test.tsx`

**Interfaces:**
- `type Role = 'frontend' | 'backend'`. `useRole()` returns `{ role, setRole }`. The role comes from `?role=` with the fallback `frontend`, and the default value is kept out of the URL (`replace: true`).
- `REQUIREMENTS`: an `as const` array of `{ id, role, level: 'must' | 'nice', label: Localized<string>, semakan: { status: 'shown' | 'partial' | 'planned'; plan?: number; links: { label: Localized<string>; path: string }[] } }`. `type RequirementId = (typeof REQUIREMENTS)[number]['id']`.
- `PROJECTS: readonly Project[]`, where:
  - `Project = { id, name: Localized<string>, org: Localized<string>, period: string, stack: string[], frontend?: Facet, backend?: Facet }`
  - `Facet = { built: Localized<string[]>, challenge?: Localized<string>, semakan?: { label: Localized<string>; href: string }[], requirements: RequirementId[] }`
- `RoleSwitch`: a `fieldset` and `legend` ("Show my experience for") with a MYDS `Radio` group of two options.
- `ProjectCard({ project, role })`:
  - an `article` with `id="project-<id>"`, labelled by its `h3`
  - the active role's facet comes first
  - a missing facet shows "No {{role}} work on this project." in normal text colour. The spec's "dimmed, not hidden" is met with a dashed border and `bg-bg-washed`, never opacity.
  - each facet has `h4` "Frontend" or "Backend", the built items as a list, the challenge, "In Semakan" links, and the requirement tags (MYDS `Tag`, text only)
- Cards are ordered by whether they have a facet for the active role; the content order is kept within each group.
- `RequirementsMap({ role })`: a MYDS table captioned "Requirements for the {{role}} role".
  - Columns: Requirement, Level (Must-have / Nice to have), Past work (links to `#project-<id>` for projects tagging it, in either facet), In Semakan (status plus links, or "Planned · Plan {{n}}").

**Requirements (English labels verbatim).**

*Frontend* (`fe-*`):

| id | level | label |
|---|---|---|
| `fe-production` | must | Built and shipped production frontend applications |
| `fe-ts-react` | must | TypeScript and a component framework (React, Vue, Angular) |
| `fe-architecture` | must | Component architecture, state management and data fetching |
| `fe-api-states` | must | API integration with loading, error and edge-case handling |
| `fe-responsive` | must | HTML, CSS and responsive design |
| `fe-quality` | must | Code quality, testing and maintainable UI |
| `fe-collaboration` | must | Working closely with designers and backend engineers |
| `fe-design-system` | nice | Design systems and component libraries |
| `fe-mobile` | nice | Mobile development |
| `fe-performance` | nice | Frontend performance: code splitting, caching, rendering |
| `fe-a11y` | nice | Accessibility: semantic HTML and ARIA |
| `fe-e2e` | nice | End-to-end testing (Playwright) |
| `fe-observability` | nice | Frontend observability |
| `fe-product` | nice | UX and product thinking |

*Backend* (`be-*`):

| id | level | label |
|---|---|---|
| `be-typed-services` | must | Backend services in a statically typed language (Go, TypeScript or Python) |
| `be-event-driven` | must | Asynchronous and event-driven systems |
| `be-quality` | must | Code quality, testing and long-term maintainability |
| `be-oncall` | must | On-call and production issues, handled together |
| `be-api-design` | nice | Designing scalable APIs (REST, GraphQL) |
| `be-microservices` | nice | Microservices and event-driven architecture |
| `be-ddd` | nice | Domain-driven design |
| `be-database` | nice | Database design and optimisation (SQL, NoSQL) |
| `be-performance` | nice | Performance: caching, concurrency, load handling |
| `be-testing` | nice | Automated testing: unit, integration, end-to-end |
| `be-observability` | nice | Observability: monitoring, logging, tracing |
| `be-cloud` | nice | Cloud infrastructure and deployment |
| `be-cicd` | nice | CI/CD and DevOps practices |
| `be-security` | nice | Security: authentication, authorisation, data protection |
| `be-system-design` | nice | System design and product thinking |

**Semakan evidence per requirement:** `status`, then link labels and paths. EN labels are verbatim.

Frontend:
- `fe-production`: shown.
  - "The live app": `vercel.json`
  - "CI": `.github/workflows/ci.yml`
- `fe-ts-react`: shown.
  - "The applications feature": `src/features/applications/routes/ListRoute.tsx`
- `fe-architecture`: shown.
  - "Query hooks": `src/features/applications/api/queries.ts`
  - "URL state": `src/features/applications/hooks/useApplicationFilters.ts`
- `fe-api-states`: shown.
  - "Review errors and conflicts": `src/features/applications/routes/ReviewRoute.tsx`
  - "Load errors": `src/shared/ui/LoadError.tsx`
- `fe-responsive`: shown.
  - "Stacked facts on mobile": `src/features/applications/components/ApplicationFacts.tsx`
- `fe-quality`: shown.
  - "AGENTS.md conventions": `AGENTS.md`
  - "Mutation tests": `src/features/applications/api/mutations.test.tsx`
- `fe-collaboration`: partial.
  - "The API contract both sides build to": `src/features/applications/schemas.ts`
- `fe-design-system`: partial, plan **4**.
  - "Built on MYDS": `tailwind.config.ts`
  - "Own components on MYDS": `src/features/applications/components/StatusBadge.tsx`
- `fe-mobile`: partial.
  - "Checked at 360px": `src/features/open-data/components/FuelPriceChart.tsx`
- `fe-performance`: shown.
  - "Vendor chunks": `vite.config.ts`
  - "Lazy routes": `src/app/router.ts`
- `fe-a11y`: shown.
  - "Accessible review form": `src/features/applications/components/ReviewForm.tsx`
  - "Accessible chart": `src/features/open-data/components/FuelPriceChart.tsx`
- `fe-e2e`: planned, plan **4**, no links.
- `fe-observability`: planned, plan **6**, no links.
- `fe-product`: partial.
  - "The Dev Panel": `src/app/dev-panel/DevPanel.tsx`

Backend:
- `be-typed-services`: planned, plan **6**.
- `be-event-driven`: planned, plan **6**.
- `be-quality`: partial, plan **6**.
  - "Tests and CI": `.github/workflows/ci.yml`
- `be-oncall`: planned, plan **6**.
- `be-api-design`: partial, plan **6**.
  - "The REST contract": `src/features/applications/schemas.ts`
  - "The mock handlers": `src/mocks/handlers/applications.ts`
- `be-microservices`: planned, plan **6**.
- `be-ddd`: partial, plan **6**.
  - "Review rules in one place": `src/mocks/db/applications.ts`
- `be-database`: planned, plan **6**.
- `be-performance`: partial, plan **6**.
  - "Caching until the next data update": `src/features/open-data/api/queries.ts`
- `be-testing`: partial, plan **6**.
  - "Handler tests": `src/mocks/handlers/applications.test.ts`
- `be-observability`: planned, plan **6**.
- `be-cloud`: partial, plan **6**.
  - "Vercel deploy": `vercel.json`
- `be-cicd`: shown.
  - "CI pipeline": `.github/workflows/ci.yml`
- `be-security`: planned, plan **6**.
- `be-system-design`: partial, plan **6**.
  - "Design spec": `docs/specs/2026-09-23-semakan-design.md`

The integrity test must include root files such as `vercel.json`, `AGENTS.md` and `tailwind.config.ts`. Make sure its glob covers them.

**Projects (English verbatim).** Only these facts may be used:

1. `eis`: **E-Invoice System (EIS)**
   - Org: Silentmode Sdn. Bhd. · Period: Aug 2024 – Feb 2026
   - Stack: Vue, PrimeVue, NestJS, AWS SQS, ECS, Lambda, DynamoDB
   - **frontend**
     - Built:
       - "The entire frontend, in Vue with the PrimeVue component library."
     - Requirements: `fe-production`, `fe-ts-react`, `fe-api-states`, `fe-design-system`
     - Semakan: "Async states you can force live", `/applications`
   - **backend**
     - Built:
       - "Built from scratch for RONPOS: an e-invoicing system for fuel retail and end users."
       - "Event-driven on AWS: SQS, ECS, Lambda and DynamoDB, with CQRS and domain-driven design."
       - "The e-invoice submission module, from creation to LHDN API integration, using message-queue patterns."
       - "Support tickets, hotfixes and production deployments for Hub and EIS."
     - Challenge: "Submissions to LHDN travel through a queue, so the system is built from events rather than request and response."
     - Requirements: `be-typed-services`, `be-event-driven`, `be-microservices`, `be-ddd`, `be-cloud`, `be-oncall`, `be-api-design`
2. `verus-virtus-site`: **Verus Virtus company site**
   - Org: Verus Virtus Sdn. Bhd. · Period: May – Aug 2026
   - Stack: Next.js, React, Tailwind CSS, Vercel
   - **frontend**
     - Built:
       - "Designed and built the public site as the company's first software engineer."
       - "One page with anchored sections, so the whole pitch reads in a single scroll and any part can be linked."
       - "Motion in CSS only: no animation library, a fast page and a short dependency list."
     - Challenge: "Most of the client work is under NDA, so the site has to build credibility without showing the work."
     - Requirements: `fe-production`, `fe-ts-react`, `fe-responsive`, `fe-performance`, `fe-product`
     - Semakan: "Route and vendor code splitting", `/about/practices`
3. `rembayung`: **Rembayung booking queue**
   - Org: Personal project · Period: 2026
   - Stack: Angular, Java, Spring Boot, Oracle, Redis, OpenShift, Ansible, GitHub Actions, k6, Splunk, Dynatrace
   - **frontend**
     - Built:
       - "An Angular console that reads the drop, pods, quota and autoscalers live, and can start a load run itself."
     - Requirements: `fe-ts-react`, `fe-api-states`, `fe-observability`
     - Semakan: "Failure modes you can simulate", `/about/architecture`
   - **backend**
     - Built:
       - "A queue gate that admits arrivals at a fixed rate, so the crowd is metered before it reaches the database."
       - "Bookings take a pessimistic row lock per slot, and an Oracle CHECK constraint makes overselling impossible."
       - "Load is shed with deliberate 503s instead of collapsing; k6 runs inside the cluster under the same quota."
       - "Ansible deploys with automatic rollback; Splunk for logs and Dynatrace for traces."
       - "203 tests across three services, run against a real Oracle database in Testcontainers."
     - Challenge: "A booking night that crashed at around three thousand attempts and sold the same table twice: two different failures with two different fixes."
     - Requirements: `be-typed-services`, `be-database`, `be-performance`, `be-testing`, `be-observability`, `be-cloud`, `be-cicd`, `be-microservices`
4. `cloudbos`: **CloudBOS reporting**
   - Org: Terato Tech (outsourced to Silentmode) · Period: Feb 2023 – Aug 2024
   - Stack: Laravel, Vue
   - **frontend**
     - Built:
       - "Vue components inside a Laravel monolith for reporting features used at fuel stations."
     - Requirements: `fe-production`, `fe-ts-react`
     - Semakan: "Tables that scroll on small screens", `/open-data/fuel-prices`
   - **backend**
     - Built:
       - "Reporting features such as fuel totalizer and sales movement reports, used across 1,000+ Petronas, Shell and BHPetrol stations."
       - "An Electronic Shelf Label system with dynamic PDF and Excel generation."
       - "Planogram generation with adjustable width, height and user-defined parameters."
     - Requirements: `be-api-design`, `be-database`
5. `ron95`: **RON95 subsidy and POS features**
   - Org: Silentmode Sdn. Bhd. · Period: Aug 2024 – Feb 2026
   - Stack: NestJS, TypeScript, MongoDB, Jest, Docker
   - **backend**
     - Built:
       - "RON95 subsidy transactions and payment processing for a POS system, integrated with the CDB team."
       - "About 800,000 subsidy transactions a day across fuel stations nationwide."
       - "Domain-driven design and test-driven development with Jest."
       - "Virtual loyalty points in the receipt module, and MyDebit card support with the Invenco team."
     - Challenge: "A nationwide subsidy flow where every transaction has to be right, at a scale of hundreds of thousands a day."
     - Requirements: `be-typed-services`, `be-ddd`, `be-testing`, `be-quality`, `be-performance`, `be-oncall`
     - Semakan: "The BUDI95 price on the fuel chart", `/open-data/fuel-prices`
6. `geomotion`: **Security hardening**
   - Org: Geomotion (Malaysia) Sdn. Bhd. · Period: Feb – Apr 2026
   - Stack: GitLab CI, Grype, GitLab SAST, pip-audit
   - **backend**
     - Built:
       - "Security hardening across six microservice repositories after audit findings: API rate limiting, WAF rules and stronger HTTP security headers."
       - "Content Security Policy and Subresource Integrity for the web applications."
       - "Automated scanning in every CI/CD stage: Grype, GitLab SAST and pip-audit."
     - Requirements: `be-security`, `be-cicd`, `be-microservices`
7. `python`: **Python services**
   - Org: Personal projects · Period: 2026
   - Stack: Python, LangGraph, LangChain, FastMCP, Ollama, Docker
   - **backend**
     - Built:
       - "A retrieval service over my resume: a LangGraph graph behind a FastMCP server and a plain POST /api/chat endpoint."
       - "A local recipe agent with tool calling and a separate vision step, running on local models."
     - Requirements: `be-typed-services`, `be-api-design`

**Strings** in `about.experience`:

| key | English |
|---|---|
| `title` | Experience |
| `intro` | The same projects, seen through each role's requirements. Switch the role to reorder the page. |
| `roleLegend` | Show my experience for |
| `roles.frontend` | Frontend role |
| `roles.backend` | Backend role |
| `facet.frontend` | Frontend |
| `facet.backend` | Backend |
| `built` | What I built |
| `challenge` | The hard part |
| `inSemakan` | In Semakan |
| `requirements` | Requirements met |
| `noFacet` | No {{role}} work on this project. |
| `mapTitle` | Requirements map |
| `mapCaption` | Requirements for the {{role}} role |
| `col.requirement` | Requirement |
| `col.level` | Level |
| `col.past` | Past work |
| `col.semakan` | In Semakan |
| `level.must` | Must-have |
| `level.nice` | Nice to have |
| `semakanStatus.shown` | Shown |
| `semakanStatus.partial` | Partly shown |
| `semakanStatus.planned` | Planned · Plan {{plan}} |

`noFacet` interpolates the translated role word ("frontend" / "backend" in EN; in MS keep "frontend" / "backend").

**Tests:**
- `useRole`: the default is frontend with a clean URL; choosing backend writes `?role=backend`; a tampered value falls back to frontend.
- The page, frontend role:
  - the `h1`, and the radio "Frontend role" is checked
  - the first card is EIS, and its first `h4` is "Frontend"
  - the Rembayung card exists
  - the map caption says frontend and has 14 rows
  - `fe-e2e` shows "Planned · Plan 4"
- Switch to backend with the keyboard (arrow key on the radio group):
  - the URL has `?role=backend`
  - the map has 15 rows
  - the Verus Virtus card (no backend facet) says "No backend work on this project." and appears after the cards that have backend facets
- Past-work links go to `#project-<id>` anchors that exist on the page.
- In Malay, the headings are Malay.
- The integrity test covers every `semakan.links[].path` (repo paths) and every card `href` that is a repo path. App-route hrefs such as `/applications` are not repo files: skip anything starting with `/` that is not a file.

- [ ] Steps: failing tests → content and components → pass → full test/typecheck/lint → format → commit as `Add the experience page with a role switch and a requirements map`.

---

### Task 7: Published review logs and the AI workflow page

**Files:**
- Create: `scripts/publish-review-logs.mjs`, `docs/process/README.md`, `docs/process/plan-1-review-log.md`, `plan-2-…`, `plan-3-…`, `src/features/about/content/aiWorkflow.ts`, `routes/AiWorkflowRoute.tsx` (replaces the placeholder)
- Modify: `en.ts`, `ms.ts`, `content/integrity.test.ts` (log paths exist)
- Test: `routes/AiWorkflowRoute.test.tsx`

**Step A: publish the logs**

`scripts/publish-review-logs.mjs` (plain Node ESM, no dependencies):
- **Input:** each `.superpowers/sdd/<plan-dir>/progress.md`
  - `2026-09-23-plan-1-foundation-and-list` → plan 1
  - `2026-09-23-plan-2-detail-and-review` → plan 2
  - `2026-09-24-plan-3-open-data-fuel-prices` → plan 3
- **Output:** `docs/process/plan-<n>-review-log.md`, with a short header: "Review log for Plan N (<plan title>). Published from the build ledger; agent IDs and local paths removed."
- **Removals:**
  - agent IDs: any 17-character lowercase hex token, and the phrases "implementer <id>" and "agentId" around them. Remove the ID and tidy the surrounding punctuation.
  - absolute paths `/Users/<user>/semakan/` become repo-relative.
  - any `/private/tmp/...` path becomes `<scratch>`.
- Run it once and commit the generated files.
- **Verify:** `grep -E "[0-9a-f]{17}|/Users/|/private/tmp" docs/process/*.md` returns nothing. Read each file once to make sure it is still readable.

`docs/process/README.md`: two short paragraphs on what these logs are:
- the controller's ledger from subagent-driven development: tasks, reviews, fix rounds and rulings with their cost if wrong
- how to read a ruling

**Step B: count the numbers**

Count from the three published logs, then show the counts and the commands in your report:
- **tasks completed:** lines matching `^\s*Task \d+: complete` (one ledger indents a line)
- **fix rounds:** lines matching `fix round \d+/5 \(` plus lines containing `Final fix wave: done`
- **rulings:** lines containing `Ruling`

Put these totals, per plan and overall, in `aiWorkflow.ts`.

**Step C: page content (English verbatim)**
- **Title:** "AI workflow"
- **Intro:** "I used AI to build Semakan the way I would run a small team: nothing is written before it is specified, nothing merges before it is reviewed, and every judgement call is written down with its cost if wrong. The logs below are the real record."
- **Pipeline** (ordered, with title and text):
  1. "Brainstorm": "Questions one at a time until the decisions are made; alternatives compared with a recommendation." Link: `docs/specs/2026-09-23-semakan-design.md`
  2. "Specify": "A written design, approved before any code."
  3. "Verify before planning": "Throwaway spikes and live API probes check real library and API behaviour instead of trusting memory. For example, MYDS needs Tailwind 3, and data.gov.my redirects without a trailing slash."
  4. "Plan": "Every task gets exact files, interfaces, tests and code." Link: `docs/plans/2026-09-24-plan-3-open-data-fuel-prices.md`
  5. "Build, test first": "A fresh agent per task writes the failing test, then the code."
  6. "Review every task": "A separate reviewer checks each task against the plan. Findings are fixed in rounds, and every conflict gets a written ruling with its cost if wrong."
  7. "Final review": "The strongest model reviews the whole branch; one fix wave; a scoped re-review."
  8. "Verify for real": "The full check, a pass in a real browser, CI, then merge and deploy with my approval."
- **Tools:**
  - "Claude Code": "The agent in my terminal."
  - "Superpowers skills": "brainstorming, writing-plans, subagent-driven-development and finishing-a-development-branch: the process above, written as instructions the agent follows."
  - "Data-visualisation skill": "Chart rules, and a palette validator for colour blindness and contrast in both themes."
  - "Playwright MCP": "Drives real Chromium to check layout, focus and the live API."
  - "GitHub and Vercel CLIs": "Pull requests, CI and deploys, always after my approval."
  - "Model tiers": "A fast model for transcription tasks, a standard one for most work, and the strongest for the chart, the final reviews and the fix waves."
- **Ownership** (two columns):
  - "What I own": "Requirements and scope", "Architecture and trade-offs", "Every ruling on a conflict", "Approving what merges and deploys", "Accountability for the result"
  - "What the AI does": "Drafts code and tests from a written plan", "Reads library sources to confirm behaviour", "Reviews each task against the plan", "Checks the app in a real browser", "Runs the checks and the pipeline"
- **Caught by review** (title, text, links):
  1. "A quiet API swap": "A fast model replaced z.iso.datetime() with the deprecated z.string().datetime() without saying so. The task review caught it; the fix also switched on a lint rule for deprecated APIs." Links: log `docs/process/plan-1-review-log.md`, commit `f435834`
  2. "A test passed by weakening the product": "To make two tests pass, an agent turned off the review dialog's modal behaviour, removing the focus trap. I overruled it: the dialog stays modal, and the tests now assert that the page behind it is inert." Links: `docs/process/plan-2-review-log.md`, commit `66e3cd7`
  3. "My own plan, contradicting itself": "The plan's code kept fuels in palette order, but its test expected URL order. The implementer resolved it the wrong way; the ruling restored the order and fixed the test." Links: `docs/process/plan-3-review-log.md`, commit `9dcbba0`
  4. "A bug inside the design system": "The MYDS Select copied an uncontrolled open prop into state, which React reported as switching from controlled to uncontrolled. Found by reading the library source; fixed by controlling open ourselves, with a regression test." Links: `docs/process/plan-1-review-log.md`, commit `16a386d`
  5. "Framework behaviour, confirmed from the source": "React Router 8 gives setSearchParams(fn) the parameters from the last render, not the last write, so two quick toggles lost one. A pending-write ref fixed it, with a test." Links: `docs/process/plan-3-review-log.md`, commit `8bfba78`
  6. "What only a real browser shows": "A clipped chart label, a tooltip off the edge of a phone screen, overlapping axis labels, and focus lost after closing the dialog: found by driving the app in Chromium, then fixed with tests." Links: `docs/process/plan-2-review-log.md`, `docs/process/plan-3-review-log.md`
  7. "A date parser that could throw": "'2026-13-01 00:00' threw an error instead of failing validation, and '2026-02-30' quietly became 1 March. Both are now validation issues." Links: `docs/process/plan-3-review-log.md`, commit `c90b75e`
- **Numbers:** the Step B counts, labelled "Tasks completed", "Fix rounds", "Rulings recorded", per plan and in total.
- **Logs:** links to the three published logs and `docs/process/README.md`.

Before relying on a commit, confirm it exists with `git cat-file -t <sha>`. If a sha doesn't exist, leave that link out and report it.

**Strings** in `about.aiWorkflow`: `title`, `pipeline` "How it was built", `tools` "Tools", `ownership` "Who does what", `own` "What I own", `ai` "What the AI does", `caught` "Caught by review", `numbers` "By the numbers", `logs` "Read the logs", `viewLog` "Review log", `viewCommit` "Commit {{sha}}", `tasks` "Tasks completed", `fixRounds` "Fix rounds", `rulings` "Rulings recorded", `plan` "Plan {{n}}", `total` "Total". MS: translate them.

**Tests:**
- The `h1`; 8 pipeline steps in an ordered list; the ownership table with two column headers.
- 7 incidents, each with at least one link; the commit links point to `https://github.com/marwanbukhori/semakan/commit/<sha>`.
- The number cells match the content.
- In Malay, the `h1` is Malay.
- The integrity test: every `docs/process` path and pipeline link path exists.

- [ ] Steps: A → B → failing tests → content and page → pass → full test/typecheck/lint → format → commit as `Publish the review logs and add the AI workflow page`. The logs and the page can be two commits.

---

### Task 8: Browser check, pull request and deploy (controller)

- [ ] Real Chromium on the dev server:
  - `/` lands on `/about`.
  - The sub-navigation works, with `aria-current` on the current page.
  - Every page in EN and MS.
  - Code excerpts load and their GitHub line links open the right lines.
  - The folder tree works by keyboard.
  - The role switch reorders the cards, and the URL keeps the role.
  - The requirements map at 360px scrolls inside its wrapper, with no page overflow.
  - Dark mode.
  - No console warnings.
- [ ] The author reviews the Malay text and the experience facts on the running app (ask them).
- [ ] Push, PR, CI; then merge and redeploy after the user approves.
