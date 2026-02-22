import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Persona } from '@repo/db/schema';
import {
  createMockPersonaRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { createPersona } from '../create-persona';

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

describe('createPersona', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('creates a persona owned by the current user', async () => {
    const user = createTestUser();
    const insertSpy = vi.fn();

    const repo = createMockPersonaRepo({
      insert: (data) =>
        Effect.sync(() => {
          insertSpy(data);
          return createPersonaRecord({
            name: data.name,
            role: data.role ?? null,
            personalityDescription: data.personalityDescription ?? null,
            speakingStyle: data.speakingStyle ?? null,
            exampleQuotes: data.exampleQuotes ?? [],
            voiceId: data.voiceId ?? null,
            voiceName: data.voiceName ?? null,
            createdBy: data.createdBy,
          });
        }),
    });

    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        createPersona({
          name: 'Host Persona',
          role: 'Host',
          speakingStyle: 'Conversational',
        }).pipe(Effect.provide(layers)),
      ),
    );

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const insertData = insertSpy.mock.calls[0]![0];
    expect(insertData.createdBy).toBe(user.id);
    expect(result.name).toBe('Host Persona');
  });
});
