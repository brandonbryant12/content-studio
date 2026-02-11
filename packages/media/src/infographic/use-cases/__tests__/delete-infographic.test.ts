import { ForbiddenError } from '@repo/auth';
import { Storage, type StorageService } from '@repo/storage';
import {
  createTestUser,
  createTestInfographic,
  createTestInfographicVersion,
  resetAllFactories,
} from '@repo/testing';
import { withTestUser } from '@repo/testing/setup';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Infographic, InfographicVersion } from '@repo/db/schema';
import { InfographicNotFound } from '../../../errors';
import { createMockInfographicRepo } from '../../../test-utils/mock-infographic-repo';
import { MockDbLive } from '../../../test-utils/mock-repos';
import { deleteInfographic } from '../delete-infographic';

// =============================================================================
// Test Helpers
// =============================================================================

const createMockStorage = (options?: {
  onDelete?: (key: string) => void;
}): Layer.Layer<Storage> => {
  const service: StorageService = {
    upload: () => Effect.succeed('mock://uploaded'),
    download: () => Effect.succeed(Buffer.from('mock')),
    delete: (key) => {
      options?.onDelete?.(key);
      return Effect.succeed(undefined);
    },
    getUrl: (key) => Effect.succeed(`mock://${key}`),
    exists: () => Effect.succeed(true),
  };
  return Layer.succeed(Storage, service);
};

// =============================================================================
// Tests
// =============================================================================

describe('deleteInfographic', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('success cases', () => {
    it('deletes infographic when owned by user', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({
        createdBy: user.id,
        imageStorageKey: null,
        thumbnailStorageKey: null,
      });

      let deletedFromRepo = false;
      const repo = createMockInfographicRepo({
        findById: (id: string) =>
          id === infographic.id
            ? Effect.succeed(infographic)
            : Effect.fail(new InfographicNotFound({ id })),
        listVersions: () => Effect.succeed([]),
        delete: () => {
          deletedFromRepo = true;
          return Effect.succeed(true);
        },
      });

      const layers = Layer.mergeAll(MockDbLive, repo, createMockStorage());

      await Effect.runPromise(
        withTestUser(user)(deleteInfographic({ id: infographic.id })).pipe(
          Effect.provide(layers),
        ),
      );

      expect(deletedFromRepo).toBe(true);
    });

    it('cleans up storage for main image and thumbnail', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({
        createdBy: user.id,
        imageStorageKey: 'infographics/main.png',
        thumbnailStorageKey: 'infographics/thumb.png',
      });

      const deletedKeys: string[] = [];
      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
        listVersions: () => Effect.succeed([]),
        delete: () => Effect.succeed(true),
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        repo,
        createMockStorage({ onDelete: (key) => deletedKeys.push(key) }),
      );

      await Effect.runPromise(
        withTestUser(user)(deleteInfographic({ id: infographic.id })).pipe(
          Effect.provide(layers),
        ),
      );

      expect(deletedKeys).toContain('infographics/main.png');
      expect(deletedKeys).toContain('infographics/thumb.png');
    });

    it('cleans up storage for all version images', async () => {
      const user = createTestUser();
      const infographic = createTestInfographic({
        createdBy: user.id,
        imageStorageKey: null,
        thumbnailStorageKey: null,
      });

      const v1 = createTestInfographicVersion({
        infographicId: infographic.id,
        imageStorageKey: 'v1/image.png',
        thumbnailStorageKey: 'v1/thumb.png',
      });
      const v2 = createTestInfographicVersion({
        infographicId: infographic.id,
        imageStorageKey: 'v2/image.png',
        thumbnailStorageKey: null,
      });

      const deletedKeys: string[] = [];
      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
        listVersions: () =>
          Effect.succeed([v1, v2] as readonly InfographicVersion[]),
        delete: () => Effect.succeed(true),
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        repo,
        createMockStorage({ onDelete: (key) => deletedKeys.push(key) }),
      );

      await Effect.runPromise(
        withTestUser(user)(deleteInfographic({ id: infographic.id })).pipe(
          Effect.provide(layers),
        ),
      );

      expect(deletedKeys).toContain('v1/image.png');
      expect(deletedKeys).toContain('v1/thumb.png');
      expect(deletedKeys).toContain('v2/image.png');
      expect(deletedKeys).not.toContain(null);
    });
  });

  describe('authorization', () => {
    it('fails with ForbiddenError when non-owner tries to delete', async () => {
      const user = createTestUser();
      const otherUser = createTestUser();
      const infographic = createTestInfographic({
        createdBy: otherUser.id,
      });

      const repo = createMockInfographicRepo({
        findById: () => Effect.succeed(infographic),
      });

      const layers = Layer.mergeAll(MockDbLive, repo, createMockStorage());

      const result = await Effect.runPromiseExit(
        withTestUser(user)(deleteInfographic({ id: infographic.id })).pipe(
          Effect.provide(layers),
        ),
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

      const layers = Layer.mergeAll(MockDbLive, repo, createMockStorage());

      const result = await Effect.runPromiseExit(
        withTestUser(user)(deleteInfographic({ id: 'infg_nonexistent' })).pipe(
          Effect.provide(layers),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(InfographicNotFound);
      }
    });
  });
});
