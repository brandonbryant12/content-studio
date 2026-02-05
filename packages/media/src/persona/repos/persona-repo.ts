import { Context, Effect, Layer } from 'effect';
import { persona, type Persona, type PersonaId } from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { PersonaNotFound } from '../../errors';
import { eq, desc, and, count as drizzleCount } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

export interface ListOptions {
  createdBy?: string;
  role?: 'host' | 'cohost';
  limit?: number;
  offset?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface PersonaRepoService {
  readonly insert: (
    data: typeof persona.$inferInsert,
  ) => Effect.Effect<Persona, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<Persona, PersonaNotFound | DatabaseError, Db>;

  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Persona[], DatabaseError, Db>;

  readonly update: (
    id: string,
    data: Partial<typeof persona.$inferInsert>,
  ) => Effect.Effect<Persona, PersonaNotFound | DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  readonly count: (options?: {
    createdBy?: string;
  }) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class PersonaRepo extends Context.Tag('@repo/media/PersonaRepo')<
  PersonaRepo,
  PersonaRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: PersonaRepoService = {
  insert: (data) =>
    withDb('personaRepo.insert', async (db) => {
      const [result] = await db.insert(persona).values(data).returning();
      return result!;
    }),

  findById: (id) =>
    withDb('personaRepo.findById', (db) =>
      db
        .select()
        .from(persona)
        .where(eq(persona.id, id as PersonaId))
        .limit(1)
        .then((rows) => rows[0]),
    ).pipe(
      Effect.flatMap((p) =>
        p ? Effect.succeed(p) : Effect.fail(new PersonaNotFound({ id })),
      ),
    ),

  list: (options) =>
    withDb('personaRepo.list', (db) => {
      const conditions = [];
      if (options.createdBy)
        conditions.push(eq(persona.createdBy, options.createdBy));
      if (options.role) conditions.push(eq(persona.role, options.role));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return db
        .select()
        .from(persona)
        .where(where)
        .orderBy(desc(persona.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  update: (id, data) =>
    withDb('personaRepo.update', async (db) => {
      const [result] = await db
        .update(persona)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(persona.id, id as PersonaId))
        .returning();
      return result;
    }).pipe(
      Effect.flatMap((p) =>
        p ? Effect.succeed(p) : Effect.fail(new PersonaNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('personaRepo.delete', async (db) => {
      const result = await db
        .delete(persona)
        .where(eq(persona.id, id as PersonaId))
        .returning({ id: persona.id });
      return result.length > 0;
    }),

  count: (options) =>
    withDb('personaRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(persona.createdBy, options.createdBy)
        : undefined;
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(persona)
        .where(conditions);
      return result?.count ?? 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const PersonaRepoLive: Layer.Layer<PersonaRepo, never, Db> =
  Layer.succeed(PersonaRepo, make);
