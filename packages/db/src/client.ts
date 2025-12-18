import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

export interface DatabaseClientOptions {
  databaseUrl?: string;
  max?: number;
}

export type DatabaseInstance = NodePgDatabase<typeof schema>;

export const createDb = (opts?: DatabaseClientOptions): DatabaseInstance => {
  return drizzle({
    schema,
    casing: 'snake_case',
    connection: {
      connectionString: opts?.databaseUrl,
      max: opts?.max,
    },
  });
};

/**
 * Verify database connection by executing a simple query.
 * Throws if the connection fails.
 */
export const verifyDbConnection = async (db: DatabaseInstance): Promise<void> => {
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    throw new Error(
      `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
