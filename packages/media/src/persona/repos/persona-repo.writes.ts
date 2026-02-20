import { withDb } from '@repo/db/effect';
import { persona, type Persona, type PersonaId } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { Effect } from 'effect';
import type { PersonaRepoService } from './persona-repo';
import { PersonaNotFound } from '../../errors';

const requirePersona = (id: string) =>
  Effect.flatMap((row: Persona | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new PersonaNotFound({ id })),
  );

export const personaWriteMethods: Pick<
  PersonaRepoService,
  'insert' | 'update' | 'delete'
> = {
  insert: (data) =>
    withDb('personaRepo.insert', async (db) => {
      const [p] = await db
        .insert(persona)
        .values({
          name: data.name,
          role: data.role ?? null,
          personalityDescription: data.personalityDescription ?? null,
          speakingStyle: data.speakingStyle ?? null,
          exampleQuotes: data.exampleQuotes ?? [],
          voiceId: data.voiceId ?? null,
          voiceName: data.voiceName ?? null,
          createdBy: data.createdBy,
        })
        .returning();
      return p!;
    }),

  update: (id, data) =>
    withDb('personaRepo.update', async (db) => {
      const updateValues: Partial<Persona> = {
        ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined),
        ),
        updatedAt: new Date(),
      };

      const [p] = await db
        .update(persona)
        .set(updateValues)
        .where(eq(persona.id, id as PersonaId))
        .returning();
      return p ?? null;
    }).pipe(requirePersona(id)),

  delete: (id) =>
    withDb('personaRepo.delete', async (db) => {
      const result = await db
        .delete(persona)
        .where(eq(persona.id, id as PersonaId))
        .returning({ id: persona.id });
      return result.length > 0;
    }),
};
