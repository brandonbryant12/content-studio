import { Db } from '@repo/db/effect';
import { generateInfographicStylePresetId } from '@repo/db/schema';
import { createTestUser, resetAllFactories, withTestUser } from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { InfographicStylePreset } from '@repo/db/schema';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockStylePresetRepo } from '../../../test-utils/mock-style-preset-repo';
import { listStylePresets } from '../list-style-presets';


const createStylePresetRecord = (userId: string): InfographicStylePreset => {
  const now = new Date();
  return {
    id: generateInfographicStylePresetId(),
    name: 'Preset One',
    properties: [],
    isBuiltIn: false,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
};

describe('listStylePresets', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('lists presets for the current user', async () => {
    const user = createTestUser();
    const listSpy = vi.fn();

    const repo = createMockStylePresetRepo({
      list: (userId) =>
        Effect.gen(function* () {
          yield* Db;
          listSpy(userId);
          return [createStylePresetRecord(userId)];
        }),
    });

    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromise(
      withTestUser(user)(listStylePresets().pipe(Effect.provide(layers))),
    );

    expect(listSpy).toHaveBeenCalledWith(user.id);
    expect(result).toHaveLength(1);
    expect(result[0]!.createdBy).toBe(user.id);
  });
});
