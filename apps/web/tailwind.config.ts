import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preset } from '@govtechmy/myds-style';
import type { Config } from 'tailwindcss';

/**
 * MYDS components ship their Tailwind class names in their own build, so Tailwind must scan it.
 * In the npm workspace the package is hoisted to the repo root's node_modules, so look for it
 * upwards from this file instead of assuming `./node_modules` (which silently drops MYDS styles).
 */
export function findMydsDist(from = dirname(fileURLToPath(import.meta.url))): string {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', '@govtechmy', 'myds-react', 'dist');
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) throw new Error('@govtechmy/myds-react is not installed');
  }
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}', `${findMydsDist()}/**/*.{js,mjs}`],
  presets: [preset],
} satisfies Config;
