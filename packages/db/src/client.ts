import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import * as schema from './schema';

export interface DatabaseClientOptions {
  databaseUrl?: string;
  /** Maximum number of clients in the pool (pg default: 10). */
  max?: number;
  /** Milliseconds a client can sit idle before being closed (pg default: 10_000). */
  idleTimeoutMillis?: number;
  /** Milliseconds to wait for a connection before throwing (pg default: 0 = no timeout). */
  connectionTimeoutMillis?: number;
}

export type DatabaseInstance = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

export const createDb = (opts?: DatabaseClientOptions): DatabaseInstance => {
  return drizzle({
    schema,
    casing: 'snake_case',
    connection: {
      connectionString: opts?.databaseUrl,
      max: opts?.max ?? 10,
      idleTimeoutMillis: opts?.idleTimeoutMillis ?? 30_000,
      connectionTimeoutMillis: opts?.connectionTimeoutMillis ?? 5_000,
    },
  });
};

export const verifyDbConnection = async (
  db: DatabaseInstance,
): Promise<void> => {
  await db.execute(sql`SELECT 1`);
};
