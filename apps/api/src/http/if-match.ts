const IF_MATCH = /^(?:W\/"(\d+)"|"(\d+)"|(\d+))$/;

/**
 * Reads the version from an If-Match header. Accepts a strong (`"3"`) or weak
 * (`W/"3"`) entity tag, or a bare number (`3`), since the ETag is the version.
 */
export function parseIfMatch(header: string | undefined): number | 'missing' | 'invalid' {
  const value = header?.trim();
  if (!value) return 'missing';
  const match = IF_MATCH.exec(value);
  if (!match) return 'invalid';
  const version = Number(match[1] ?? match[2] ?? match[3]);
  return Number.isSafeInteger(version) ? version : 'invalid';
}
