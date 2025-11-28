/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@repo/db/client$': '<rootDir>/../../db/src/client.ts',
    '^@repo/db/schema$': '<rootDir>/../../db/src/schema.ts',
    '^@repo/db$': '<rootDir>/../../db/src/index.ts',
    '^@repo/effect/db$': '<rootDir>/../../effect/src/db.ts',
    '^@repo/effect/errors$': '<rootDir>/../../effect/src/errors.ts',
    '^@repo/effect/runtime$': '<rootDir>/../../effect/src/runtime.ts',
    '^@repo/effect$': '<rootDir>/../../effect/src/index.ts',
    '^@repo/storage$': '<rootDir>/../../storage/src/index.ts',
    '^@repo/storage/providers/(.*)$': '<rootDir>/../../storage/src/providers/$1.ts',
    '^@repo/queue$': '<rootDir>/../../queue/src/index.ts',
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
