import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Unit tests for packages
  'packages/db/vitest.config.ts',
  'packages/storage/vitest.config.ts',
  'packages/queue/vitest.config.ts',
  'packages/auth/vitest.config.ts',
  'packages/testing/vitest.config.ts',
  'packages/media/vitest.config.ts',
  'packages/api/vitest.config.ts',
  // App tests
  'apps/server/vitest.config.ts',
  'apps/worker/vitest.config.ts',
  'apps/web/vitest.config.ts',
]);
