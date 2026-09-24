// Fails the build if the MYDS component styles were dropped from the CSS bundle.
// Tests run without CSS, so this is the only guard: it once shipped a 23 kB stylesheet
// with unstyled MYDS menus because Tailwind could not find the hoisted package.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const assets = join(import.meta.dirname, '..', 'dist', 'assets');
const css = readdirSync(assets)
  .filter((file) => file.endsWith('.css'))
  .map((file) => readFileSync(join(assets, file), 'utf8'))
  .join('\n');

// A class only MYDS's own components use (the checked state of Select items).
const MARKER = 'data-\\[state\\=checked\\]';
if (!css.includes(MARKER)) {
  console.error(
    `MYDS styles are missing from the CSS bundle (no ${MARKER}). Check tailwind.config.ts content paths.`,
  );
  process.exit(1);
}
console.log('MYDS styles present in the CSS bundle.');
