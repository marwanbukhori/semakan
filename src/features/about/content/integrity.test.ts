import { extractRegion } from '../source/regions';
import { PRACTICES } from './practices';

/**
 * Every path/region a content module points at must exist in the real repo, so the About pages
 * never link to or excerpt something that has drifted or was never there.
 */
const repoFiles = import.meta.glob<string>(
  ['/src/**/*', '/docs/**/*', '/.github/**/*', '/*.{js,ts,json}'],
  { query: '?raw', import: 'default', eager: true },
);

function readFile(path: string): string | undefined {
  return repoFiles[`/${path}`];
}

describe('content integrity', () => {
  describe.each(PRACTICES)('practice $id', (practice) => {
    it('points at a file that exists in the repo', () => {
      expect(readFile(practice.source.path)).toBeDefined();
    });

    it('points at a region the source file actually has', () => {
      const text = readFile(practice.source.path);
      expect(
        text === undefined ? null : extractRegion(text, practice.source.region),
      ).not.toBeNull();
    });
  });

  it('has a unique id for every practice', () => {
    const ids = PRACTICES.map((practice) => practice.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sets `plan` for every planned practice, or one that mentions a later plan', () => {
    for (const practice of PRACTICES) {
      const mentionsPlan = /plan(ned|s)?\b/i.test(
        `${practice.enforcedBy.en} ${practice.what.en} ${practice.why.en}`,
      );
      if (practice.status === 'planned' || mentionsPlan) {
        expect(practice.plan, `${practice.id} should have \`plan\` set`).toBeDefined();
      }
    }
  });
});
