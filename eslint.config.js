import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'docs', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.app.json' },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
        { type: 'shared', pattern: 'src/shared' },
        { type: 'mocks', pattern: 'src/mocks' },
        { type: 'test', pattern: 'src/test' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // Any element may import its own files.
            { allow: { dependency: { relationship: { to: 'internal' } } } },
            // A feature may import only itself and shared code.
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: [
                  {
                    element: {
                      type: 'feature',
                      captured: { feature: '{{from.element.captured.feature}}' },
                    },
                  },
                  { element: { type: 'shared' } },
                ],
              },
            },
            // Shared code never depends on features or the app.
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            // The app shell composes features and hosts the Dev Panel.
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { types: { anyOf: ['feature', 'shared', 'mocks'] } } } },
            },
            // Mocks implement the features' API contracts.
            {
              from: { element: { type: 'mocks' } },
              allow: { to: { element: { types: { anyOf: ['feature', 'shared'] } } } },
            },
            // Test utilities may reach anything.
            {
              from: { element: { type: 'test' } },
              allow: {
                to: { element: { types: { anyOf: ['app', 'feature', 'shared', 'mocks'] } } },
              },
            },
            // Test files may use the app, shared code, mocks and test utilities.
            {
              from: { file: { path: '**/*.test.{ts,tsx}' } },
              allow: {
                to: { element: { types: { anyOf: ['app', 'shared', 'mocks', 'test'] } } },
              },
            },
          ],
        },
      ],
    },
  },
  {
    // Config files run in Node and import untyped presets; skip type-aware rules there.
    files: ['*.config.{js,ts}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
]);
