import { Db } from '@repo/db/effect';
import {
  createTestUser,
  createTestAdmin,
  createTestDocument,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Document } from '@repo/db/schema';
import {
  DocumentRepo,
  type DocumentRepoService,
  type ListOptions,
} from '../../repos';
import { listDocuments } from '../list-documents';

// =============================================================================
// Mock DocumentRepo
// =============================================================================

interface MockRepoState {
  documents: Document[];
}

const createMockDocumentRepo = (state: MockRepoState): DocumentRepoService => ({
  insert: () => Effect.die('Not implemented in mock'),
  findById: () => Effect.die('Not implemented in mock'),
  update: () => Effect.die('Not implemented in mock'),
  delete: () => Effect.die('Not implemented in mock'),
  updateStatus: () => Effect.die('not implemented'),
  updateContent: () => Effect.die('not implemented'),
  findBySourceUrl: () => Effect.die('not implemented'),
  updateResearchConfig: () => Effect.die('not implemented'),

  list: (options: ListOptions) =>
    Effect.succeed(
      state.documents
        .filter((doc) =>
          options.createdBy ? doc.createdBy === options.createdBy : true,
        )
        .slice(
          options.offset ?? 0,
          (options.offset ?? 0) + (options.limit ?? 50),
        ),
    ),

  count: (options?: { createdBy?: string }) =>
    Effect.succeed(
      state.documents.filter((doc) =>
        options?.createdBy ? doc.createdBy === options.createdBy : true,
      ).length,
    ),
});

const createMockDocumentRepoLayer = (
  state: MockRepoState,
): Layer.Layer<DocumentRepo> =>
  Layer.succeed(DocumentRepo, createMockDocumentRepo(state));

/**
 * Create a mock Db layer that won't actually be used since
 * our mock DocumentRepo methods return Effect.succeed directly.
 * This satisfies the type requirement from the use case signature.
 */
const MockDbLayer: Layer.Layer<Db> = Layer.succeed(Db, {
  db: {} as any,
});

// =============================================================================
// Tests
// =============================================================================

describe('listDocuments', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('regular user', () => {
    it('returns paginated documents for the current user', async () => {
      const user = createTestUser();
      const doc1 = createTestDocument({ createdBy: user.id });
      const doc2 = createTestDocument({ createdBy: user.id });
      const otherUserDoc = createTestDocument({ createdBy: 'other-user-id' });

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: [doc1, doc2, otherUserDoc],
      });

      const effect = listDocuments({}).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      expect(result.documents).toHaveLength(2);
      expect(result.documents.map((d) => d.id)).toEqual([doc1.id, doc2.id]);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('returns empty list when user has no documents', async () => {
      const user = createTestUser();
      const otherUserDoc = createTestDocument({ createdBy: 'other-user-id' });

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: [otherUserDoc],
      });

      const effect = listDocuments({}).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      expect(result.documents).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('respects limit and offset parameters', async () => {
      const user = createTestUser();
      const docs = Array.from({ length: 10 }, () =>
        createTestDocument({ createdBy: user.id }),
      );

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: docs,
      });

      const effect = listDocuments({ limit: 3, offset: 2 }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      expect(result.documents).toHaveLength(3);
      expect(result.documents[0]!.id).toBe(docs[2]!.id);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('regular user only sees their own documents (ignores userId filter)', async () => {
      const user = createTestUser();
      const otherUser = createTestUser();
      const userDoc = createTestDocument({ createdBy: user.id });
      const otherUserDoc = createTestDocument({ createdBy: otherUser.id });

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: [userDoc, otherUserDoc],
      });

      // User tries to filter by another user's ID
      const effect = listDocuments({ userId: otherUser.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      // Should only see their own documents, userId filter is ignored
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]!.id).toBe(userDoc.id);
      expect(result.total).toBe(1);
    });

    it('hasMore is true when there are more documents beyond offset+limit', async () => {
      const user = createTestUser();
      const docs = Array.from({ length: 15 }, () =>
        createTestDocument({ createdBy: user.id }),
      );

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: docs,
      });

      const effect = listDocuments({ limit: 5, offset: 5 }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      expect(result.documents).toHaveLength(5);
      expect(result.total).toBe(15);
      // offset(5) + returned(5) = 10, total = 15, so hasMore = true
      expect(result.hasMore).toBe(true);
    });

    it('hasMore is false when at the end of the list', async () => {
      const user = createTestUser();
      const docs = Array.from({ length: 10 }, () =>
        createTestDocument({ createdBy: user.id }),
      );

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: docs,
      });

      const effect = listDocuments({ limit: 5, offset: 5 }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      expect(result.documents).toHaveLength(5);
      expect(result.total).toBe(10);
      // offset(5) + returned(5) = 10, total = 10, so hasMore = false
      expect(result.hasMore).toBe(false);
    });
  });

  describe('admin user', () => {
    it('admin can list all documents when no userId specified', async () => {
      const admin = createTestAdmin();
      const user1 = createTestUser();
      const user2 = createTestUser();
      const doc1 = createTestDocument({ createdBy: user1.id });
      const doc2 = createTestDocument({ createdBy: user2.id });
      const adminDoc = createTestDocument({ createdBy: admin.id });

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: [doc1, doc2, adminDoc],
      });

      const effect = listDocuments({}).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(admin)(effect));

      // Admin sees all documents
      expect(result.documents).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('admin can filter by specific userId', async () => {
      const admin = createTestAdmin();
      const targetUser = createTestUser();
      const otherUser = createTestUser();
      const targetDoc = createTestDocument({ createdBy: targetUser.id });
      const otherDoc = createTestDocument({ createdBy: otherUser.id });

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: [targetDoc, otherDoc],
      });

      const effect = listDocuments({ userId: targetUser.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)),
      );

      const result = await Effect.runPromise(withTestUser(admin)(effect));

      // Admin can filter to see only target user's documents
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]!.id).toBe(targetDoc.id);
      expect(result.total).toBe(1);
    });

    it('admin listing respects pagination with userId filter', async () => {
      const admin = createTestAdmin();
      const targetUser = createTestUser();
      const docs = Array.from({ length: 8 }, () =>
        createTestDocument({ createdBy: targetUser.id }),
      );
      const otherDocs = Array.from({ length: 5 }, () =>
        createTestDocument({ createdBy: 'other-user-id' }),
      );

      const mockRepoLayer = createMockDocumentRepoLayer({
        documents: [...docs, ...otherDocs],
      });

      const effect = listDocuments({
        userId: targetUser.id,
        limit: 3,
        offset: 2,
      }).pipe(Effect.provide(Layer.mergeAll(mockRepoLayer, MockDbLayer)));

      const result = await Effect.runPromise(withTestUser(admin)(effect));

      expect(result.documents).toHaveLength(3);
      expect(result.documents[0]!.id).toBe(docs[2]!.id);
      expect(result.total).toBe(8);
      expect(result.hasMore).toBe(true);
    });
  });
});
