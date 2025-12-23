import { defineConfig } from 'vitest/config';
import path from 'path';

const packagesRoot = path.resolve(__dirname, 'packages');

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/__tests__/**'],
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@repo/db/client': `${packagesRoot}/db/src/client.ts`,
      '@repo/db/schema': `${packagesRoot}/db/src/schema.ts`,
      '@repo/db': `${packagesRoot}/db/src/index.ts`,
      '@repo/effect/db': `${packagesRoot}/effect/src/db.ts`,
      '@repo/effect/errors': `${packagesRoot}/effect/src/errors.ts`,
      '@repo/effect/runtime': `${packagesRoot}/effect/src/runtime.ts`,
      '@repo/effect/logging': `${packagesRoot}/effect/src/logging.ts`,
      '@repo/effect/telemetry': `${packagesRoot}/effect/src/telemetry.ts`,
      '@repo/effect': `${packagesRoot}/effect/src/index.ts`,
      '@repo/storage': `${packagesRoot}/storage/src/index.ts`,
      '@repo/queue': `${packagesRoot}/queue/src/index.ts`,
      '@repo/auth-policy': `${packagesRoot}/auth-policy/src/index.ts`,
      '@repo/testing': `${packagesRoot}/testing/src/index.ts`,
      '@repo/ai/llm': `${packagesRoot}/ai/src/llm/index.ts`,
      '@repo/ai/tts': `${packagesRoot}/ai/src/tts/index.ts`,
      '@repo/ai': `${packagesRoot}/ai/src/index.ts`,
      '@repo/media': `${packagesRoot}/media/src/index.ts`,
    },
  },
});
