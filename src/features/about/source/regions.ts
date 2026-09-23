export type SourceRegion = { code: string; startLine: number; endLine: number };

const OPEN = /^\s*(?:\/\/|#)\s*#region\s+practice:([\w-]+)\s*$/;
const CLOSE = /^\s*(?:\/\/|#)\s*#endregion\b/;

/** Cut a named `#region practice:<id>` out of a source file. */
export function extractRegion(text: string, id: string): SourceRegion | null {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => OPEN.exec(line)?.[1] === id);
  if (start < 0) return null;

  const body: string[] = [];
  let depth = 0;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (OPEN.test(line)) {
      depth += 1;
      continue;
    }
    if (CLOSE.test(line)) {
      if (depth === 0) return finish(body, start + 2, i);
      depth -= 1;
      continue;
    }
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
