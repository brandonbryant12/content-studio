/**
 * Vitest Global Setup for Testcontainers.
 *
 * This file manages the PostgreSQL container lifecycle:
 * - setup(): Starts container before all tests
 * - teardown(): Stops container after all tests (returned from setup)
 *
 * Usage in vitest.config.ts:
 * ```ts
 * export default defineConfig({
 *   test: {
 *     globalSetup: ['./src/vitest-global-setup.ts'],
 *   },
 * });
 * ```
 */
import {
  startPostgresContainer,
  stopPostgresContainer,
} from './testcontainers/postgres';

/**
 * Called once before all tests run.
 * Starts the PostgreSQL container and pushes the schema.
 * Returns a teardown function to stop the container.
 */
export default async function setup() {
  console.log('\n[Global Setup] Starting test infrastructure...');

  const { connectionString } = await startPostgresContainer();

  // Set environment variable for test context to use
  process.env.TEST_POSTGRES_URL = connectionString;

  console.log('[Global Setup] Test infrastructure ready\n');

  // Return teardown function
  return async function teardown() {
    console.log('\n[Global Teardown] Cleaning up test infrastructure...');
    await stopPostgresContainer();
    console.log('[Global Teardown] Cleanup complete\n');
  };
}
