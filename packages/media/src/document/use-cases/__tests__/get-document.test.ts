import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDocument } from '../get-document';
import { DocumentRepo, type DocumentRepoService } from '../../repos';
import { Db, type DatabaseError } from '@repo/db/effect';
import {
  DocumentNotFound,
  ForbiddenError,
  UnauthorizedError,
} from '@repo/db/errors';
import type { Document } from '@repo/db/schema';
import {
  createTestUser,
  createTestAdmin,
  createTestDocument,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';

// =============================================================================
// Test Setup
// =============================================================================

/**
 * Create a mock DocumentRepo layer with custom findById behavior.
 */
const createMockDocumentRepo = (
  findById: DocumentRepoService['findById'],
): Layer.Layer<DocumentRepo> =>
  Layer.succeed(DocumentRepo, {
    findById,
    insert: () => Effect.die('not implemented'),
    list: () => Effect.die('not implemented'),
    update: () => Effect.die('not implemented'),
    delete: () => Effect.die('not implemented'),
    count: () => Effect.die('not implemented'),
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

describe('getDocument', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('authorization', () => {
    it('returns document when user owns it', async () => {
      const user = createTestUser({ id: 'user-1' });
      const document = createTestDocument({
        title: 'My Document',
        createdBy: user.id,
      });

      const mockRepo = createMockDocumentRepo(() => Effect.succeed(document));
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(user)(
          getDocument({ id: document.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(document.id);
      expect(result.title).toBe('My Document');
      expect(result.createdBy).toBe(user.id);
    });

    it('returns document when user is admin (even if not owner)', async () => {
      const admin = createTestAdmin({ id: 'admin-1' });
      const document = createTestDocument({
        title: 'Other User Document',
        createdBy: 'other-user-id',
      });

      const mockRepo = createMockDocumentRepo(() => Effect.succeed(document));
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromise(
        withTestUser(admin)(
          getDocument({ id: document.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result.id).toBe(document.id);
      expect(result.title).toBe('Other User Document');
      expect(result.createdBy).toBe('other-user-id');
    });

    it('fails with ForbiddenError when non-owner tries to access', async () => {
      const user = createTestUser({ id: 'user-1' });
      const document = createTestDocument({
        title: 'Someone Else Document',
        createdBy: 'other-user-id',
      });

      const mockRepo = createMockDocumentRepo(() => Effect.succeed(document));
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getDocument({ id: document.id }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).message).toBe(
          'You do not own this resource',
        );
      }
    });
  });

  describe('document retrieval', () => {
    it('fails with DocumentNotFound when document does not exist', async () => {
      const user = createTestUser({ id: 'user-1' });
      const nonExistentId = 'doc_nonexistent';

      const mockRepo = createMockDocumentRepo((id) =>
        Effect.fail(new DocumentNotFound({ id })),
      );
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      const result = await Effect.runPromiseExit(
        withTestUser(user)(
          getDocument({ id: nonExistentId }).pipe(Effect.provide(layers)),
        ),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(DocumentNotFound);
        expect((error as DocumentNotFound).id).toBe(nonExistentId);
      }
    });
  });

  describe('authentication', () => {
    it('fails with UnauthorizedError when no user context', async () => {
      const document = createTestDocument({ createdBy: 'user-1' });

      const mockRepo = createMockDocumentRepo(() => Effect.succeed(document));
      const layers = Layer.mergeAll(MockDbLive, mockRepo);

      // Run without withTestUser - no user context
      const result = await Effect.runPromiseExit(
        getDocument({ id: document.id }).pipe(Effect.provide(layers)),
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toBe(
          'Authentication required',
        );
      }
    });
  });
});
