import * as schema from '@repo/db/schema';
import { DbLive } from '@repo/effect/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { DatabaseInstance } from '@repo/db/client';
import type { Db } from '@repo/effect/db';
import type { Layer } from 'effect';

/**
 * Configuration for the test database.
 */
export interface TestDatabaseConfig {
  /**
   * PostgreSQL connection string.
   * Defaults to TEST_POSTGRES_URL env var or localhost test database.
   */
  connectionString?: string;
}

/**
 * Default test database connection string.
 */
export const DEFAULT_TEST_CONNECTION =
  process.env.TEST_POSTGRES_URL ??
  'postgres://test:test@localhost:5433/content_studio_test';

/**
 * Create a test database connection.
 */
export const createTestDatabase = (config: TestDatabaseConfig = {}) => {
  const connectionString = config.connectionString ?? DEFAULT_TEST_CONNECTION;

  const pool = new pg.Pool({
    connectionString,
    max: 10,
  });

  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    /**
     * Close the database connection.
     */
    close: async () => {
      await pool.end();
    },
  };
};

/**
 * Context for a single test with transaction support.
 * All database operations within the test are wrapped in a transaction
 * that is rolled back after the test completes.
 */
export interface TestContext {
  /**
   * The database instance for this test.
   */
  db: DatabaseInstance;

  /**
   * Effect layer providing the Db service.
   */
  dbLayer: Layer.Layer<Db>;

  /**
   * Rollback the transaction (call in afterEach).
   */
  rollback: () => Promise<void>;
}

/**
 * Create a test context with a transaction that will be rolled back.
 *
 * @example
 * ```ts
 * describe('podcast generation', () => {
 *   let ctx: TestContext;
 *
 *   beforeEach(async () => {
 *     ctx = await createTestContext();
 *   });
 *
 *   afterEach(async () => {
 *     await ctx.rollback();
 *   });
 *
 *   it('creates a podcast', async () => {
 *     await ctx.db.insert(podcast).values({...});
 *     // Transaction is rolled back after test
 *   });
 * });
 * ```
 */
export const createTestContext = async (
  config: TestDatabaseConfig = {},
): Promise<TestContext> => {
  const connectionString = config.connectionString ?? DEFAULT_TEST_CONNECTION;

  // Get a dedicated client for this test's transaction
  const pool = new pg.Pool({ connectionString, max: 1 });
  const client = await pool.connect();

  // Start a transaction
  await client.query('BEGIN');

  // Create a drizzle instance for this client
  const db = drizzle(client, { schema }) as DatabaseInstance;

  // Create the Effect layer
  const dbLayer = DbLive(db);

  return {
    db,
    dbLayer,
    rollback: async () => {
      try {
        await client.query('ROLLBACK');
      } finally {
        client.release();
        await pool.end();
      }
    },
  };
};

/**
 * Run database migrations for tests.
 * Usually called once before all tests in a test file or suite.
 */
export const runTestMigrations = async (config: TestDatabaseConfig = {}) => {
  const { db, close } = createTestDatabase(config);

  // Drizzle Kit handles migrations via CLI, so this is a no-op in tests
  // Assumes migrations have been run via `pnpm db:push` against test DB

  await close();
};

/**
 * Clean all tables in the test database.
 * Use with caution - this is destructive!
 */
export const cleanTestDatabase = async (config: TestDatabaseConfig = {}) => {
  const { db, close } = createTestDatabase(config);

  // Delete in reverse order of dependencies
  await db.delete(schema.podcastScript);
  await db.delete(schema.podcast);
  await db.delete(schema.document);
  await db.delete(schema.job);
  // Don't delete users/sessions as they may be needed for auth

  await close();
};
