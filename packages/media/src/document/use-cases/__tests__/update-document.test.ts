import { Db, type DbService } from '@repo/db/effect';
import { ForbiddenError } from '@repo/db/errors';
import { Storage, type StorageService } from '@repo/storage';
import {
  createTestUser,
  createTestAdmin,
  createTestDocument,
  resetAllFactories,
  withTestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Document } from '@repo/db/schema';
import { DocumentNotFound } from '../../../errors';
import { DocumentRepo, type DocumentRepoService } from '../../repos';
import { updateDocument, type UpdateDocumentInput } from '../update-document';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Track storage operations for assertions.
 */
interface StorageTracker {
  uploads: Array<{ key: string; contentType: string }>;
  deletes: string[];
}

/**
 * Create a mock Db layer (empty - DocumentRepo mock doesn't use it).
 */
const MockDbLive: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as DbService['db'],
});

/**
 * Create a mock storage layer with tracking.
 */
const createMockStorageLayer = (
  tracker: StorageTracker,
): Layer.Layer<Storage> => {
  const service: StorageService = {
    upload: (key, _data, contentType) =>
      Effect.sync(() => {
        tracker.uploads.push({ key, contentType });
        return `mock://${key}`;
      }),
    download: () => Effect.succeed(Buffer.from('mock content')),
    delete: (key) =>
      Effect.sync(() => {
        tracker.deletes.push(key);
      }),
    getUrl: (key) => Effect.succeed(`mock://${key}`),
    exists: () => Effect.succeed(true),
  };
  return Layer.succeed(Storage, service);
};

/**
 * Create a mock DocumentRepo layer.
 */
const createMockDocumentRepoLayer = (options: {
  documents: Map<string, Document>;
  onUpdate?: (id: string, data: unknown) => void;
}): Layer.Layer<DocumentRepo> => {
  const service: DocumentRepoService = {
    insert: (data) =>
      Effect.sync(() => {
        const doc = createTestDocument({
          title: data.title,
          contentKey: data.contentKey,
          mimeType: data.mimeType,
          wordCount: data.wordCount,
          source: data.source,
          originalFileName: data.originalFileName ?? undefined,
          originalFileSize: data.originalFileSize ?? undefined,
          metadata: data.metadata ?? undefined,
          createdBy: data.createdBy,
        });
        options.documents.set(doc.id, doc);
        return doc;
      }),
    findById: (id) =>
      Effect.suspend(() => {
        const doc = options.documents.get(id);
        if (!doc) {
          return Effect.fail(new DocumentNotFound({ id }));
        }
        return Effect.succeed(doc);
      }),
    list: () => Effect.succeed([...options.documents.values()]),
    update: (id, data) =>
      Effect.suspend(() => {
        const existing = options.documents.get(id);
        if (!existing) {
          return Effect.fail(new DocumentNotFound({ id }));
        }
        options.onUpdate?.(id, data);
        const updated: Document = {
          ...existing,
          title: data.title ?? existing.title,
          contentKey: data.contentKey ?? existing.contentKey,
          wordCount: data.wordCount ?? existing.wordCount,
          metadata: data.metadata ?? existing.metadata,
          updatedAt: new Date(),
        };
        options.documents.set(id, updated);
        return Effect.succeed(updated);
      }),
    delete: (id) =>
      Effect.sync(() => {
        const existed = options.documents.has(id);
        options.documents.delete(id);
        return existed;
      }),
    count: () => Effect.succeed(options.documents.size),
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
  };
  return Layer.succeed(DocumentRepo, service);
};

/**
 * Run an effect with test layers.
 */
const runTest = <A, E>(
  effect: Effect.Effect<A, E, Db | Storage | DocumentRepo>,
  options: {
    documents: Map<string, Document>;
    storageTracker?: StorageTracker;
    onUpdate?: (id: string, data: unknown) => void;
  },
) => {
  const storageTracker = options.storageTracker ?? { uploads: [], deletes: [] };
  const layers = Layer.mergeAll(
    MockDbLive,
    createMockStorageLayer(storageTracker),
    createMockDocumentRepoLayer({
      documents: options.documents,
      onUpdate: options.onUpdate,
    }),
  );
  return Effect.runPromise(effect.pipe(Effect.provide(layers)));
};

