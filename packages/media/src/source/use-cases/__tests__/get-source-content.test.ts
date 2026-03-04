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
  createTestSource,
  withTestUser,
  resetAllFactories,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';
import type { SourceContentNotFound } from '../../../errors';
import type { Source, SourceId } from '@repo/db/schema';
import { SourceNotFound } from '../../../errors';
import { SourceRepo, type SourceRepoService } from '../../repos';
import { getSourceContent } from '../get-source-content';

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
    delete: () => Effect.succeed(true),
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

describe('getSourceContent', () => {
  beforeEach(() => {
    resetAllFactories();
  });

  describe('authorization', () => {
    it('should return source content when user owns it', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestSource({
        id: 'doc_test1' as SourceId,
        contentKey: 'sources/test.txt',
        mimeType: 'text/plain',
        createdBy: user.id,
      });

      const expectedContent = 'Hello, this is the source content.';

      const mockRepo = createMockSourceRepo({
        findById: () => Effect.succeed(doc),
      });

      const mockStorage = createMockStorage({
        download: () => Effect.succeed(Buffer.from(expectedContent)),
      });

      const effect = getSourceContent({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromise(withTestUser(user)(effect));

      expect(result.content).toBe(expectedContent);
    });

    it('should fail with SourceNotFound when user is admin and does not own source', async () => {
      const admin = createTestAdmin({ id: 'admin-123' });
      const sourceId = 'doc_test2' as SourceId;

      const mockRepo = createMockSourceRepo({
        findByIdForUser: (id) => Effect.fail(new SourceNotFound({ id })),
      });

      const mockStorage = createMockStorage({
        download: () =>
          Effect.succeed(Buffer.from('Admin can access this content.')),
      });

      const effect = getSourceContent({ id: sourceId }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(admin)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceNotFound');
        expect((error as SourceNotFound).id).toBe(sourceId);
      }
    });

    it('should fail with SourceNotFound when non-owner tries to access', async () => {
      const user = createTestUser({ id: 'user-123' });
      const sourceId = 'doc_test3' as SourceId;

      const mockRepo = createMockSourceRepo({
        findByIdForUser: (id) => Effect.fail(new SourceNotFound({ id })),
      });

      const mockStorage = createMockStorage();

      const effect = getSourceContent({ id: sourceId }).pipe(
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

  describe('source retrieval', () => {
    it('should fail with SourceNotFound when source does not exist', async () => {
      const user = createTestUser({ id: 'user-123' });
      const nonExistentId = 'doc_nonexistent';

      const mockRepo = createMockSourceRepo({
        findById: (id) => Effect.fail(new SourceNotFound({ id })),
      });

      const mockStorage = createMockStorage();

      const effect = getSourceContent({ id: nonExistentId }).pipe(
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
  });

  describe('storage errors', () => {
    it('should fail with StorageError when content cannot be fetched', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestSource({
        id: 'doc_test4' as SourceId,
        contentKey: 'sources/missing.txt',
        mimeType: 'text/plain',
        createdBy: user.id,
      });

      const mockRepo = createMockSourceRepo({
        findById: () => Effect.succeed(doc),
      });

      const mockStorage = createMockStorage({
        download: () =>
          Effect.fail(
            new StorageError({ message: 'Failed to download from storage' }),
          ),
      });

      const effect = getSourceContent({ id: doc.id }).pipe(
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

    it('should fail with SourceContentNotFound when file is missing from storage', async () => {
      const user = createTestUser({ id: 'owner-123' });
      const doc = createTestSource({
        id: 'doc_test5' as SourceId,
        contentKey: 'sources/deleted.txt',
        mimeType: 'text/plain',
        createdBy: user.id,
      });

      const mockRepo = createMockSourceRepo({
        findById: () => Effect.succeed(doc),
      });

      const mockStorage = createMockStorage({
        download: () =>
          Effect.fail(new StorageNotFoundError({ key: doc.contentKey })),
      });

      const effect = getSourceContent({ id: doc.id }).pipe(
        Effect.provide(Layer.mergeAll(mockRepo, mockStorage, MockDbLive)),
      );

      const result = await Effect.runPromiseExit(withTestUser(user)(effect));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause._tag === 'Fail' ? result.cause.error : null;
        expect(error?._tag).toBe('SourceContentNotFound');
        expect((error as SourceContentNotFound).id).toBe(doc.id);
        expect((error as SourceContentNotFound).contentKey).toBe(
          doc.contentKey,
        );
      }
    });
  });
});
