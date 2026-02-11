import { describe, it, expect, vi } from 'vitest';
import { Effect, Layer } from 'effect';
import { Storage, StorageUploadError } from '@repo/storage';
import { Db } from '@repo/db/effect';
import type { Document, DocumentId } from '@repo/db/schema';
import { createTestUser, withTestUser } from '@repo/testing';
import { DocumentRepo, type DocumentRepoService } from '../../repos';
import { createDocument } from '../create-document';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock document for testing.
 */
const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc_test123' as DocumentId,
  title: 'Test Document',
  contentKey: 'documents/test.txt',
  mimeType: 'text/plain',
  wordCount: 3,
  source: 'manual',
  status: 'ready',
  originalFileName: null,
  originalFileSize: 13,
  metadata: null,
  errorMessage: null,
  sourceUrl: null,
  researchConfig: null,
  jobId: null,
  extractedText: null,
  contentHash: null,
  createdBy: 'user_123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Create a mock DocumentRepo layer.
 */
const createMockDocumentRepo = (
  insertFn: DocumentRepoService['insert'],
): Layer.Layer<DocumentRepo> =>
  Layer.succeed(DocumentRepo, {
    insert: insertFn,
    findById: () => Effect.die('Not implemented'),
    list: () => Effect.die('Not implemented'),
    update: () => Effect.die('Not implemented'),
    delete: () => Effect.die('Not implemented'),
    count: () => Effect.die('Not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
  });

/**
 * Create a mock Storage layer that succeeds.
 */
const createMockStorage = (
  uploadFn?: (
    key: string,
    data: Buffer,
    contentType: string,
  ) => Effect.Effect<string, StorageUploadError>,
): Layer.Layer<Storage> =>
  Layer.succeed(Storage, {
    upload: uploadFn ?? ((key) => Effect.succeed(`mock://storage/${key}`)),
    download: () => Effect.succeed(Buffer.from('mock content')),
    delete: () => Effect.void,
    getUrl: (key) => Effect.succeed(`mock://storage/${key}`),
    exists: () => Effect.succeed(true),
  });

/**
 * Create a mock Storage layer that fails on upload.
 */
const createFailingStorage = (
  error: StorageUploadError,
): Layer.Layer<Storage> =>
  Layer.succeed(Storage, {
    upload: () => Effect.fail(error),
    download: () => Effect.succeed(Buffer.from('mock content')),
    delete: () => Effect.void,
    getUrl: (key) => Effect.succeed(`mock://storage/${key}`),
    exists: () => Effect.succeed(true),
  });

/**
 * Create a mock Db layer for testing.
 * Since we mock the DocumentRepo, the Db is not actually used,
 * but we need to satisfy the type requirements.
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as never, // Not used since DocumentRepo is mocked
});

// =============================================================================
// Tests
// =============================================================================

describe('createDocument', () => {
  const testUser = createTestUser({ id: 'user_test123' });

  describe('document creation', () => {
    it('creates document with correct metadata', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const mockRepo = createMockDocumentRepo((data) => {
        insertSpy(data);
        return Effect.succeed(
          createMockDocument({
            title: data.title,
            contentKey: data.contentKey,
            wordCount: data.wordCount,
            createdBy: data.createdBy,
          }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        createDocument({
          title: 'My Test Document',
          content: 'Hello world test',
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      expect(result.title).toBe('My Test Document');
      expect(result.wordCount).toBe(3); // 'Hello world test' = 3 words
      expect(insertSpy).toHaveBeenCalledOnce();
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Test Document',
          wordCount: 3,
          mimeType: 'text/plain',
          source: 'manual',
          createdBy: testUser.id,
        }),
      );
      // contentKey should be a generated UUID path
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.contentKey).toMatch(/^documents\/[a-f0-9-]+\.txt$/);
    });

    it('calculates word count correctly', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const mockRepo = createMockDocumentRepo((data) => {
        insertSpy(data);
        return Effect.succeed(
          createMockDocument({ wordCount: data.wordCount }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      await Effect.runPromise(
        createDocument({
          title: 'Word Count Test',
          content: 'One two three four five',
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.wordCount).toBe(5);
    });
  });

  describe('storage upload', () => {
    it('uploads content to storage', async () => {
      // Arrange
      const uploadSpy = vi.fn();
      const mockStorage = createMockStorage((key, data, contentType) => {
        uploadSpy({ key, data, contentType });
        return Effect.succeed(`mock://storage/${key}`);
      });

      const mockRepo = createMockDocumentRepo((data) =>
        Effect.succeed(createMockDocument({ contentKey: data.contentKey })),
      );

      const layers = Layer.mergeAll(mockRepo, mockStorage, MockDbLive);

      // Act
      await Effect.runPromise(
        createDocument({
          title: 'Upload Test',
          content: 'Content to upload',
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      expect(uploadSpy).toHaveBeenCalledOnce();
      expect(uploadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'text/plain',
        }),
      );
      // Verify the uploaded buffer content
      const uploadedCall = uploadSpy.mock.calls[0]?.[0];
      const uploadedData = uploadedCall?.data as Buffer;
      expect(uploadedData.toString('utf-8')).toBe('Content to upload');
    });

    it('handles storage upload errors', async () => {
      // Arrange
      const storageError = new StorageUploadError({
        key: 'documents/test.txt',
        message: 'Upload failed: disk full',
      });
      const failingStorage = createFailingStorage(storageError);

      const mockRepo = createMockDocumentRepo(() =>
        Effect.succeed(createMockDocument()),
      );

      const layers = Layer.mergeAll(mockRepo, failingStorage, MockDbLive);

      // Act
      const result = await Effect.runPromise(
        createDocument({
          title: 'Should Fail',
          content: 'This should fail',
        }).pipe(Effect.provide(layers), withTestUser(testUser), Effect.either),
      );

      // Assert
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('StorageUploadError');
        expect((result.left as StorageUploadError).message).toBe(
          'Upload failed: disk full',
        );
      }
    });
  });

  describe('user context', () => {
    it('uses current user ID if userId not provided', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const mockRepo = createMockDocumentRepo((data) => {
        insertSpy(data);
        return Effect.succeed(
          createMockDocument({ createdBy: data.createdBy }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        createDocument({
          title: 'User Context Test',
          content: 'Test content',
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      expect(result.createdBy).toBe(testUser.id);
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.createdBy).toBe(testUser.id);
    });

    it('uses provided userId if given', async () => {
      // Arrange
      const overrideUserId = 'user_override456';
      const insertSpy = vi.fn();
      const mockRepo = createMockDocumentRepo((data) => {
        insertSpy(data);
        return Effect.succeed(
          createMockDocument({ createdBy: data.createdBy }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        createDocument({
          title: 'Override User Test',
          content: 'Test content',
          userId: overrideUserId,
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      expect(result.createdBy).toBe(overrideUserId);
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.createdBy).toBe(overrideUserId);
    });
  });

  describe('metadata handling', () => {
    it('passes metadata to document repo', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const mockRepo = createMockDocumentRepo((data) => {
        insertSpy(data);
        return Effect.succeed(createMockDocument({ metadata: data.metadata }));
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      const testMetadata = { source: 'api', version: 1 };

      // Act
      const result = await Effect.runPromise(
        createDocument({
          title: 'Metadata Test',
          content: 'Test content',
          metadata: testMetadata,
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      expect(result.metadata).toEqual(testMetadata);
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.metadata).toEqual(testMetadata);
    });
  });
});
