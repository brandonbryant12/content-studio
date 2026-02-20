import { type Db, type DatabaseError } from '@repo/db/effect';
import { type Persona } from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { PersonaNotFound } from '../../errors';
import type { Effect} from 'effect';
import { personaReadMethods } from './persona-repo.reads';
import { personaWriteMethods } from './persona-repo.writes';

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

  /**
   * Find persona by ID scoped to owner.
   * Fails with PersonaNotFound for missing or not-owned records.
   */
  readonly findByIdForUser: (
    id: string,
    userId: string,
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
  ...personaReadMethods,
  ...personaWriteMethods,
};

export const PersonaRepoLive: Layer.Layer<PersonaRepo> = Layer.succeed(
  PersonaRepo,
  make,
);
