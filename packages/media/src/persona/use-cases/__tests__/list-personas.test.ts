import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Persona } from '@repo/db/schema';
import {
  createMockPersonaRepo,
  MockDbLive,
} from '../../../test-utils/mock-repos';
import { listPersonas } from '../list-personas';

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

describe('listPersonas', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('returns personas with pagination metadata', async () => {
    const user = createTestUser();
    const listSpy = vi.fn();
    const countSpy = vi.fn();

    const repo = createMockPersonaRepo({
      list: (options) =>
        Effect.sync(() => {
          listSpy(options);
          return [createPersonaRecord({ createdBy: user.id })];
        }),
      count: (options) =>
        Effect.sync(() => {
          countSpy(options);
          return 2;
        }),
    });

    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(
        listPersonas({ limit: 1, offset: 0 }).pipe(Effect.provide(layers)),
      ),
    );

    expect(listSpy).toHaveBeenCalledWith({
      createdBy: user.id,
      limit: 1,
      offset: 0,
    });
    expect(countSpy).toHaveBeenCalledWith({
      createdBy: user.id,
      limit: 1,
      offset: 0,
    });
    expect(result.personas).toHaveLength(1);
    expect(result.total).toBe(2);
    expect(result.hasMore).toBe(true);
  });
});
