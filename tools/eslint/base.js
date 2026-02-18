/// <reference types="./types.d.ts" />

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboConfig from 'eslint-config-turbo/flat';
import eslintPluginImport from 'eslint-plugin-import';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import customRules from './custom-rules.js';

/** @type {any} */
const repoCustomPlugin = customRules;

export const restrictEnvAccess = defineConfig([
  { ignores: ['**/env.ts', 'dist/**'] },
  {
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Avoid using process.env directly - validate your types with valibot (example in ./apps/server/env.ts)',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          name: 'process',
          importNames: ['env'],
          message:
            'Avoid using process.env directly - validate your types with valibot (example in ./apps/server/env.ts)',
        },
      ],
    },
  },
]);

export default defineConfig([
  { ignores: ['dist/**'] },
  ...turboConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'warn',
    },
  },
  {
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      'import/no-cycle': 'warn',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'type',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
          ],
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    },
  },
  {
    plugins: {
      'repo-custom': repoCustomPlugin,
    },
  },
  {
    rules: {
      semi: ['warn', 'always'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Chat contract streams must be concretely typed
  {
    files: ['**/src/contracts/chat.ts'],
    rules: {
      'repo-custom/no-unknown-chat-stream-contract': 'error',
    },
  },
  // Chat hooks should use explicit streaming statuses
  {
    files: [
      '**/src/features/**/hooks/use-*-chat.ts',
      '**/src/features/**/hooks/use-*-chat.tsx',
    ],
    rules: {
      'repo-custom/no-chat-status-not-ready': 'error',
    },
  },
  // Invalidate query keys must use key helpers, not inline arrays
  {
    files: [
      '**/src/features/**/hooks/**/*.ts',
      '**/src/features/**/hooks/**/*.tsx',
    ],
    rules: {
      'repo-custom/no-inline-invalidate-querykey-array': 'error',
    },
  },
  // No dynamic imports
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message:
            'Dynamic imports are not allowed. Use static imports instead.',
        },
      ],
    },
  },
  // Effect-TS best practices
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ImportExpression',
          message:
            'Dynamic imports are not allowed. Use static imports instead.',
        },
        {
          selector:
            'CallExpression[callee.object.name="Layer"][callee.property.name="succeed"]',
          message:
            'Avoid Layer.succeed - it hides method-level Effect context requirements from the layer type. ' +
            'Use Layer.effect instead to capture dependencies at layer construction time for compile-time safety. ' +
            'If this service has NO methods returning Effects with context requirements, add: ' +
            '// eslint-disable-next-line no-restricted-syntax -- CRUD-only service with no Effect context requirements',
        },
      ],
    },
  },
  // Allow Layer.succeed in test files and test utilities — mocks intentionally have R=never
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.integration.test.ts',
      '**/test-utils/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ImportExpression',
          message:
            'Dynamic imports are not allowed. Use static imports instead.',
        },
      ],
    },
  },
  // Ban `as any` in test files — use branded types or typed helpers instead
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.integration.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
