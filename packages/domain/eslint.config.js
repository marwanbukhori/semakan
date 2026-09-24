import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['coverage', 'dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
      // The domain is pure business rules: no I/O, framework, database or UI code.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', '@nestjs/*', 'typeorm', 'react', 'react-dom', 'pg'],
              message: 'packages/domain stays pure: no Node, Nest, TypeORM, React or pg imports.',
            },
          ],
        },
      ],
    },
  },
  { files: ['*.config.{js,ts}'], extends: [tseslint.configs.disableTypeChecked] },
]);
