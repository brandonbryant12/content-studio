import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Unit tests for packages
  'packages/effect/vitest.config.ts',
  'packages/storage/vitest.config.ts',
  'packages/queue/vitest.config.ts',
  'packages/auth-policy/vitest.config.ts',
  'packages/testing/vitest.config.ts',
]);
