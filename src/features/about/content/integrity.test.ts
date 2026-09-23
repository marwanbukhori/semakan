import { PROJECTS } from './experience';
import { REQUIREMENTS } from './requirements';
import { extractRegion } from '../source/regions';
import { PRACTICES } from './practices';

/**
 * Every path/region a content module points at must exist in the real repo, so the About pages
 * never link to or excerpt something that has drifted or was never there. Widened to `/*.{md,json,
 * ts,js}` at the repo root so evidence pointing at files such as `vercel.json`, `AGENTS.md` and
 * `tailwind.config.ts` is covered too.
 */
const repoFiles = import.meta.glob<string>(
  ['/src/**/*', '/docs/**/*', '/.github/**/*', '/*.{md,json,ts,js}'],
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

  const requirementLinks = REQUIREMENTS.flatMap((requirement) =>
    requirement.semakan.links.map((link) => ({ requirementId: requirement.id, path: link.path })),
  );
  it.each(requirementLinks)('requirement $requirementId: $path exists in the repo', ({ path }) => {
    expect(readFile(path)).toBeDefined();
  });

  it('has a unique id for every requirement', () => {
    const ids = REQUIREMENTS.map((requirement) => requirement.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // An app route (starts with `/`) is not a repo file; only a repo-path href needs to exist.
  const projectRepoHrefs = PROJECTS.flatMap((project) => {
    const facets = [project.frontend, project.backend].filter((facet) => facet !== undefined);
    const hrefs = facets.flatMap((facet) => facet.semakan?.map((link) => link.href) ?? []);
    return hrefs
      .filter((href) => !href.startsWith('/'))
      .map((href) => ({ projectId: project.id, href }));
  });
  it.each(projectRepoHrefs)('project $projectId: $href exists in the repo', ({ href }) => {
    expect(readFile(href)).toBeDefined();
  });
});
