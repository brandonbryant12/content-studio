import { defineProject, mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.base.config';

const mediaMaxWorkers =
  // eslint-disable-next-line no-restricted-properties -- test config accepts env overrides for worker caps
  process.env.VITEST_MAX_WORKERS_MEDIA ??
  // eslint-disable-next-line no-restricted-properties -- test config accepts env overrides for worker caps
  process.env.VITEST_MAX_WORKERS ??
  '35%';

export default mergeConfig(
  baseConfig,
  defineProject({
    test: {
      name: '@repo/media',
      // Include test files in subdirectories
      include: ['src/**/*.test.ts'],
      // Increase timeout for database operations
      testTimeout: 30000,
      hookTimeout: 60000,
      maxWorkers: mediaMaxWorkers,
    },
  }),
);
