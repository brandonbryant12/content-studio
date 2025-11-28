import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesRoot = path.resolve(__dirname, '../../packages');

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@repo/db/client$': `${packagesRoot}/db/src/client.ts`,
    '^@repo/db/schema$': `${packagesRoot}/db/src/schema.ts`,
    '^@repo/db$': `${packagesRoot}/db/src/index.ts`,
    '^@repo/effect/db$': `${packagesRoot}/effect/src/db.ts`,
    '^@repo/effect/errors$': `${packagesRoot}/effect/src/errors.ts`,
    '^@repo/effect/runtime$': `${packagesRoot}/effect/src/runtime.ts`,
    '^@repo/effect$': `${packagesRoot}/effect/src/index.ts`,
    '^@repo/storage$': `${packagesRoot}/storage/src/index.ts`,
    '^@repo/storage/providers/(.*)$': `${packagesRoot}/storage/src/providers/$1.ts`,
    '^@repo/queue$': `${packagesRoot}/queue/src/index.ts`,
    '^@repo/auth-policy$': `${packagesRoot}/auth-policy/src/index.ts`,
    '^@repo/auth-policy/providers/(.*)$': `${packagesRoot}/auth-policy/src/providers/$1.ts`,
    '^@repo/documents$': `${packagesRoot}/documents/src/index.ts`,
    '^@repo/podcast$': `${packagesRoot}/podcast/src/index.ts`,
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/../../tools/jest/tsconfig.test.json',
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: '.coverage',
  verbose: true,
};
