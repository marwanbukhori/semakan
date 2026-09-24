import { preset } from '@govtechmy/myds-style';
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@govtechmy/myds-react/dist/**/*.{js,mjs}',
  ],
  presets: [preset],
} satisfies Config;
