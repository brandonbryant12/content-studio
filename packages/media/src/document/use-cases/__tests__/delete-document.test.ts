import { Db, type DbService } from '@repo/db/effect';
import { ForbiddenError } from '@repo/db/errors';
import { Storage, type StorageService, StorageError } from '@repo/storage';
import {
  createTestUser,
  createTestAdmin,
  createTestDocument,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Document, DocumentId } from '@repo/db/schema';
import { DocumentNotFound } from '../../../errors';
import { DocumentRepo, type DocumentRepoService } from '../../repos';
import { deleteDocument } from '../delete-document';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Mock Db layer - not actually used since we mock the repo.
 */
const MockDbLive = Layer.succeed(Db, { db: {} } as DbService);

/**
 * Helper type for mock repo methods that removes Db requirement.
 */
type MockDocumentRepoMethods = {
  findById?: (id: string) => Effect.Effect<Document, DocumentNotFound>;
  delete?: (id: string) => Effect.Effect<boolean>;
};

/**
 * Create a mock DocumentRepo layer with configurable behavior.
 * Methods are typed without Db requirement for testing convenience.
 */
const createMockDocumentRepo = (overrides: MockDocumentRepoMethods = {}) => {
  const defaultDoc = createTestDocument();

  const service: DocumentRepoService = {
    insert: () => Effect.succeed(defaultDoc),
    findById: (id) =>
      overrides.findById
        ? (overrides.findById(id) as ReturnType<
            DocumentRepoService['findById']
          >)
        : Effect.succeed(defaultDoc),
    list: () => Effect.succeed([]),
    update: () => Effect.succeed(defaultDoc),
    delete: (id) =>
      overrides.delete
        ? (overrides.delete(id) as ReturnType<DocumentRepoService['delete']>)
        : Effect.succeed(true),
    count: () => Effect.succeed(0),
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
    findOrphanedResearch: () => Effect.die('not implemented'),
  };

  return Layer.succeed(DocumentRepo, service);
};

/**
 * Create a mock Storage layer with configurable behavior.
 */
const createMockStorage = (overrides: Partial<StorageService> = {}) => {
  const defaultService: StorageService = {
    upload: (key) => Effect.succeed(`mock://${key}`),
    download: () => Effect.succeed(Buffer.from('mock content')),
    delete: () => Effect.succeed(undefined),
    getUrl: (key) => Effect.succeed(`mock://${key}`),
    exists: () => Effect.succeed(true),
    ...overrides,
  };

  return Layer.succeed(Storage, defaultService);
};

// =============================================================================
// Tests
// =============================================================================

describe('deleteDocument', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('authorization', () => {
    it('should delete document when user owns it', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestDocument({
        id: 'doc_test1' as DocumentId,
        contentKey: 'documents/test.txt',
        createdBy: user.id,
      });

      const deleteCalls: string[] = [];
      const repoDeleteCalls: string[] = [];

      const mockRepo = createMockDocumentRepo({
        findById: (_id) => Effect.succeed(doc),
        delete: (id) => {
          repoDeleteCalls.push(id);
          return Effect.succeed(true);
        },
      });

      const mockStorage = createMockStorage({
        delete: (key) => {
          deleteCalls.push(key);
          return Effect.succeed(undefined);
        },
      });

      const effect = deleteDocument({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      await Effect.runPromise(withTestUser(user)(effect));

      // Verify storage.delete was called with correct key
      expect(deleteCalls).toContain(doc.contentKey);

      // Verify repo.delete was called
      expect(repoDeleteCalls).toContain(doc.id);
    });

    it('should delete document when user is admin (even if not owner)', async () => {
      const admin = createTestAdmin({ id: 'admin-123' });
      const otherUserId = 'other-user-456';
      const doc = createTestDocument({
        id: 'doc_test2' as DocumentId,
        contentKey: 'documents/other.txt',
        createdBy: otherUserId, // Document belongs to someone else
      });

      const deleteCalls: string[] = [];
      const repoDeleteCalls: string[] = [];

      const mockRepo = createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
        delete: (id) => {
          repoDeleteCalls.push(id);
          return Effect.succeed(true);
        },
      });

      const mockStorage = createMockStorage({
        delete: (key) => {
          deleteCalls.push(key);
          return Effect.succeed(undefined);
        },
      });

      const effect = deleteDocument({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      await Effect.runPromise(withTestUser(admin)(effect));

      // Admin should still be able to delete
      expect(deleteCalls).toContain(doc.contentKey);
      expect(repoDeleteCalls).toContain(doc.id);
    });

    it('should fail with ForbiddenError when non-owner tries to delete', async () => {
      const user = createTestUser({ id: 'user-123' });
      const otherUserId = 'other-user-456';
      const doc = createTestDocument({
        id: 'doc_test3' as DocumentId,
        createdBy: otherUserId, // Document belongs to someone else
      });

      const mockRepo = createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
      });

      const mockStorage = createMockStorage();

      const effect = deleteDocument({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

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

  describe('error handling', () => {
    it('should fail with DocumentNotFound when document does not exist', async () => {
      const user = createTestUser({ id: 'user-123' });
      const nonExistentId = 'doc_nonexistent';

      const mockRepo = createMockDocumentRepo({
        findById: (id) => Effect.fail(new DocumentNotFound({ id })),
      });

      const mockStorage = createMockStorage();

      const effect = deleteDocument({ id: nonExistentId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error).toBeInstanceOf(DocumentNotFound);
        expect((error as DocumentNotFound).id).toBe(nonExistentId);
      }
    });

    it('should ignore storage delete errors (file might not exist)', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestDocument({
        id: 'doc_test4' as DocumentId,
        contentKey: 'documents/missing.txt',
        createdBy: user.id,
      });

      const repoDeleteCalls: string[] = [];

      const mockRepo = createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
        delete: (id) => {
          repoDeleteCalls.push(id);
          return Effect.succeed(true);
        },
      });

      // Storage delete fails
      const mockStorage = createMockStorage({
        delete: () =>
          Effect.fail(
            new StorageError({ message: 'File not found in storage' }),
          ),
      });

      const effect = deleteDocument({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      // Should succeed despite storage error
      await Effect.runPromise(withTestUser(user)(effect));

      // Repo delete should still be called
      expect(repoDeleteCalls).toContain(doc.id);
    });
  });
});
