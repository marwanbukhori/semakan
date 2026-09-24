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
