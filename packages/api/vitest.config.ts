import { defineProject, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base.config';

export default mergeConfig(
  baseConfig,
  defineProject({
    test: {
      name: '@repo/api',
      // Include test files in subdirectories
      include: ['src/**/*.test.ts'],
      // Start a shared PostgreSQL test container and expose TEST_POSTGRES_URL.
      globalSetup: ['../testing/src/vitest-global-setup.ts'],
      // Increase timeout for database operations
      testTimeout: 30000,
      hookTimeout: 60000,
    },
  }),
);
