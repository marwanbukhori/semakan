#!/usr/bin/env node
// Publishes sanitised copies of the controller's SDD ledgers (`.superpowers/sdd/<plan>/progress.md`,
// git-ignored scratch) to `docs/process/plan-<n>-review-log.md`, so the real build record — tasks,
// reviews, fix rounds and rulings with their cost if wrong — can be linked from the AI workflow page
// without exposing agent IDs or machine-local paths. Plain Node ESM, no dependencies; run with
// `node scripts/publish-review-logs.mjs` from anywhere and it resolves paths from the repo root.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PLANS = [
  {
    n: 1,
    ledger: '.superpowers/sdd/2026-09-23-plan-1-foundation-and-list/progress.md',
    planDoc: 'docs/plans/2026-09-23-plan-1-foundation-and-list.md',
  },
  {
    n: 2,
    ledger: '.superpowers/sdd/2026-09-23-plan-2-detail-and-review/progress.md',
    planDoc: 'docs/plans/2026-09-23-plan-2-detail-and-review.md',
  },
  {
    n: 3,
    ledger: '.superpowers/sdd/2026-09-24-plan-3-open-data-fuel-prices/progress.md',
    planDoc: 'docs/plans/2026-09-24-plan-3-open-data-fuel-prices.md',
  },
];

// The author's email: scrubbed if it ever appears in a ledger note, even though this repo is
// public, so a published log reads as a build artefact rather than a snapshot of one person's
// inbox. The GitHub username (also `marwanbukhori`) is left alone: it is the repo's real public
// owner, already shown throughout the About pages via REPO_URL, not a local-machine detail.
const EMAIL = process.env.SCRUB_EMAIL ?? ''; // the author's email, supplied at run time so it is never committed

/** Reads "Plan N: <title> — Implementation Plan" from a plan doc's first line and returns `<title>`. */
function planTitle(planDocPath) {
  const firstLine = readFileSync(join(ROOT, planDocPath), 'utf8').split('\n', 1)[0] ?? '';
  const match = /^#\s*Plan\s+\d+:\s*(.+?)(?:\s+—\s*Implementation Plan)?\s*$/.exec(firstLine);
  if (!match) throw new Error(`Could not read a plan title from the first line of ${planDocPath}`);
  return match[1];
}

/** Removes agent IDs and machine-local paths from a ledger's text. */
function sanitise(text) {
  let out = text;

  // Agent IDs: 17-character lowercase hex tokens, plus the "implementer <id>" / "agentId: <id>"
  // phrasing they sit in. Remove the phrase first so tidying punctuation has less to clean up.
  out = out.replace(/,?\s*implementer [0-9a-f]{17}/g, '');
  out = out.replace(/\bagentId:?\s*[0-9a-f]{17}\b,?/gi, '');
  out = out.replace(/\b[0-9a-f]{17}\b/g, '');

  // Absolute paths under this checkout become repo-relative; any other /Users/<user>/... path
  // still carries a username, so it is redacted instead.
  out = out.replace(/\/Users\/[^/\s]+\/semakan\//g, '');
  out = out.replace(/\/Users\/[^\s)"]+/g, '<workspace>');

  // Scratch-space paths (the harness's temp dir for throwaway spikes).
  out = out.replace(/\/private\/tmp\/[^\s)"]+/g, '<scratch>');

  // Only `.superpowers/` PATHS (the git-ignored SDD scratch tree) become `<workspace>`. The bare
  // directory name is left alone — e.g. Plan 1's Ruling R6 ("Add `.superpowers` to
  // .prettierignore") names the directory itself, not a path into it, and must read correctly.
  out = out.replace(/\.superpowers\/[^\s)`"']+/g, '<workspace>');

  // The author's email, wherever it appears.
  if (EMAIL) out = out.replaceAll(EMAIL, '<email>');

  // Tidy punctuation a removed phrase can leave behind, e.g. "(, )" from a lone id removal.
  // Deliberately no blanket whitespace collapse here: the ledgers include markdown tables and
  // indented lines whose alignment depends on runs of spaces, and none of the removals above
  // leave stray double-spaces in this repo's ledgers (verified when this script was fixed).
  out = out.replace(/,\s*,/g, ',');
  out = out.replace(/\(\s*,\s*/g, '(');
  out = out.replace(/,\s*\)/g, ')');

  return out;
}

function publishOne({ n, ledger, planDoc }) {
  const raw = readFileSync(join(ROOT, ledger), 'utf8');
  const title = planTitle(planDoc);

  // Drop the ledger's own "# SDD ledger — plan: ..." title line; the header below replaces it.
  const lines = raw.split('\n');
  const body = (lines[0]?.startsWith('# SDD ledger') ? lines.slice(1) : lines).join('\n').trim();

  const header =
    `# Plan ${n} review log\n\n` +
    `Review log for Plan ${n} (${title}). Published from the build ledger; agent IDs and local ` +
    `paths removed.\n\n`;

  const outPath = join(ROOT, `docs/process/plan-${n}-review-log.md`);
  writeFileSync(outPath, header + sanitise(body) + '\n');
  console.log(`Wrote docs/process/plan-${n}-review-log.md`);
}

function main() {
  mkdirSync(join(ROOT, 'docs/process'), { recursive: true });
  for (const plan of PLANS) publishOne(plan);
}

main();
