import { eq, desc, count as drizzleCount } from 'drizzle-orm';
import { Context, Effect, Layer } from 'effect';
import { type Persona, type PersonaId, persona } from '@repo/db/schema';
import { type DatabaseError, Db, withDb } from '@repo/db/effect';
import { PersonaNotFound } from '../../errors';

export interface ListOptions {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

export interface PersonaRepoService {
  readonly insert: (data: {
    name: string;
    role?: string | null;
    personalityDescription?: string | null;
    speakingStyle?: string | null;
    exampleQuotes?: string[];
    voiceId?: string | null;
    voiceName?: string | null;
    createdBy: string;
  }) => Effect.Effect<Persona, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<Persona, PersonaNotFound | DatabaseError, Db>;

  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Persona[], DatabaseError, Db>;

  readonly update: (
    id: string,
    data: {
      name?: string;
      role?: string | null;
      personalityDescription?: string | null;
      speakingStyle?: string | null;
      exampleQuotes?: string[];
      voiceId?: string | null;
      voiceName?: string | null;
      avatarStorageKey?: string | null;
    },
  ) => Effect.Effect<Persona, PersonaNotFound | DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  readonly count: (
    options?: ListOptions,
  ) => Effect.Effect<number, DatabaseError, Db>;
}

export class PersonaRepo extends Context.Tag('@repo/media/PersonaRepo')<
  PersonaRepo,
  PersonaRepoService
>() {}

const make: PersonaRepoService = {
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

  findById: (id) =>
    withDb('personaRepo.findById', async (db) => {
      const [p] = await db
        .select()
        .from(persona)
        .where(eq(persona.id, id as PersonaId))
        .limit(1);
      return p ?? null;
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new PersonaNotFound({ id })),
      ),
    ),

  list: (options) =>
    withDb('personaRepo.list', (db) => {
      return db
        .select()
        .from(persona)
        .where(
          options.createdBy
            ? eq(persona.createdBy, options.createdBy)
            : undefined,
        )
        .orderBy(desc(persona.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
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

export const PersonaRepoLive: Layer.Layer<PersonaRepo, never, Db> =
  Layer.succeed(PersonaRepo, make);
