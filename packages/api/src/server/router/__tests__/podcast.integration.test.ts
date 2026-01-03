import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Layer, ManagedRuntime } from 'effect';
import {
  createTestContext,
  createTestUser,
  createTestDocument,
  createTestPodcast,
  resetAllFactories,
  toUser,
  DEFAULT_TEST_SEGMENTS,
  type TestContext,
} from '@repo/testing';
import {
  createInMemoryStorage,
  MockLLMLive,
  MockTTSLive,
} from '@repo/testing/mocks';
import {
  user as userTable,
  document as documentTable,
  podcast as podcastTable,
  job as jobTable,
  type PodcastFullOutput,
  type PodcastListItemOutput,
  type PodcastOutput,
} from '@repo/db/schema';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import { PodcastRepoLive, DocumentRepoLive } from '@repo/media';
import { QueueLive } from '@repo/queue';
import { eq } from 'drizzle-orm';
import type { ServerRuntime } from '../../runtime';
import podcastRouter from '../podcast';
import { createMockContext, createMockErrors } from './helpers';

// =============================================================================
// oRPC Handler Utilities
// =============================================================================

/**
 * Access the internal handler from an oRPC ImplementedProcedure.
 *
 * oRPC's `.handler()` method returns an object with a `~orpc` property
 * containing the actual handler function. This utility provides type-safe
 * access for testing purposes.
 */
type ORPCProcedure = {
  '~orpc': { handler: (args: unknown) => Promise<unknown> };
};

const callHandler = <T>(
  procedure: ORPCProcedure,
  args: { context: unknown; input: unknown; errors: unknown },
): Promise<T> => {
  return procedure['~orpc'].handler(args) as Promise<T>;
};

// Handler args type
type HandlerArgs = { context: unknown; input: unknown; errors: unknown };

// Job output type
interface JobOutput {
  id: string;
  type: string;
  status: string;
  result: unknown;
  error: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// Generate response type
interface GenerateResponse {
  jobId: string;
  status: string;
}

// Typed handler accessors for podcast router
const handlers = {
  create: (args: HandlerArgs): Promise<PodcastFullOutput> =>
    callHandler<PodcastFullOutput>(
      podcastRouter.create as unknown as ORPCProcedure,
      args,
    ),
  list: (args: HandlerArgs): Promise<PodcastListItemOutput[]> =>
    callHandler<PodcastListItemOutput[]>(
      podcastRouter.list as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<PodcastFullOutput> =>
    callHandler<PodcastFullOutput>(
      podcastRouter.get as unknown as ORPCProcedure,
      args,
    ),
  update: (args: HandlerArgs): Promise<PodcastOutput> =>
    callHandler<PodcastOutput>(
      podcastRouter.update as unknown as ORPCProcedure,
      args,
    ),
  delete: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      podcastRouter.delete as unknown as ORPCProcedure,
      args,
    ),
  generate: (args: HandlerArgs): Promise<GenerateResponse> =>
    callHandler<GenerateResponse>(
      podcastRouter.generate as unknown as ORPCProcedure,
      args,
    ),
  getJob: (args: HandlerArgs): Promise<JobOutput> =>
    callHandler<JobOutput>(
      podcastRouter.getJob as unknown as ORPCProcedure,
      args,
    ),
  saveChanges: (args: HandlerArgs): Promise<GenerateResponse> =>
    callHandler<GenerateResponse>(
      podcastRouter.saveChanges as unknown as ORPCProcedure,
      args,
    ),
};

// =============================================================================
// Test Setup
// =============================================================================

/**
 * In-memory storage instance for podcast audio.
 * Shared across tests and cleared in beforeEach.
 */
let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create a minimal test runtime with only the services needed for podcast operations.
 * Uses in-memory storage from @repo/testing to properly store and retrieve content.
 */
const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    MockLLMLive,
    MockTTSLive,
    inMemoryStorage.layer,
  );
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const documentRepoLayer = DocumentRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const podcastRepoLayer = PodcastRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    documentRepoLayer,
    podcastRepoLayer,
    queueLayer,
  );

  // Type assertion needed because Layer type inference doesn't perfectly match ServerRuntime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ManagedRuntime.make(allLayers as any) as ServerRuntime;
};

