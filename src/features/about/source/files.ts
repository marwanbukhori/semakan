/**
 * The page reads the real source, so excerpts can never drift from the code.
 * Lazy: each file becomes its own small chunk, loaded only when an excerpt needs it.
 * (A glob, not an import, so feature-boundary rules don't apply to it.)
 */
const sources = import.meta.glob<string>(
  [
    '/src/**/*.{ts,tsx}',
    '/eslint.config.js',
    '/tsconfig.app.json',
    '/vite.config.ts',
    '/.github/workflows/ci.yml',
  ],
  { query: '?raw', import: 'default' },
);

export function loadSource(path: string): Promise<string> {
  const load = sources[`/${path}`];
  return load ? load() : Promise.reject(new Error(`Unknown source file: ${path}`));
}
