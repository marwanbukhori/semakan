/**
 * `import.meta.glob` keys are relative to the importing file. The about pages talk about
 * repo-root paths (the same paths GitHub shows), so every key is resolved to one.
 */
export function toRepoPath(key: string, importerDir: string): string {
  return new URL(key, `file:///repo/${importerDir}/`).pathname.replace(/^\/repo\//, '');
}
