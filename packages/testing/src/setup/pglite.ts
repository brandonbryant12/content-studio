import { PGlite } from '@electric-sql/pglite';
import { Db } from '@repo/db/effect';
import * as schema from '@repo/db/schema';
import { pushSchema } from 'drizzle-kit/api';
import { drizzle } from 'drizzle-orm/pglite';
import { Layer } from 'effect';

import type { TestContext } from './database';
import type { DatabaseInstance } from '@repo/db/client';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';

type TestDatabaseInstance = NodePgDatabase<typeof schema>;

/**
 * Cached schema snapshot for fast per-test isolation.
 * Created once on first call, then reused via `loadDataDir`.
 */
let baseSnapshot: File | Blob | null = null;

/**
 * Narrow cast: drizzle(PGlite) produces $client: PGlite but
 * DbService requires $client: Pool. The $client property is never accessed
 * in query code — only the NodePgDatabase query methods are used.
 * Same pattern as database.ts toDbLayer.
 */
function toDbLayer(
  db: ReturnType<typeof drizzle<typeof schema>>,
): Layer.Layer<Db> {
  return Layer.succeed(Db, { db: db as unknown as DatabaseInstance });
}

async function ensureSnapshot(): Promise<File | Blob> {
  if (baseSnapshot) return baseSnapshot;

  const client = new PGlite();
  const db = drizzle({ client, schema, casing: 'snake_case' });

  const { apply } = await pushSchema(
    schema as unknown as Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pushSchema requires PgDatabase<any> per drizzle-kit/api types
    db as unknown as PgDatabase<any>,
  );
  await apply();

  baseSnapshot = await client.dumpDataDir('none');
  await client.close();

  return baseSnapshot;
}

/**
 * Create a test context backed by an in-process PGlite instance.
 * No Docker or external PostgreSQL required.
 *
 * First call pushes the Drizzle schema and snapshots the datadir (~2-3s).
 * Subsequent calls restore from the snapshot (~200ms).
 *
 * The returned `rollback` function closes the PGlite instance,
 * discarding all changes (equivalent to transaction rollback).
 */
export async function createPGliteTestContext(): Promise<TestContext> {
  const snapshot = await ensureSnapshot();

  const client = new PGlite({ loadDataDir: snapshot });
  const db = drizzle({ client, schema, casing: 'snake_case' });

  return {
    db: db as unknown as TestDatabaseInstance,
    dbLayer: toDbLayer(db),
    rollback: async () => {
      await client.close();
    },
  };
}

/**
 * Reset the cached snapshot. Useful if schema changes during a test run
 * (rare — mainly for testing the test infrastructure itself).
 */
export function resetPGliteSnapshot(): void {
  baseSnapshot = null;
}
