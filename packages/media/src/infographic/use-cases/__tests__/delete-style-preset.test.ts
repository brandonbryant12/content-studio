import { ForbiddenError } from '@repo/auth';
import {
  generateInfographicStylePresetId,
  type InfographicStylePreset,
} from '@repo/db/schema';
import { createTestUser, resetAllFactories } from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { createMockStylePresetRepo } from '../../../test-utils/mock-style-preset-repo';
import { deleteStylePreset } from '../delete-style-preset';

const createPreset = (
  overrides: Partial<InfographicStylePreset> = {},
): InfographicStylePreset => ({
  id: generateInfographicStylePresetId(),
  name: 'Test Preset',
  properties: [{ key: 'Mood', value: 'clean', type: 'text' }],
  isBuiltIn: false,
  createdBy: 'usr_owner',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('deleteStylePreset', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  it('deletes a user-owned preset', async () => {
    const user = createTestUser();
    const preset = createPreset({ createdBy: user.id });

    let deleted = false;
    const repo = createMockStylePresetRepo({
      findById: () => Effect.succeed(preset),
      delete: () => {
        deleted = true;
        return Effect.succeed(true);
      },
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    await Effect.runPromise(
      withTestUser(user)(deleteStylePreset({ id: preset.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(deleted).toBe(true);
  });

  it('fails when deleting a built-in preset', async () => {
    const user = createTestUser();
    const preset = createPreset({ isBuiltIn: true, createdBy: null });

    const repo = createMockStylePresetRepo({
      findById: () => Effect.succeed(preset),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(deleteStylePreset({ id: preset.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure' && result.cause._tag === 'Fail') {
      expect(result.cause.error).toBeInstanceOf(ForbiddenError);
    }
  });

  it('fails when deleting another user preset', async () => {
    const user = createTestUser();
    const otherUser = createTestUser();
    const preset = createPreset({ createdBy: otherUser.id });

    const repo = createMockStylePresetRepo({
      findById: () => Effect.succeed(preset),
    });
    const layers = Layer.mergeAll(MockDbLive, repo);

    const result = await Effect.runPromiseExit(
      withTestUser(user)(deleteStylePreset({ id: preset.id })).pipe(
        Effect.provide(layers),
      ),
    );

    expect(result._tag).toBe('Failure');
    if (result._tag === 'Failure' && result.cause._tag === 'Fail') {
      expect(result.cause.error).toBeInstanceOf(ForbiddenError);
    }
  });
});