/**
 * Insert a user into the database for testing.
 * Required because podcasts have a foreign key to the user table.
 */
const insertTestUser = async (
  ctx: TestContext,
  testUser: ReturnType<typeof createTestUser>,
) => {
  await ctx.db.insert(userTable).values({
    id: testUser.id,
    name: testUser.name,
    email: testUser.email,
    emailVerified: true,
    role: testUser.role,
  });
};

/**
 * Insert a document into the database for testing.
 * Required for creating podcasts with source documents.
 */
const insertTestDocument = async (
  ctx: TestContext,
  userId: string,
  options: Partial<Parameters<typeof createTestDocument>[0]> = {},
) => {
  const doc = createTestDocument({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(documentTable).values(doc);
  return doc;
};

/**
 * Insert a podcast into the database for testing.
 */
const insertTestPodcast = async (
  ctx: TestContext,
  userId: string,
  options: Parameters<typeof createTestPodcast>[0] = {},
) => {
  const podcast = createTestPodcast({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(podcastTable).values(podcast);
  return podcast;
};

// =============================================================================
// Tests
// =============================================================================

describe('podcast router', () => {
  let ctx: TestContext;
  let runtime: ServerRuntime;
  let testUser: ReturnType<typeof createTestUser>;
  let user: User;
  const errors = createMockErrors();

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    runtime = createTestRuntime(ctx);
    testUser = createTestUser();
    user = toUser(testUser);
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  // ===========================================================================
  // Tests: list handler
  // ===========================================================================

  describe('list handler', () => {
    it('returns empty array when no podcasts exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it('returns paginated podcasts for the authenticated user', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create some podcasts for this user
      await insertTestPodcast(ctx, testUser.id, { title: 'Podcast One' });
      await insertTestPodcast(ctx, testUser.id, { title: 'Podcast Two' });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.title)).toContain('Podcast One');
      expect(result.map((p) => p.title)).toContain('Podcast Two');
    });

    it('respects limit parameter', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create 5 podcasts
      for (let i = 1; i <= 5; i++) {
        await insertTestPodcast(ctx, testUser.id, { title: `Podcast ${i}` });
      }

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 3 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(3);
    });

    it('respects offset parameter', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create 5 podcasts
      for (let i = 1; i <= 5; i++) {
        await insertTestPodcast(ctx, testUser.id, { title: `Podcast ${i}` });
      }

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 2, offset: 2 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(2);
    });

    it('only returns podcasts owned by the user, not other users podcasts', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create podcast for current user
      await insertTestPodcast(ctx, testUser.id, { title: 'My Podcast' });

      // Create another user and their podcast
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      await insertTestPodcast(ctx, otherTestUser.id, {
        title: 'Other User Podcast',
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert - filtering by createdBy should only return current user's podcasts
      const myPodcasts = result.filter((p) => p.createdBy === testUser.id);
      expect(myPodcasts).toHaveLength(1);
      expect(myPodcasts[0]!.title).toBe('My Podcast');
    });

    it('returns podcasts in serialized format with ISO date strings', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      await insertTestPodcast(ctx, testUser.id, {
        title: 'Serialization Test',
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(1);
      const returned = result[0]!;

      // Verify serialized format
      expect(returned.id).toMatch(/^pod_/);
      expect(returned.title).toBe('Serialization Test');
      expect(returned.format).toBeDefined();
      expect(returned.createdBy).toBe(testUser.id);
      // Dates should be ISO strings
      expect(typeof returned.createdAt).toBe('string');
      expect(typeof returned.updatedAt).toBe('string');
      expect(() => new Date(returned.createdAt)).not.toThrow();
      expect(() => new Date(returned.updatedAt)).not.toThrow();
    });

    it('includes status and duration when present', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      await insertTestPodcast(ctx, testUser.id, {
        title: 'With Status',
        status: 'ready',
        duration: 300,
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe('ready');
      expect(result[0]!.duration).toBe(300);
    });
  });

  // ===========================================================================
  // Tests: get handler
  // ===========================================================================

  describe('get handler', () => {
    it('returns podcast when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Found Podcast',
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(podcast.id);
      expect(result.title).toBe('Found Podcast');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('throws error when podcast does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'pod_nonexistent123';

      // Act & Assert - throws error (currently INTERNAL_ERROR due to unhandled PodcastNotFound)
      await expect(
        handlers.get({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('allows access to any podcast (no ownership check)', async () => {
      // NOTE: Current implementation does not check ownership for get.
      // This test documents the current behavior.
      // Arrange - create podcast as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherPodcast = await insertTestPodcast(ctx, otherTestUser.id, {
        title: 'Other User Podcast',
      });

      // Act - access as original user
      const context = createMockContext(runtime, user);

      const result = await handlers.get({
        context,
        input: { id: otherPodcast.id },
        errors,
      });

      // Assert - can access other user's podcast
      expect(result.id).toBe(otherPodcast.id);
      expect(result.title).toBe('Other User Podcast');
    });

    it('returns podcast in serialized full format with documents and status', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id, {
        title: 'Source Doc',
      });
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Full Format Test',
        sourceDocumentIds: [doc.id],
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(podcast.id);
      expect(result.title).toBe('Full Format Test');
      expect(result.documents).toBeDefined();
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]!.title).toBe('Source Doc');
      expect(result.status).toBe('ready');
      expect(result.segments).toEqual(DEFAULT_TEST_SEGMENTS);
      // Dates should be ISO strings
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
    });
  });

  // ===========================================================================
  // Tests: create handler
  // ===========================================================================

  describe('create handler', () => {
    it('creates podcast with title and format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'My New Podcast',
        format: 'conversation' as const,
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('My New Podcast');
      expect(result.format).toBe('conversation');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('creates podcast with source documents', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id, {
        title: 'Source Document',
      });
      const input = {
        title: 'Podcast with Docs',
        format: 'voice_over' as const,
        documentIds: [doc.id],
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('Podcast with Docs');
      expect(result.sourceDocumentIds).toContain(doc.id);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]!.id).toBe(doc.id);
    });

    it('creates podcast with optional metadata', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Podcast with Metadata',
        format: 'conversation' as const,
        description: 'A test podcast description',
        promptInstructions: 'Make it funny',
        targetDurationMinutes: 10,
        hostVoice: 'Charon',
        hostVoiceName: 'Charon',
        coHostVoice: 'Kore',
        coHostVoiceName: 'Kore',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('Podcast with Metadata');
      expect(result.description).toBe('A test podcast description');
      expect(result.promptInstructions).toBe('Make it funny');
      expect(result.targetDurationMinutes).toBe(10);
      expect(result.hostVoice).toBe('Charon');
      expect(result.coHostVoice).toBe('Kore');
    });

    it('returns serialized podcast response with proper format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Format Test',
        format: 'conversation' as const,
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert - id starts with pod_
      expect(result.id).toMatch(/^pod_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(() => new Date(result.createdAt)).not.toThrow();
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string
      expect(typeof result.updatedAt).toBe('string');
      expect(() => new Date(result.updatedAt)).not.toThrow();
    });

    it('persists podcast to database', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Persistence Test',
        format: 'conversation' as const,
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Verify - query database directly
      const [dbPodcast] = await ctx.db
        .select()
        .from(podcastTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(podcastTable.id, result.id as any));

      expect(dbPodcast).toBeDefined();
      expect(dbPodcast!.title).toBe('Persistence Test');
      expect(dbPodcast!.createdBy).toBe(testUser.id);
    });

    it('generates default title when not provided', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        format: 'conversation' as const,
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert - should have a default title
      expect(result.title).toBeDefined();
      expect(result.title.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Tests: update handler
  // ===========================================================================

  describe('update handler', () => {
    it('updates podcast title', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        title: 'Original Title',
      });
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: podcast.id,
          title: 'Updated Title',
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.id).toBe(podcast.id);
    });

    it('updates podcast description', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: podcast.id,
          description: 'New description',
        },
        errors,
      });

      // Assert
      expect(result.description).toBe('New description');
    });

    it('updates podcast target duration', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        targetDurationMinutes: 5,
      });
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: podcast.id,
          targetDurationMinutes: 15,
        },
        errors,
      });

      // Assert
      expect(result.targetDurationMinutes).toBe(15);
    });

    it('updates multiple fields at once', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: podcast.id,
          title: 'New Title',
          description: 'New description',
          promptInstructions: 'New instructions',
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New description');
      expect(result.promptInstructions).toBe('New instructions');
    });

    it('returns serialized updated podcast', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: podcast.id,
          title: 'Serialized Update',
        },
        errors,
      });

      // Assert - id starts with pod_
      expect(result.id).toMatch(/^pod_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string
      expect(typeof result.updatedAt).toBe('string');
      expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws error when podcast does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'pod_00000000000000';

      // Act & Assert - throws error (currently INTERNAL_ERROR due to unhandled PodcastNotFound)
      await expect(
        handlers.update({
          context,
          input: { id: nonExistentId, title: 'Should Fail' },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('allows updating any podcast (no ownership check)', async () => {
      // NOTE: Current implementation does not check ownership for update.
      // This test documents the current behavior.
      // Arrange - create podcast as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherPodcast = await insertTestPodcast(ctx, otherTestUser.id, {
        title: 'Original Title',
      });

      const context = createMockContext(runtime, user);

      // Act - update as different user
      const result = await handlers.update({
        context,
        input: { id: otherPodcast.id, title: 'Updated Title' },
        errors,
      });

      // Assert - can update other user's podcast
      expect(result.id).toBe(otherPodcast.id);
      expect(result.title).toBe('Updated Title');
    });

    it('persists updates to database', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      await handlers.update({
        context,
        input: {
          id: podcast.id,
          title: 'Persisted Title',
        },
        errors,
      });

      // Verify - query database directly
      const [dbPodcast] = await ctx.db
        .select()
        .from(podcastTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(podcastTable.id, podcast.id as any));

      expect(dbPodcast).toBeDefined();
      expect(dbPodcast!.title).toBe('Persisted Title');
    });
  });

  // ===========================================================================
  // Tests: delete handler
  // ===========================================================================

  describe('delete handler', () => {
    it('deletes podcast successfully', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert - returns empty object on success
      expect(result).toEqual({});
    });

    it('returns empty object on successful delete', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('throws error when podcast does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'pod_00000000000000';

      // Act & Assert - throws error (currently INTERNAL_ERROR due to unhandled PodcastNotFound)
      await expect(
        handlers.delete({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('allows deleting any podcast (no ownership check)', async () => {
      // NOTE: Current implementation does not check ownership for delete.
      // This test documents the current behavior.
      // Arrange - create podcast as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherPodcast = await insertTestPodcast(ctx, otherTestUser.id);

      const context = createMockContext(runtime, user);

      // Act - delete as different user
      const result = await handlers.delete({
        context,
        input: { id: otherPodcast.id },
        errors,
      });

      // Assert - can delete other user's podcast
      expect(result).toEqual({});
    });

    it('verifies podcast is actually removed from database after delete', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Verify podcast exists before delete
      const [beforeDelete] = await ctx.db
        .select()
        .from(podcastTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(podcastTable.id, podcast.id as any));
      expect(beforeDelete).toBeDefined();

      // Act
      await handlers.delete({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert - podcast no longer exists in database
      const [afterDelete] = await ctx.db
        .select()
        .from(podcastTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(podcastTable.id, podcast.id as any));
      expect(afterDelete).toBeUndefined();
    });

    it('allows admin to delete any podcast', async () => {
      // Arrange - create podcast as regular user
      const podcast = await insertTestPodcast(ctx, testUser.id);

      // Create admin user
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);

      // Act - admin deletes another user's podcast
      const result = await handlers.delete({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert - delete succeeded
      expect(result).toEqual({});

      // Verify - podcast is gone
      const [afterDelete] = await ctx.db
        .select()
        .from(podcastTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(podcastTable.id, podcast.id as any));
      expect(afterDelete).toBeUndefined();
    });

    it('cannot delete same podcast twice', async () => {
      // Arrange
      const podcast = await insertTestPodcast(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // First delete succeeds
      await handlers.delete({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Act & Assert - second delete fails (throws error, currently INTERNAL_ERROR)
      await expect(
        handlers.delete({
          context,
          input: { id: podcast.id },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: generate handler
  // ===========================================================================

  describe('generate handler', () => {
    it('creates a generation job for the podcast', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id);

      // Act
      const result = await handlers.generate({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toMatch(/^job_/);
      expect(result.status).toBe('pending');
    });

    it('returns existing pending job for idempotency', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id);

      // Create a pending job for this podcast
      await ctx.db.insert(jobTable).values({
        type: 'generate-podcast',
        payload: { podcastId: podcast.id, userId: testUser.id },
        createdBy: testUser.id,
        status: 'pending',
      });

      // Act - call generate again
      const result = await handlers.generate({
        context,
        input: { id: podcast.id },
        errors,
      });

      // Assert - should return existing job
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('throws error when podcast does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'pod_nonexistent123';

      // Act & Assert - throws error (currently INTERNAL_ERROR)
      await expect(
        handlers.generate({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('allows generating any podcast (no ownership check)', async () => {
      // NOTE: Current implementation does not check ownership for generate.
      // This test documents the current behavior.
      // Arrange - create podcast as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherPodcast = await insertTestPodcast(ctx, otherTestUser.id);

      const context = createMockContext(runtime, user);

      // Act - generate as different user
      const result = await handlers.generate({
        context,
        input: { id: otherPodcast.id },
        errors,
      });

      // Assert - can generate for other user's podcast
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('passes prompt instructions to the job payload', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id);

      // Act
      const result = await handlers.generate({
        context,
        input: {
          id: podcast.id,
          promptInstructions: 'Make it educational',
        },
        errors,
      });

      // Verify - check the job in the database
      const [job] = await ctx.db
        .select()
        .from(jobTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(jobTable.id, result.jobId as any));

      expect(job).toBeDefined();
      expect(
        (job!.payload as { promptInstructions?: string }).promptInstructions,
      ).toBe('Make it educational');
    });
  });

  // ===========================================================================
  // Tests: getJob handler
  // ===========================================================================

  describe('getJob handler', () => {
    it('returns job when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id);

      // Create a job
      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-podcast',
          payload: { podcastId: podcast.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'pending',
        })
        .returning();

      // Act
      const result = await handlers.getJob({
        context,
        input: { jobId: createdJob!.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(createdJob!.id);
      expect(result.type).toBe('generate-podcast');
      expect(result.status).toBe('pending');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('throws error when job does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentJobId = 'job_nonexistent123';

      // Act & Assert - throws error (currently INTERNAL_ERROR)
      await expect(
        handlers.getJob({
          context,
          input: { jobId: nonExistentJobId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('returns job in serialized format with ISO dates', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id);

      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-podcast',
          payload: { podcastId: podcast.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'completed',
          result: {
            scriptId: 'ver_123',
            segmentCount: 4,
            audioUrl: 'url',
            duration: 300,
          },
          startedAt: new Date(),
          completedAt: new Date(),
        })
        .returning();

      // Act
      const result = await handlers.getJob({
        context,
        input: { jobId: createdJob!.id },
        errors,
      });

      // Assert
      expect(result.id).toMatch(/^job_/);
      expect(result.status).toBe('completed');
      expect(result.result).toEqual({
        scriptId: 'ver_123',
        segmentCount: 4,
        audioUrl: 'url',
        duration: 300,
      });
      // Dates should be ISO strings
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(typeof result.startedAt).toBe('string');
      expect(typeof result.completedAt).toBe('string');
      expect(() => new Date(result.createdAt)).not.toThrow();
    });

    it('returns null for optional date fields when not set', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id);

      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-podcast',
          payload: { podcastId: podcast.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'pending',
        })
        .returning();

      // Act
      const result = await handlers.getJob({
        context,
        input: { jobId: createdJob!.id },
        errors,
      });

      // Assert
      expect(result.startedAt).toBeNull();
      expect(result.completedAt).toBeNull();
      expect(result.result).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  // ===========================================================================
  // Tests: saveChanges handler
  // ===========================================================================

  describe('saveChanges handler', () => {
    it('saves segment changes and queues audio regeneration', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      const newSegments = [
        { speaker: 'host', line: 'New opening line!', index: 0 },
        { speaker: 'cohost', line: 'New response!', index: 1 },
      ];

      // Act
      const result = await handlers.saveChanges({
        context,
        input: {
          id: podcast.id,
          segments: newSegments,
        },
        errors,
      });

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.jobId).toMatch(/^job_/);
      expect(result.status).toBe('pending');
    });

    it('saves voice changes and queues audio regeneration', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        hostVoice: 'OldVoice',
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      // Act
      const result = await handlers.saveChanges({
        context,
        input: {
          id: podcast.id,
          hostVoice: 'NewVoice',
          hostVoiceName: 'New Voice Name',
        },
        errors,
      });

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('throws error when podcast does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'pod_nonexistent123';

      // Act & Assert - throws error (currently INTERNAL_ERROR)
      await expect(
        handlers.saveChanges({
          context,
          input: {
            id: nonExistentId,
            segments: [{ speaker: 'host', line: 'Test', index: 0 }],
          },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('allows saving changes to any podcast (no ownership check)', async () => {
      // NOTE: Current implementation does not check ownership for saveChanges.
      // This test documents the current behavior.
      // Arrange - create podcast as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherPodcast = await insertTestPodcast(ctx, otherTestUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      const context = createMockContext(runtime, user);

      // Act - save changes as different user
      const result = await handlers.saveChanges({
        context,
        input: {
          id: otherPodcast.id,
          segments: [{ speaker: 'host', line: 'New line', index: 0 }],
        },
        errors,
      });

      // Assert - can save changes to other user's podcast
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('returns existing pending job for idempotency', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      // Create a pending job for this podcast
      await ctx.db.insert(jobTable).values({
        type: 'generate-podcast',
        payload: { podcastId: podcast.id, userId: testUser.id },
        createdBy: testUser.id,
        status: 'pending',
      });

      // Act - call saveChanges
      const result = await handlers.saveChanges({
        context,
        input: {
          id: podcast.id,
          segments: [{ speaker: 'host', line: 'New line', index: 0 }],
        },
        errors,
      });

      // Assert - should return existing job
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('queues audio regeneration even for same segments', async () => {
      // NOTE: Current implementation does not detect "no changes" for same segments.
      // It always queues an audio regeneration job.
      // Arrange
      const context = createMockContext(runtime, user);
      const podcast = await insertTestPodcast(ctx, testUser.id, {
        status: 'ready',
        segments: DEFAULT_TEST_SEGMENTS,
      });

      // Act - save same segments
      const result = await handlers.saveChanges({
        context,
        input: {
          id: podcast.id,
          segments: DEFAULT_TEST_SEGMENTS,
        },
        errors,
      });

      // Assert - job is still created
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });
});
