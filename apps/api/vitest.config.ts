import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // unplugin-swc reads experimentalDecorators/emitDecoratorMetadata from tsconfig.json,
  // so tests use the same compiler as the runtime (@swc-node/register).
  plugins: [swc.vite()],
  oxc: false,
  test: {
    globals: true,
    globalSetup: ['./test/global-setup.ts'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/db/migrations/**', 'src/db/seed.ts'],
      thresholds: { lines: 80, statements: 80, functions: 75, branches: 70 },
    },
  },
});
