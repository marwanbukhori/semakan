export type SourceRegion = { code: string; startLine: number; endLine: number };

const OPEN = /^\s*(?:\/\/|#)\s*#region\s+practice:([\w-]+)\s*$/;
const CLOSE = /^\s*(?:\/\/|#)\s*#endregion\b/;

/** Cut a named `#region practice:<id>` out of a source file. */
export function extractRegion(text: string, id: string): SourceRegion | null {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => OPEN.exec(line)?.[1] === id);
  if (start < 0) return null;

  const body: string[] = [];
  // Track the 1-based file line of the first/last BODY line actually pushed, rather than
  // deriving it from the marker or closing-line positions: dropped nested-marker lines can sit
  // between the marker and the first body line, or between the last body line and the close.
  let firstBodyLine = 0;
  let lastBodyLine = 0;
  let depth = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (OPEN.test(line)) {
      depth += 1;
      continue;
    }
    if (CLOSE.test(line)) {
      if (depth === 0) {
        // Empty body: no body line was ever pushed, so fall back to the line just after the
        // marker, with endLine one before it (startLine > endLine signals an empty range).
        const startLine = body.length > 0 ? firstBodyLine : start + 2;
        const endLine = body.length > 0 ? lastBodyLine : startLine - 1;
        return finish(body, startLine, endLine);
      }
      depth -= 1;
      continue;
    }
    if (body.length === 0) firstBodyLine = i + 1;
    lastBodyLine = i + 1;
    body.push(line);
  }
  return null;
}

function finish(body: string[], startLine: number, endLine: number): SourceRegion {
  const indents = body
    .filter((line) => line.trim() !== '')
    .map((line) => /^\s*/.exec(line)![0].length);
  const cut = indents.length > 0 ? Math.min(...indents) : 0;
  return { code: body.map((line) => line.slice(cut)).join('\n'), startLine, endLine };
}
