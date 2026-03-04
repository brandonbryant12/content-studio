import { Db } from '@repo/db/effect';
import {
  createTestUser,
  createTestAdmin,
  createTestSource,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { UnauthorizedError } from '@repo/db/errors';
import { SourceNotFound } from '../../../errors';
import { SourceRepo, type SourceRepoService } from '../../repos';
import { getSource } from '../get-source';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Create a mock SourceRepo layer with custom findById behavior.
 */
const createMockSourceRepo = (
  findById: SourceRepoService['findById'],
): Layer.Layer<SourceRepo> =>
  Layer.succeed(SourceRepo, {
    findByIdForUser: (id) => findById(id),
    findById,
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
    findOrphanedResearch: () => Effect.die('not implemented'),
  });

/**
 * Create a mock Db layer (required by use case signature but not used when repo is mocked).
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never,
});

// =============================================================================
// Tests
// =============================================================================

describe('getSource', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('authorization', () => {
    it('returns source when user owns it', async () => {
      const user = createTestUser({ id: 'user-1' });
      const source = createTestSource({
        title: 'My Source',
        createdBy: user.id,
      });

      const mockRepo = createMockSourceRepo(() => Effect.succeed(source));
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getSource({ id: source.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(source.id);
      expect(result.title).toBe('My Source');
      expect(result.createdBy).toBe(user.id);
    });

    it('fails with SourceNotFound when user is admin and does not own source', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const sourceId = 'doc_hidden';

      const mockRepo = createMockSourceRepo((id) =>
        Effect.fail(new SourceNotFound({ id })),
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(admin)(
          getSource({ id: sourceId }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe(sourceId);
      }
    });

    it('fails with SourceNotFound when non-owner tries to access', async () => {
      const user = createTestUser({ id: 'user-1' });
      const sourceId = 'doc_hidden';

      const mockRepo = createMockSourceRepo((id) =>
        Effect.fail(new SourceNotFound({ id })),
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getSource({ id: sourceId }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe(sourceId);
      }
    });
  });

  describe('source retrieval', () => {
    it('fails with SourceNotFound when source does not exist', async () => {
      const user = createTestUser({ id: 'user-1' });
      const nonExistentId = 'doc_nonexistent';

      const mockRepo = createMockSourceRepo((id) =>
        Effect.fail(new SourceNotFound({ id })),
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getSource({ id: nonExistentId }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe(nonExistentId);
      }
    });
  });

  describe('authentication', () => {
    it('fails with UnauthorizedError when no user context', async () => {
      const testSource = createTestSource({ createdBy: 'user-1' });

      const mockRepo = createMockSourceRepo(() => Effect.succeed(testSource));
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      // Run without withTestUser - no user context
      const result = await Effect.runPromiseExit(
        getSource({ id: testSource.id }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('UnauthorizedError');
        expect((error as UnauthorizedError).message).toBe(
          'Authentication required',
        );
      }
    });
  });
});
