import { createMockSourceRepo, MockDbLive } from '@repo/media/test-utils';
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
import { getSource } from '../get-source';

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

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockSourceRepo({
          findByIdForUser: () => Effect.succeed(source),
        }),
      );

      const result = await Effect.runPromise(
        withTestUser(user)(
          getSource({ id: source.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(source.id);
      expect(result.title).toBe('My Source');
      expect(result.createdBy).toBe(user.id);
    });

    it('allows admin users to access a source they do not own', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const source = createTestSource({
        title: 'Admin Visible Source',
        createdBy: 'member-1',
      });

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockSourceRepo({
          findById: () => Effect.succeed(source),
        }),
      );

      const result = await Effect.runPromise(
        withTestUser(admin)(
          getSource({ id: source.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(source.id);
      expect(result.createdBy).toBe(source.createdBy);
    });

    it('fails with SourceNotFound when non-owner tries to access', async () => {
      const user = createTestUser({ id: 'user-1' });
      const sourceId = 'doc_hidden';

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockSourceRepo({
          findByIdForUser: (id) => Effect.fail(new SourceNotFound({ id })),
        }),
      );

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

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockSourceRepo({
          findByIdForUser: (id) => Effect.fail(new SourceNotFound({ id })),
        }),
      );

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

      const layers = Layer.mergeAll(
        MockDbLive,
        createMockSourceRepo({
          findByIdForUser: () => Effect.succeed(testSource),
        }),
      );

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
