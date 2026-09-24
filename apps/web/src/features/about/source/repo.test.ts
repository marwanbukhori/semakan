import { blobUrl, commitUrl, treeUrl } from './repo';

it('builds GitHub links to files, line ranges and commits', () => {
  expect(blobUrl('apps/web/src/shared/api/client.ts')).toBe(
    'https://github.com/marwanbukhori/semakan/blob/main/apps/web/src/shared/api/client.ts',
  );
  expect(blobUrl('apps/web/src/shared/api/client.ts', { startLine: 10, endLine: 24 })).toBe(
    'https://github.com/marwanbukhori/semakan/blob/main/apps/web/src/shared/api/client.ts#L10-L24',
  );
  expect(commitUrl('66e3cd7')).toBe('https://github.com/marwanbukhori/semakan/commit/66e3cd7');
});

it('builds a GitHub link to a folder', () => {
  expect(treeUrl('apps/web/src/features/about')).toBe(
    'https://github.com/marwanbukhori/semakan/tree/main/apps/web/src/features/about',
  );
});
