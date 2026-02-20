import { withDb } from '@repo/db/effect';
import { persona, type Persona, type PersonaId } from '@repo/db/schema';
import { and, count as drizzleCount, desc, eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type { PersonaRepoService } from './persona-repo';
import { PersonaNotFound } from '../../errors';

const requirePersona = (id: string) =>
  Effect.flatMap((row: Persona | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new PersonaNotFound({ id })),
  );

export const personaReadMethods: Pick<
  PersonaRepoService,
  'findById' | 'findByIdForUser' | 'list' | 'count'
> = {
  findById: (id) =>
    withDb('personaRepo.findById', async (db) => {
      const [p] = await db
        .select()
        .from(persona)
        .where(eq(persona.id, id as PersonaId))
        .limit(1);
      return p ?? null;
    }).pipe(requirePersona(id)),

  findByIdForUser: (id, userId) =>
    withDb('personaRepo.findByIdForUser', async (db) => {
      const [p] = await db
        .select()
        .from(persona)
        .where(
          and(eq(persona.id, id as PersonaId), eq(persona.createdBy, userId)),
        )
        .limit(1);
      return p ?? null;
    }).pipe(requirePersona(id)),

  list: (options) =>
    withDb('personaRepo.list', (db) =>
      db
        .select()
        .from(persona)
        .where(
          options.createdBy
            ? eq(persona.createdBy, options.createdBy)
            : undefined,
        )
        .orderBy(desc(persona.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0),
    ),

  count: (options) =>
    withDb('personaRepo.count', async (db) => {
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(persona)
        .where(
          options?.createdBy
            ? eq(persona.createdBy, options.createdBy)
            : undefined,
        );
      return result?.count ?? 0;
    }),
};
