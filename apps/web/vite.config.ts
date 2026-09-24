/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rolldownOptions: {
      output: {
        // Vendor code changes far less often than app code: give the big libraries their own
        // long-cacheable chunks (this also keeps every chunk under Vite's 500 kB warning).
        // #region practice:code-splitting
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next)[\\/]/ },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
        // #endregion
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/mocks/**',
        'src/test/**',
        'src/main.tsx',
        'src/**/*.d.ts',
        '**/*.test.{ts,tsx}',
      ],
      thresholds: { lines: 80, statements: 80, functions: 75, branches: 70 },
    },
  },
});