/**
 * Run an effect and expect it to fail, returning the error.
 */
const runTestExpectFailure = async <A, E>(
  effect: Effect.Effect<A, E, Db | Storage | DocumentRepo>,
  options: {
    documents: Map<string, Document>;
    storageTracker?: StorageTracker;
  },
): Promise<E> => {
  const storageTracker = options.storageTracker ?? { uploads: [], deletes: [] };
  const layers = Layer.mergeAll(
    MockDbLive,
    createMockStorageLayer(storageTracker),
    createMockDocumentRepoLayer({ documents: options.documents }),
  );
  const result = await Effect.runPromiseExit(
    effect.pipe(Effect.provide(layers)),
  );

  if (result._tag === 'Success') {
    throw new Error('Expected effect to fail but it succeeded');
  }

  if (result.cause._tag !== 'Fail') {
    throw new Error(`Expected Fail cause but got ${result.cause._tag}`);
  }

  return result.cause.error as E;
};

// =============================================================================
// Tests
// =============================================================================

describe('updateDocument', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('title-only updates', () => {
    it('should update title without changing content', async () => {
      const owner = createTestUser({ id: 'user-1' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Original Title',
        contentKey: 'documents/original.txt',
        wordCount: 100,
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);
      const storageTracker: StorageTracker = { uploads: [], deletes: [] };

      const input: UpdateDocumentInput = {
        id: doc.id,
        title: 'Updated Title',
      };

      const result = await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
        storageTracker,
      });

      expect(result.title).toBe('Updated Title');
      expect(result.contentKey).toBe('documents/original.txt');
      expect(result.wordCount).toBe(100);
      expect(storageTracker.uploads).toHaveLength(0);
      expect(storageTracker.deletes).toHaveLength(0);
    });
  });

  describe('content updates', () => {
    it('should recalculate wordCount when content is updated', async () => {
      const owner = createTestUser({ id: 'user-1' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Test Doc',
        contentKey: 'documents/original.txt',
        wordCount: 100,
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);
      let capturedUpdate: unknown;

      const input: UpdateDocumentInput = {
        id: doc.id,
        content: 'This is the new content with seven words here',
      };

      const result = await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
        onUpdate: (_id, data) => {
          capturedUpdate = data;
        },
      });

      // "This is the new content with seven words here" = 9 words
      expect(result.wordCount).toBe(9);
      expect(capturedUpdate).toMatchObject({ wordCount: 9 });
    });

    it('should upload new content to storage', async () => {
      const owner = createTestUser({ id: 'user-1' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Test Doc',
        contentKey: 'documents/original.txt',
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);
      const storageTracker: StorageTracker = { uploads: [], deletes: [] };

      const input: UpdateDocumentInput = {
        id: doc.id,
        content: 'Brand new content',
      };

      await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
        storageTracker,
      });

      expect(storageTracker.uploads).toHaveLength(1);
      expect(storageTracker.uploads[0]?.contentType).toBe('text/plain');
      expect(storageTracker.uploads[0]?.key).toMatch(/^documents\/.*\.txt$/);
    });

    it('should delete old content from storage', async () => {
      const owner = createTestUser({ id: 'user-1' });
      const oldContentKey = 'documents/old-content.txt';
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Test Doc',
        contentKey: oldContentKey,
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);
      const storageTracker: StorageTracker = { uploads: [], deletes: [] };

      const input: UpdateDocumentInput = {
        id: doc.id,
        content: 'New content replaces old',
      };

      await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
        storageTracker,
      });

      expect(storageTracker.deletes).toContain(oldContentKey);
    });

    it('should generate new contentKey for updated content', async () => {
      const owner = createTestUser({ id: 'user-1' });
      const originalContentKey = 'documents/original.txt';
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Test Doc',
        contentKey: originalContentKey,
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);
      let capturedUpdate: unknown;

      const input: UpdateDocumentInput = {
        id: doc.id,
        content: 'Updated content',
      };

      await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
        onUpdate: (_id, data) => {
          capturedUpdate = data;
        },
      });

      expect(capturedUpdate).toHaveProperty('contentKey');
      expect((capturedUpdate as { contentKey: string }).contentKey).not.toBe(
        originalContentKey,
      );
      expect((capturedUpdate as { contentKey: string }).contentKey).toMatch(
        /^documents\/.*\.txt$/,
      );
    });
  });

  describe('ownership and authorization', () => {
    it('should allow owner to update their document', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Owner Document',
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);

      const input: UpdateDocumentInput = {
        id: doc.id,
        title: 'Updated by Owner',
      };

      const result = await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
      });

      expect(result.title).toBe('Updated by Owner');
    });

    it('should allow admin to update any document', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const admin = createTestAdmin({ id: 'admin-id' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Owner Document',
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);

      const input: UpdateDocumentInput = {
        id: doc.id,
        title: 'Updated by Admin',
      };

      const result = await runTest(withTestUser(admin)(updateDocument(input)), {
        documents,
      });

      expect(result.title).toBe('Updated by Admin');
    });

    it('should reject update from non-owner non-admin user', async () => {
      const owner = createTestUser({ id: 'owner-id' });
      const otherUser = createTestUser({ id: 'other-user-id' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Owner Document',
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);

      const input: UpdateDocumentInput = {
        id: doc.id,
        title: 'Attempted Update',
      };

      const error = await runTestExpectFailure(
        withTestUser(otherUser)(updateDocument(input)),
        { documents },
      );

      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).message).toBe(
        'You do not own this resource',
      );
    });
  });

  describe('error handling', () => {
    it('should fail with DocumentNotFound if document does not exist', async () => {
      const user = createTestUser({ id: 'user-1' });
      const documents = new Map<string, Document>();

      const input: UpdateDocumentInput = {
        id: 'doc_nonexistent' as Document['id'],
        title: 'Should Fail',
      };

      const error = await runTestExpectFailure(
        withTestUser(user)(updateDocument(input)),
        { documents },
      );

      expect(error).toBeInstanceOf(DocumentNotFound);
      expect((error as DocumentNotFound).id).toBe('doc_nonexistent');
    });
  });

  describe('metadata updates', () => {
    it('should update metadata when provided', async () => {
      const owner = createTestUser({ id: 'user-1' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Test Doc',
        metadata: { version: 1 },
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);
      let capturedUpdate: unknown;

      const input: UpdateDocumentInput = {
        id: doc.id,
        metadata: { version: 2, newField: 'value' },
      };

      await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
        onUpdate: (_id, data) => {
          capturedUpdate = data;
        },
      });

      expect(capturedUpdate).toMatchObject({
        metadata: { version: 2, newField: 'value' },
      });
    });
  });

  describe('combined updates', () => {
    it('should handle title and content updates together', async () => {
      const owner = createTestUser({ id: 'user-1' });
      const doc = createTestDocument({
        id: 'doc_123' as Document['id'],
        title: 'Original Title',
        contentKey: 'documents/original.txt',
        wordCount: 10,
        createdBy: owner.id,
      });

      const documents = new Map<string, Document>([[doc.id, doc]]);
      const storageTracker: StorageTracker = { uploads: [], deletes: [] };

      const input: UpdateDocumentInput = {
        id: doc.id,
        title: 'New Title',
        content: 'One two three four five',
      };

      const result = await runTest(withTestUser(owner)(updateDocument(input)), {
        documents,
        storageTracker,
      });

      expect(result.title).toBe('New Title');
      expect(result.wordCount).toBe(5);
      expect(storageTracker.uploads).toHaveLength(1);
      expect(storageTracker.deletes).toHaveLength(1);
    });
  });
});
