import { Db, type DbService } from '@repo/db/effect';
import {
  Storage,
  type StorageService,
  StorageError,
  StorageNotFoundError,
} from '@repo/storage';
import {
  createTestUser,
  createTestAdmin,
  createTestDocument,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { DocumentContentNotFound } from '../../../errors';
import type { Document, DocumentId } from '@repo/db/schema';
import { DocumentNotFound } from '../../../errors';
import { DocumentRepo, type DocumentRepoService } from '../../repos';
import { getDocumentContent } from '../get-document-content';

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
  findByIdForUser?: (
    id: string,
    userId: string,
  ) => Effect.Effect<Document, DocumentNotFound>;
};

/**
 * Create a mock DocumentRepo layer with configurable behavior.
 * Methods are typed without Db requirement for testing convenience.
 */
const createMockDocumentRepo = (overrides: MockDocumentRepoMethods = {}) => {
  const defaultDoc = createTestDocument();

  const service: DocumentRepoService = {
    insert: () => Effect.succeed(defaultDoc),
    findByIdForUser: (id, userId) =>
      overrides.findByIdForUser
        ? (overrides.findByIdForUser(id, userId) as ReturnType<
            DocumentRepoService['findByIdForUser']
          >)
        : overrides.findById
          ? (overrides.findById(id) as ReturnType<
              DocumentRepoService['findByIdForUser']
            >)
          : Effect.succeed(defaultDoc),
    findById: (id) =>
      overrides.findById
        ? (overrides.findById(id) as ReturnType<
            DocumentRepoService['findById']
          >)
        : Effect.succeed(defaultDoc),
    list: () => Effect.succeed([]),
    update: () => Effect.succeed(defaultDoc),
    delete: () => Effect.succeed(true),
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

describe('getDocumentContent', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('authorization', () => {
    it('should return document content when user owns it', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestDocument({
        id: 'doc_test1' as DocumentId,
        contentKey: 'documents/test.txt',
        mimeType: 'text/plain',
        createdBy: user.id,
      });

      const expectedContent = 'Hello, this is the document content.';

      const mockRepo = createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
      });

      const mockStorage = createMockStorage({
        download: () => Effect.succeed(Buffer.from(expectedContent)),
      });

      const effect = getDocumentContent({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      expect(result.content).toBe(expectedContent);
    });

    it('should fail with DocumentNotFound when user is admin and does not own document', async () => {
      const admin = createTestAdmin({ id: 'admin-123' });
      const docId = 'doc_test2' as DocumentId;

      const mockRepo = createMockDocumentRepo({
        findByIdForUser: (id) => Effect.fail(new DocumentNotFound({ id })),
      });

      const mockStorage = createMockStorage({
        download: () =>
          Effect.succeed(Buffer.from('Admin can access this content.')),
      });

      const effect = getDocumentContent({ id: docId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(admin)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('DocumentNotFound');
        expect((error as DocumentNotFound).id).toBe(docId);
      }
    });

    it('should fail with DocumentNotFound when non-owner tries to access', async () => {
      const user = createTestUser({ id: 'user-123' });
      const docId = 'doc_test3' as DocumentId;

      const mockRepo = createMockDocumentRepo({
        findByIdForUser: (id) => Effect.fail(new DocumentNotFound({ id })),
      });

      const mockStorage = createMockStorage();

      const effect = getDocumentContent({ id: docId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('DocumentNotFound');
        expect((error as DocumentNotFound).id).toBe(docId);
      }
    });
  });

  describe('document retrieval', () => {
    it('should fail with DocumentNotFound when document does not exist', async () => {
      const user = createTestUser({ id: 'user-123' });
      const nonExistentId = 'doc_nonexistent';

      const mockRepo = createMockDocumentRepo({
        findById: (id) => Effect.fail(new DocumentNotFound({ id })),
      });

      const mockStorage = createMockStorage();

      const effect = getDocumentContent({ id: nonExistentId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('DocumentNotFound');
        expect((error as DocumentNotFound).id).toBe(nonExistentId);
      }
    });
  });

  describe('storage errors', () => {
    it('should fail with StorageError when content cannot be fetched', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestDocument({
        id: 'doc_test4' as DocumentId,
        contentKey: 'documents/missing.txt',
        mimeType: 'text/plain',
        createdBy: user.id,
      });

      const mockRepo = createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
      });

      const mockStorage = createMockStorage({
        download: () =>
          Effect.fail(
            new StorageError({ message: 'Failed to download from storage' }),
          ),
      });

      const effect = getDocumentContent({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('StorageError');
        expect((error as StorageError).message).toBe(
          'Failed to download from storage',
        );
      }
    });

    it('should fail with DocumentContentNotFound when file is missing from storage', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestDocument({
        id: 'doc_test5' as DocumentId,
        contentKey: 'documents/deleted.txt',
        mimeType: 'text/plain',
        createdBy: user.id,
      });

      const mockRepo = createMockDocumentRepo({
        findById: () => Effect.succeed(doc),
      });

      const mockStorage = createMockStorage({
        download: () =>
          Effect.fail(new StorageNotFoundError({ key: doc.contentKey })),
      });

      const effect = getDocumentContent({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('DocumentContentNotFound');
        expect((error as DocumentContentNotFound).id).toBe(doc.id);
        expect((error as DocumentContentNotFound).contentKey).toBe(
          doc.contentKey,
        );
      }
    });
  });
});
