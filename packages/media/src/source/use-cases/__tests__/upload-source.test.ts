import { Db, type DbService } from '@repo/db/effect';
import { Storage, StorageUploadError } from '@repo/storage';
import {
  createTestUser,
  createTestSource,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  SourceParseError,
  UnsupportedSourceFormat,
} from '../../../errors';
import { SourceRepo, type SourceRepoService } from '../../repos';
import { uploadSource } from '../upload-source';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Mock Db layer - not actually used since we mock the repo.
 */
const MockDbLive = Layer.succeed(Db, { db: {} } as DbService);

/**
 * Create a mock SourceRepo layer.
 */
const createMockSourceRepo = (
  insertFn: SourceRepoService['insert'],
): Layer.Layer<SourceRepo> =>
  Layer.succeed(SourceRepo, {
    insert: insertFn,
    findByIdForUser: () => Effect.die('Not implemented'),
    findById: () => Effect.die('Not implemented'),
    list: () => Effect.die('Not implemented'),
    update: () => Effect.die('Not implemented'),
    delete: () => Effect.die('Not implemented'),
    count: () => Effect.die('Not implemented'),
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
    findOrphanedResearch: () => Effect.die('not implemented'),
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

// =============================================================================
// Tests
// =============================================================================

describe('uploadSource', () => {
  const testUser = createTestUser({ id: 'user_test123' });

  beforeEach(() => {
    resetAllFactories();
  });

  describe('PDF file upload', () => {
    it('fails with SourceParseError for malformed PDF', async () => {
      // Arrange
      const mockRepo = createMockSourceRepo(() =>
        Effect.succeed(createTestSource()),
      );
      const invalidPdf = Buffer.from('%PDF-1.4 invalid content');

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          data: invalidPdf.toString('base64'),
          title: 'Q4 Report',
        }).pipe(Effect.provide(layers), withTestUser(testUser), Effect.either),
      );

      // Assert
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('SourceParseError');
        const error = result.left as SourceParseError;
        expect(error.fileName).toBe('report.pdf');
        expect(error.message).toContain('Failed to parse PDF');
      }
    });

    it('validates PDF MIME type as upload_pdf source', async () => {
      // This test uses a minimal valid PDF structure that pdf-parse can handle
      // For a real integration test, we'd use an actual PDF file fixture
      // Here we test that the flow correctly identifies PDF MIME type
      const mockRepo = createMockSourceRepo(() =>
        Effect.succeed(createTestSource()),
      );

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act - this will fail at parse stage but we can verify MIME type handling
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'doc.pdf',
          mimeType: 'application/octet-stream', // Should infer from extension
          data: Buffer.from('%PDF').toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(testUser), Effect.either),
      );

      // The error confirms PDF was recognized (parsing attempted)
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        // If it was unsupported, it would be UnsupportedSourceFormat
        // The SourceParseError confirms PDF was correctly identified
        expect(result.left._tag).toBe('SourceParseError');
      }
    });
  });

  describe('text file upload', () => {
    it('uploads text file and creates document', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const textContent = Buffer.from('Hello world this is a test document');

      const mockRepo = createMockSourceRepo((data) => {
        insertSpy(data);
        return Effect.succeed(
          createTestSource({
            title: data.title,
            contentKey: data.contentKey,
            mimeType: data.mimeType,
            wordCount: data.wordCount,
            source: data.source,
            originalFileName: data.originalFileName,
            originalFileSize: data.originalFileSize,
            createdBy: data.createdBy,
          }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'notes.txt',
          mimeType: 'text/plain',
          data: textContent.toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      expect(result.mimeType).toBe('text/plain');
      expect(result.source).toBe('upload_txt');
      expect(insertSpy).toHaveBeenCalledOnce();
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: 'text/plain',
          source: 'upload_txt',
          originalFileName: 'notes.txt',
          originalFileSize: textContent.length,
        }),
      );
      // contentKey should have .txt extension
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.contentKey).toMatch(/^sources\/[a-f0-9-]+\.txt$/);
    });

    it('extracts title from filename when not provided', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const textContent = Buffer.from('Some content');

      const mockRepo = createMockSourceRepo((data) => {
        insertSpy(data);
        return Effect.succeed(
          createTestSource({
            title: data.title,
          }),
        );
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      await Effect.runPromise(
        uploadSource({
          fileName: 'my-document-title.txt',
          mimeType: 'text/plain',
          data: textContent.toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert - title should be extracted from filename with hyphens converted to spaces
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.title).toBe('my document title');
    });
  });

  describe('word count calculation', () => {
    it('calculates word count from parsed content', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const textContent = Buffer.from('One two three four five six seven');

      const mockRepo = createMockSourceRepo((data) => {
        insertSpy(data);
        return Effect.succeed(createTestSource({ wordCount: data.wordCount }));
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'words.txt',
          mimeType: 'text/plain',
          data: textContent.toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      expect(result.wordCount).toBe(7);
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.wordCount).toBe(7);
    });

    it('handles empty content with zero word count', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const textContent = Buffer.from('   ');

      const mockRepo = createMockSourceRepo((data) => {
        insertSpy(data);
        return Effect.succeed(createTestSource({ wordCount: data.wordCount }));
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      await Effect.runPromise(
        uploadSource({
          fileName: 'empty.txt',
          mimeType: 'text/plain',
          data: textContent.toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.wordCount).toBe(0);
    });
  });

  describe('user context', () => {
    it('uses current user ID from context', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const textContent = Buffer.from('Test content');
      const specificUser = createTestUser({ id: 'user_specific456' });

      const mockRepo = createMockSourceRepo((data) => {
        insertSpy(data);
        return Effect.succeed(createTestSource({ createdBy: data.createdBy }));
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'test.txt',
          mimeType: 'text/plain',
          data: textContent.toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(specificUser)),
      );

      // Assert
      expect(result.createdBy).toBe(specificUser.id);
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.createdBy).toBe(specificUser.id);
    });
  });

  describe('storage upload', () => {
    it('uploads file to storage with correct content type', async () => {
      // Arrange
      const uploadSpy = vi.fn();
      const textContent = Buffer.from('Content to upload');

      const mockStorage = createMockStorage((key, data, contentType) => {
        uploadSpy({ key, data, contentType });
        return Effect.succeed(`mock://storage/${key}`);
      });

      const mockRepo = createMockSourceRepo((data) =>
        Effect.succeed(createTestSource({ contentKey: data.contentKey })),
      );

      const layers = Layer.mergeAll(mockRepo, mockStorage, MockDbLive);

      // Act
      await Effect.runPromise(
        uploadSource({
          fileName: 'upload-test.txt',
          mimeType: 'text/plain',
          data: textContent.toString('base64'),
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
        key: 'sources/test.txt',
        message: 'Upload failed: disk full',
      });
      const failingStorage = createFailingStorage(storageError);

      const mockRepo = createMockSourceRepo(() =>
        Effect.succeed(createTestSource()),
      );

      const layers = Layer.mergeAll(mockRepo, failingStorage, MockDbLive);

      // Act
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'should-fail.txt',
          mimeType: 'text/plain',
          data: Buffer.from('This should fail').toString('base64'),
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

  describe('unsupported file type handling', () => {
    it('fails with UnsupportedSourceFormat for unsupported file types', async () => {
      // Arrange
      const mockRepo = createMockSourceRepo(() =>
        Effect.succeed(createTestSource()),
      );

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'image.png',
          mimeType: 'image/png',
          data: Buffer.from('PNG content').toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(testUser), Effect.either),
      );

      // Assert
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('UnsupportedSourceFormat');
        const error = result.left as UnsupportedSourceFormat;
        expect(error.fileName).toBe('image.png');
        expect(error.mimeType).toBe('image/png');
        expect(error.supportedFormats).toContain('text/plain');
        expect(error.supportedFormats).toContain('application/pdf');
      }
    });

    it('fails with UnsupportedSourceFormat for unknown MIME types', async () => {
      // Arrange
      const mockRepo = createMockSourceRepo(() =>
        Effect.succeed(createTestSource()),
      );

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      const result = await Effect.runPromise(
        uploadSource({
          fileName: 'file.xyz',
          mimeType: 'application/octet-stream',
          data: Buffer.from('Unknown content').toString('base64'),
        }).pipe(Effect.provide(layers), withTestUser(testUser), Effect.either),
      );

      // Assert
      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left._tag).toBe('UnsupportedSourceFormat');
      }
    });
  });

  describe('metadata handling', () => {
    it('passes custom metadata to document repo', async () => {
      // Arrange
      const insertSpy = vi.fn();
      const textContent = Buffer.from('Test content');
      const customMetadata = {
        ' source ': ' api ',
        empty: '   ',
        version: 2,
        '': 'ignored',
      };
      const expectedMetadata = { source: 'api', version: 2 };

      const mockRepo = createMockSourceRepo((data) => {
        insertSpy(data);
        return Effect.succeed(createTestSource({ metadata: data.metadata }));
      });

      const layers = Layer.mergeAll(mockRepo, createMockStorage(), MockDbLive);

      // Act
      await Effect.runPromise(
        uploadSource({
          fileName: 'metadata-test.txt',
          mimeType: 'text/plain',
          data: textContent.toString('base64'),
          metadata: customMetadata,
        }).pipe(Effect.provide(layers), withTestUser(testUser)),
      );

      // Assert
      const insertedData = insertSpy.mock.calls[0]?.[0];
      expect(insertedData?.metadata).toEqual(
        expect.objectContaining(expectedMetadata),
      );
    });
  });
});
