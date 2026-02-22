import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Persona } from '@repo/db/schema';
import {
  createMockPersonaRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { getPersona } from '../get-persona';

const createPersonaRecord = (overrides: Partial<Persona> = {}): Persona => {
  const now = new Date();
  return {
    id: overrides.id ?? ('persona_1' as Persona['id']),
    name: overrides.name ?? 'Test Persona',
    role: overrides.role ?? null,
    personalityDescription: overrides.personalityDescription ?? null,
    speakingStyle: overrides.speakingStyle ?? null,
    exampleQuotes: overrides.exampleQuotes ?? [],
    voiceId: overrides.voiceId ?? null,
    voiceName: overrides.voiceName ?? null,
    avatarStorageKey: overrides.avatarStorageKey ?? null,
    createdBy: overrides.createdBy ?? 'test-user-id',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
};

describe('getPersona', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns the persona for the current user', async () => {
    const user = createTestUser();
    const persona = createPersonaRecord({ createdBy: user.id });
    const findSpy = vi.fn();

    const repo = createMockPersonaRepo({
      findByIdForUser: (id, userId) =>
        Effect.sync(() => {
          findSpy(id, userId);
          return persona;
        }),
    });

    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        getPersona({ personaId: persona.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(findSpy).toHaveBeenCalledWith(persona.id, user.id);
    expect(result.id).toBe(persona.id);
  });
});
