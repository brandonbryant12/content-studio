import * as schema from '@repo/db/schema';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { pushSchema } from 'drizzle-kit/api';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { PgDatabase } from 'drizzle-orm/pg-core';

let container: StartedPostgreSqlContainer | null = null;
let startupPromise: Promise<StartedPostgreSqlContainer> | null = null;
let schemaReadyPromise: Promise<void> | null = null;
let shutdownHooksRegistered = false;
const sharedPools = new Map<string, pg.Pool>();

const shouldReuseContainer =
  // eslint-disable-next-line no-restricted-properties -- test infrastructure reads env switches
  process.env.TESTCONTAINERS_REUSE_ENABLE === 'true';

const getPoolKey = (connectionString: string, max: number): string =>
  `${connectionString}::${max}`;

export const getSharedTestPool = (
  connectionString: string,
  max: number,
): pg.Pool => {
  const key = getPoolKey(connectionString, max);
  const existing = sharedPools.get(key);
  if (existing) {
    return existing;
  }

  const pool = new pg.Pool({ connectionString, max });
  sharedPools.set(key, pool);
  return pool;
};

const closeSharedTestPools = async (): Promise<void> => {
  const pools = Array.from(sharedPools.values());
  sharedPools.clear();
  await Promise.allSettled(pools.map((pool) => pool.end()));
};

const registerShutdownHooks = () => {
  if (shutdownHooksRegistered) {
    return;
  }

  const stop = () => {
    void stopPostgresContainer();
  };

  process.once('beforeExit', stop);
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  shutdownHooksRegistered = true;
};

const ensureContainer = async (): Promise<StartedPostgreSqlContainer> => {
  if (container) {
    return container;
  }

  if (!startupPromise) {
    const baseContainer = new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('content_studio_test')
      .withUsername('test')
      .withPassword('test');

    const configuredContainer = shouldReuseContainer
      ? baseContainer.withReuse()
      : baseContainer;

    startupPromise = configuredContainer
      .start()
      .then((startedContainer) => {
        container = startedContainer;
        registerShutdownHooks();
        return startedContainer;
      })
      .catch((error) => {
        startupPromise = null;
        throw error;
      });
  }

  return startupPromise;
};

const ensureSchema = async (connectionString: string): Promise<void> => {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const pool = new pg.Pool({ connectionString, max: 1 });
      try {
        const db = drizzle(pool, { schema, casing: 'snake_case' });
        const { apply } = await pushSchema(
          schema as unknown as Record<string, unknown>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pushSchema requires PgDatabase<any> per drizzle-kit/api types
          db as unknown as PgDatabase<any>,
        );
        await apply();
      } finally {
        await pool.end();
      }
    })();
  }

  try {
    await schemaReadyPromise;
  } catch (error) {
    schemaReadyPromise = null;
    throw error;
  }
};

export const getTestConnectionString = async (): Promise<string> => {
  const startedContainer = await ensureContainer();
  const connectionString = startedContainer.getConnectionUri();
  await ensureSchema(connectionString);
  return connectionString;
};

export const isContainerRunning = (): boolean => container !== null;

export const stopPostgresContainer = async (): Promise<void> => {
  await closeSharedTestPools();

  const activeContainer =
    container ??
    (startupPromise ? await startupPromise.catch(() => null) : null);

  container = null;
  startupPromise = null;
  schemaReadyPromise = null;

  if (!activeContainer) {
    return;
  }

  if (shouldReuseContainer) {
    return;
  }

  await activeContainer.stop();
};
