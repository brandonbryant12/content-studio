import { ForbiddenError } from '@repo/auth';
import {
  createTestUser,
  createTestInfographic,
  createTestInfographicVersion,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { InfographicVersion } from '@repo/db/schema';
import { InfographicNotFound } from '../../../errors';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { getInfographicVersions } from '../get-infographic-versions';

// =============================================================================
// Tests
// =============================================================================

describe('getInfographicVersions', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('returns versions for owned infographic', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({ createdBy: user.id });
      const v1 = createTestInfographicVersion({
        infographicId: infographic.id,
        versionNumber: 1,
      });
      const v2 = createTestInfographicVersion({
        infographicId: infographic.id,
        versionNumber: 2,
      });

      const repo = createMockInfographicRepo({
        findById: (id: string) =>
          id === infographic.id
            ? Effect.succeed(infographic)
            : Effect.fail(new InfographicNotFound({ id })),
        listVersions: () =>
          Effect.succeed([v1, v2] as readonly InfographicVersion[]),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getInfographicVersions({ infographicId: infographic.id }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result).toHaveLength(2);
    });

    it('returns empty array when no versions exist', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({ createdBy: user.id });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
        listVersions: () => Effect.succeed([] as readonly InfographicVersion[]),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getInfographicVersions({ infographicId: infographic.id }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result).toEqual([]);
    });
  });

  describe('authorization', () => {
    it('fails with ForbiddenError when non-owner requests versions', async () => {
      const user = createTestUser();
      const otherUser = createTestUser();
      const infographic = createTestInfographic({
        createdBy: otherUser.id,
      });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getInfographicVersions({ infographicId: infographic.id }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });
  });

  describe('error cases', () => {
    it('fails with InfographicNotFound when infographic does not exist', async () => {
      const user = createTestUser();

      const repo = createMockInfographicRepo({
        findById: (id: string) => Effect.fail(new InfographicNotFound({ id })),
      });
      const layers = Layer.mergeAll(MockDbLive, repo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getInfographicVersions({ infographicId: 'infg_nonexistent' }),
        ).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InfographicNotFound);
      }
    });
  });
});
