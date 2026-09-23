export const REPO_URL = 'https://github.com/marwanbukhori/semakan';

export function blobUrl(path: string, lines?: { startLine: number; endLine: number }): string {
  return `${REPO_URL}/blob/main/${path}${lines ? `#L${lines.startLine}-L${lines.endLine}` : ''}`;
}

export function commitUrl(sha: string): string {
  return `${REPO_URL}/commit/${sha}`;
}
