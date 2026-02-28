import type { DatabaseInstance } from './client';

const stmtCache = new WeakMap<DatabaseInstance, Map<string, unknown>>();

/**
 * Get or create a prepared statement, cached per database instance.
 *
 * Prepared statements avoid SQL string construction on every call and
 * enable PostgreSQL to reuse query plans per connection.
 *
 * @example
 * ```ts
 * findById: (id) =>
 *   withDb('repo.findById', (db) =>
 *     prepared(db, 'repo.findById', (db) =>
 *       db.select().from(table)
 *         .where(eq(table.id, sql.placeholder('id')))
 *         .limit(1)
 *         .prepare('repo_findById'),
 *     ).execute({ id }).then((rows) => rows[0]),
 *   ),
 * ```
 */
export function prepared<T>(
  db: DatabaseInstance,
  name: string,
  factory: (db: DatabaseInstance) => T,
): T {
  let dbStmts = stmtCache.get(db);
  if (!dbStmts) {
    dbStmts = new Map();
    stmtCache.set(db, dbStmts);
  }
  if (!dbStmts.has(name)) {
    dbStmts.set(name, factory(db));
  }
  return dbStmts.get(name) as T;
}
