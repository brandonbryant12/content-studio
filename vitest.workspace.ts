import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Unit tests for packages
  'packages/storage/vitest.config.ts',
  'packages/queue/vitest.config.ts',
  'packages/auth/vitest.config.ts',
  'packages/testing/vitest.config.ts',
  'packages/media/vitest.config.ts',
]);
