import { Context, Effect, Layer, Schema } from 'effect';
import type { DatabaseInstance } from '@repo/db/client';

export class DbError extends Schema.TaggedError<DbError>()('DbError', {
  cause: Schema.Unknown,
  message: Schema.String,
}) {}

export interface DbService {
  readonly db: DatabaseInstance;
}

export class Db extends Context.Tag('@repo/effect/Db')<Db, DbService>() {}

/**
 * Execute a database operation with automatic span tracing.
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
): Effect.Effect<A, DbError, Db> =>
  Effect.flatMap(Db, ({ db }) =>
    Effect.tryPromise({
      try: () => f(db),
      catch: (cause) =>
        new DbError({ cause, message: cause instanceof Error ? cause.message : String(cause) }),
    }),
  ).pipe(
    Effect.withSpan(`db.${name}`, { attributes: { 'db.system': 'postgresql' } }),
  );

export const DbLive = (db: DatabaseInstance): Layer.Layer<Db> =>
  Layer.succeed(Db, { db });
