import { PROJECTS } from './experience';
import { REQUIREMENTS } from './requirements';
import { extractRegion } from '../source/regions';
import { PRACTICES } from './practices';
import { aiWorkflow, REVIEW_LOG_PATHS, REVIEW_LOG_README_PATH } from './aiWorkflow';
import { architecture } from './architecture';
import { overview } from './overview';
import { toRepoPath } from '../source/repoPath';

/**
 * Every path/region a content module points at must exist in the real repo, so the About pages
 * never link to or excerpt something that has drifted or was never there. Paths are repo-root
 * relative (the same paths GitHub shows), so the glob reaches the whole repo — including root
 * files such as `vercel.json` and `AGENTS.md` — and every key is resolved to a repo-root path.
 */
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

describe('content integrity', () => {
  it('resolves glob keys to repo-root paths', () => {
    expect(repoFiles.has('apps/web/src/app/router.ts')).toBe(true);
    expect(repoFiles.has('docs/specs/2026-09-24-semakan-api-design.md')).toBe(true);
    expect(repoFiles.has('.github/workflows/ci.yml')).toBe(true);
    expect(repoFiles.has('AGENTS.md')).toBe(true);
  });

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

  const docsProcessPaths = [...Object.values(REVIEW_LOG_PATHS), REVIEW_LOG_README_PATH];
  it.each(docsProcessPaths)('docs/process path %s exists in the repo', (path) => {
    expect(readFile(path)).toBeDefined();
  });

  const pipelineLinkPaths = aiWorkflow.pipeline
    .map((step) => step.path)
    .filter((path): path is string => path !== undefined);
  it.each(pipelineLinkPaths)('pipeline link %s exists in the repo', (path) => {
    expect(readFile(path)).toBeDefined();
  });

  const layerPaths = architecture.layers.flatMap((layer) => layer.paths);
  it.each(layerPaths)('architecture layer path %s exists in the repo', (path) => {
    expect(readFile(path)).toBeDefined();
  });

  it.each(architecture.trace.steps)('architecture trace step $path exists in the repo', (step) => {
    expect(readFile(step.path)).toBeDefined();
  });

  const traceRegions = architecture.trace.steps.filter(
    (step): step is typeof step & { region: string } => step.region !== undefined,
  );
  it.each(traceRegions)('architecture trace step $path has region $region', (step) => {
    const text = readFile(step.path);
    expect(text === undefined ? null : extractRegion(text, step.region)).not.toBeNull();
  });

  // A folder is a directory, so it exists when some repo file sits under it.
  it.each(overview.folders)('overview folder $path exists in the repo', ({ path }) => {
    expect([...repoFiles.keys()].some((k) => k.startsWith(`${path}/`))).toBe(true);
  });
});
