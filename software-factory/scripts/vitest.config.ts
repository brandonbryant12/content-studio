import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const scriptsRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    name: 'software-factory-scripts',
    root: scriptsRoot,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    clearMocks: true,
    restoreMocks: true,
  },
});
