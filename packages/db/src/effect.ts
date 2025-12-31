import { Context, Effect, Layer } from 'effect';
import type { DatabaseInstance } from './client';
import {
  DbError,
  ConstraintViolationError,
  DeadlockError,
  ConnectionError,
} from './errors';

export { DbError, ConstraintViolationError, DeadlockError, ConnectionError };

/**
 * Union of all database-related errors.
 * Use this when you want to handle any database error generically.
 */
export type DatabaseError =
  | DbError
  | ConstraintViolationError
  | DeadlockError
  | ConnectionError;

export interface DbService {
  readonly db: DatabaseInstance;
}

export class Db extends Context.Tag('@repo/db/Db')<Db, DbService>() {}

/**
 * PostgreSQL error with optional code, constraint, and table fields.
 */
interface PostgresError extends Error {
  code?: string;
  constraint?: string;
  table?: string;
}

/**
 * Maps a database error to a specific error type based on PostgreSQL error codes.
 * Preserves the original error in the cause field for stack trace debugging.
 *
 * PostgreSQL error code families:
 * - 23xxx: Integrity constraint violations (unique, FK, check)
 * - 40P01: Deadlock detected
 * - 08xxx: Connection exceptions
 */
const mapDatabaseError = (cause: unknown): DatabaseError => {
  if (cause instanceof Error) {
    const pgError = cause as PostgresError;
    const code = pgError.code;

    // Constraint violations (23xxx codes)
    if (code?.startsWith('23')) {
      return new ConstraintViolationError({
        constraint: pgError.constraint ?? 'unknown',
        table: pgError.table,
        message: cause.message,
        cause,
      });
    }

    // Deadlock (40P01)
    if (code === '40P01') {
      return new DeadlockError({
        message: cause.message,
        cause,
      });
    }

    // Connection errors (08xxx codes)
    if (code?.startsWith('08')) {
      return new ConnectionError({
        message: cause.message,
        cause,
      });
    }
  }

  // Default to generic DbError
  return new DbError({
    cause,
    message: cause instanceof Error ? cause.message : String(cause),
  });
};

/**
 * Execute a database operation with automatic span tracing.
 *
 * Maps PostgreSQL errors to specific error types:
 * - ConstraintViolationError: Unique/FK/check constraint failures (23xxx)
 * - DeadlockError: Transaction deadlocks (40P01)
 * - ConnectionError: Connection failures (08xxx)
 * - DbError: All other database errors
 *
 * @param name - Span name for the operation (e.g., "documents.findById")
 * @param f - Function that receives the database instance and returns a Promise
 *
 * @example
 * ```typescript
 * const getUser = (id: string) =>
 *   withDb("users.findById", (db) =>
 *     db.select().from(users).where(eq(users.id, id))
 *   );
 * ```
 */
export const withDb = <A>(
  name: string,
  f: (db: DatabaseInstance) => Promise<A>,
): Effect.Effect<A, DatabaseError, Db> =>
  Effect.flatMap(Db, ({ db }) =>
    Effect.tryPromise({
      try: () => f(db),
      catch: mapDatabaseError,
    }),
  ).pipe(
    Effect.withSpan(`db.${name}`, {
      attributes: { 'db.system': 'postgresql' },
    }),
  );

export const DbLive = (db: DatabaseInstance): Layer.Layer<Db> =>
  Layer.succeed(Db, { db });
