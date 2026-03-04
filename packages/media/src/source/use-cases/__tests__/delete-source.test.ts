import { Db, type DbService } from '@repo/db/effect';
import { Storage, type StorageService, StorageError } from '@repo/storage';
import {
  createTestUser,
  createTestAdmin,
  createTestSource,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Source, SourceId } from '@repo/db/schema';
import { SourceNotFound } from '../../../errors';
import { SourceRepo, type SourceRepoService } from '../../repos';
import { deleteSource } from '../delete-source';

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
type MockSourceRepoMethods = {
  findById?: (id: string) => Effect.Effect<Source, SourceNotFound>;
  findByIdForUser?: (
    id: string,
    userId: string,
  ) => Effect.Effect<Source, SourceNotFound>;
  delete?: (id: string) => Effect.Effect<boolean>;
};

/**
 * Create a mock SourceRepo layer with configurable behavior.
 * Methods are typed without Db requirement for testing convenience.
 */
const createMockSourceRepo = (overrides: MockSourceRepoMethods = {}) => {
  const defaultSource = createTestSource();

  const service: SourceRepoService = {
    insert: () => Effect.succeed(defaultSource),
    findByIdForUser: (id, userId) =>
      overrides.findByIdForUser
        ? (overrides.findByIdForUser(id, userId) as ReturnType<
            SourceRepoService['findByIdForUser']
          >)
        : overrides.findById
          ? (overrides.findById(id) as ReturnType<
              SourceRepoService['findByIdForUser']
            >)
          : Effect.succeed(defaultSource),
    findById: (id) =>
      overrides.findById
        ? (overrides.findById(id) as ReturnType<SourceRepoService['findById']>)
        : Effect.succeed(defaultSource),
    list: () => Effect.succeed([]),
    update: () => Effect.succeed(defaultSource),
    delete: (id) =>
      overrides.delete
        ? (overrides.delete(id) as ReturnType<SourceRepoService['delete']>)
        : Effect.succeed(true),
    count: () => Effect.succeed(0),
    updateStatus: () => Effect.die('not implemented'),
    updateContent: () => Effect.die('not implemented'),
    findBySourceUrl: () => Effect.die('not implemented'),
    updateResearchConfig: () => Effect.die('not implemented'),
    findOrphanedResearch: () => Effect.die('not implemented'),
  };

  return Layer.succeed(SourceRepo, service);
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

describe('deleteSource', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('authorization', () => {
    it('should delete source when user owns it', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestSource({
        id: 'doc_test1' as SourceId,
        contentKey: 'sources/test.txt',
        createdBy: user.id,
      });

      const deleteCalls: string[] = [];
      const repoDeleteCalls: string[] = [];

      const mockRepo = createMockSourceRepo({
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

      const effect = deleteSource({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      await Effect.runPromise(withTestUser(user)(effect));

      // Verify storage.delete was called with correct key
      expect(deleteCalls).toContain(doc.contentKey);

      // Verify repo.delete was called
      expect(repoDeleteCalls).toContain(doc.id);
    });

    it('should fail with SourceNotFound when user is admin and does not own source', async () => {
      const admin = createTestAdmin({ id: 'admin-123' });
      const sourceId = 'doc_test2' as SourceId;

      const deleteCalls: string[] = [];
      const repoDeleteCalls: string[] = [];

      const mockRepo = createMockSourceRepo({
        findByIdForUser: (id) => Effect.fail(new SourceNotFound({ id })),
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

      const effect = deleteSource({ id: sourceId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(admin)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe(sourceId);
      }
      expect(deleteCalls).toHaveLength(0);
      expect(repoDeleteCalls).toHaveLength(0);
    });

    it('should fail with SourceNotFound when non-owner tries to delete', async () => {
      const user = createTestUser({ id: 'user-123' });
      const sourceId = 'doc_test3' as SourceId;

      const mockRepo = createMockSourceRepo({
        findByIdForUser: (id) => Effect.fail(new SourceNotFound({ id })),
      });

      const mockStorage = createMockStorage();

      const effect = deleteSource({ id: sourceId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe(sourceId);
      }
    });
  });

  describe('error handling', () => {
    it('should fail with SourceNotFound when source does not exist', async () => {
      const user = createTestUser({ id: 'user-123' });
      const nonExistentId = 'doc_nonexistent';

      const mockRepo = createMockSourceRepo({
        findById: (id) => Effect.fail(new SourceNotFound({ id })),
      });

      const mockStorage = createMockStorage();

      const effect = deleteSource({ id: nonExistentId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe(nonExistentId);
      }
    });

    it('should ignore storage delete errors (file might not exist)', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestSource({
        id: 'doc_test4' as SourceId,
        contentKey: 'sources/missing.txt',
        createdBy: user.id,
      });

      const repoDeleteCalls: string[] = [];

      const mockRepo = createMockSourceRepo({
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

      const effect = deleteSource({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      // Should succeed despite storage error
      await Effect.runPromise(withTestUser(user)(effect));

      // Repo delete should still be called
      expect(repoDeleteCalls).toContain(doc.id);
    });
  });
});
