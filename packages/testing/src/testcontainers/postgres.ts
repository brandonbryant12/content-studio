import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@repo/db/schema';
import type { DatabaseInstance } from '@repo/db/client';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Global container instance (reused across test files in same process).
 * This significantly improves test performance by avoiding container startup
 * on each test file.
 */
let globalContainer: StartedPostgreSqlContainer | undefined;
let globalPool: pg.Pool | undefined;
let schemaPushed = false;

/**
 * Start a PostgreSQL container for tests.
 * Container is reused across test files for performance.
 *
 * @returns Container instance and connection string
 */
export const startPostgresContainer = async (): Promise<{
  container: StartedPostgreSqlContainer;
  connectionString: string;
}> => {
  if (globalContainer) {
    return {
      container: globalContainer,
      connectionString: globalContainer.getConnectionUri(),
    };
  }

  console.log('[Testcontainers] Starting PostgreSQL container...');

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('content_studio_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  globalContainer = container;

  const connectionString = container.getConnectionUri();
  console.log(`[Testcontainers] PostgreSQL ready at ${connectionString}`);

  // Push schema immediately after container starts
  if (!schemaPushed) {
    await pushSchema(connectionString);
    schemaPushed = true;
  }

  return {
    container,
    connectionString,
  };
};

/**
 * Run Drizzle schema push against the test database.
 * Uses drizzle-kit push via CLI for full schema support.
 *
 * @param connectionString - PostgreSQL connection URI
 */
export const pushSchema = async (connectionString: string): Promise<void> => {
  console.log('[Testcontainers] Pushing schema via drizzle-kit...');

  // Find the monorepo root (where drizzle.config.ts lives)
  const monorepoRoot = path.resolve(__dirname, '../../../../..');

  try {
    // Run drizzle-kit push with the test database URL
    execSync(`pnpm --filter @repo/db exec drizzle-kit push`, {
      cwd: monorepoRoot,
      env: {
        ...process.env,
        DB_POSTGRES_URL: connectionString,
      },
      stdio: 'pipe',
    });
    console.log('[Testcontainers] Schema pushed successfully');
  } catch (error) {
    console.error('[Testcontainers] Schema push failed:', error);
    throw error;
  }
};

/**
 * Get a shared database pool for tests.
 * Creates the pool on first access if container is running.
 *
 * @returns Database pool and instance
 */
export const getTestDb = async (): Promise<{
  db: DatabaseInstance;
  pool: pg.Pool;
}> => {
  if (!globalContainer) {
    throw new Error(
      'PostgreSQL container not started. Call startPostgresContainer() first.',
    );
  }

  if (!globalPool) {
    globalPool = new pg.Pool({
      connectionString: globalContainer.getConnectionUri(),
      max: 10,
    });
  }

  const db = drizzle(globalPool, { schema }) as DatabaseInstance;

  return { db, pool: globalPool };
};

/**
 * Stop the global PostgreSQL container.
 * Call this in Vitest's globalTeardown.
 */
export const stopPostgresContainer = async (): Promise<void> => {
  console.log('[Testcontainers] Stopping PostgreSQL container...');

  if (globalPool) {
    await globalPool.end();
    globalPool = undefined;
  }

  if (globalContainer) {
    await globalContainer.stop();
    globalContainer = undefined;
  }

  console.log('[Testcontainers] PostgreSQL stopped');
};

/**
 * Get the connection string for the running container.
 * Throws if container is not started.
 */
export const getConnectionString = (): string => {
  if (!globalContainer) {
    throw new Error(
      'PostgreSQL container not started. Call startPostgresContainer() first.',
    );
  }
  return globalContainer.getConnectionUri();
};

/**
 * Check if the container is running.
 */
export const isContainerRunning = (): boolean => {
  return globalContainer !== undefined;
};
