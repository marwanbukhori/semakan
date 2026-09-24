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
