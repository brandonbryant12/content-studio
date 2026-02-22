import { createMockImageGen } from '@repo/ai/testing';
import { createMockStorage } from '@repo/storage/testing';
import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Persona } from '@repo/db/schema';
import {
  createMockPersonaRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { generateAvatar } from '../generate-avatar';

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

describe('generateAvatar', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('generates and stores a new avatar image', async () => {
    const user = createTestUser();
    const persona = createPersonaRecord({ createdBy: user.id });
    const updateSpy = vi.fn();

    const repo = createMockPersonaRepo({
      findByIdForUser: () => Effect.succeed(persona),
      update: (id, data) =>
        Effect.sync(() => {
          updateSpy(id, data);
          return { ...persona, ...data };
        }),
    });

    const layers = Layer.mergeAll(
      MockDbLive,
      repo,
      createMockImageGen(),
      createMockStorage({ baseUrl: 'https://storage.example/' }),
    );

    await Effect.runPromise(
      withTestUser(user)(
        generateAvatar({ personaId: persona.id }).pipe(Effect.provide(layers)),
      ),
    );

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [, data] = updateSpy.mock.calls[0]!;
    expect(data.avatarStorageKey).toBe(`personas/${persona.id}/avatar.png`);
  });
});
