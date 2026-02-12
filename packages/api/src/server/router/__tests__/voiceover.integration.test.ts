import { MockLLMLive, MockTTSLive } from '@repo/ai/testing';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  user as userTable,
  voiceover as voiceoverTable,
  job as jobTable,
  type VoiceoverId,
  type VoiceoverOutput,
  type VoiceoverListItemOutput,
} from '@repo/db/schema';
import { VoiceoverRepoLive } from '@repo/media';
import { QueueLive } from '@repo/queue';
import { createInMemoryStorage } from '@repo/storage/testing';
import {
  createTestContext,
  createTestUser,
  createTestVoiceover,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { eq } from 'drizzle-orm';
import { Layer } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import voiceoverRouter from '../voiceover';
import {
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
} from './helpers';

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

// Typed handler accessors for voiceover router
const handlers = {
  create: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.create as unknown as ORPCProcedure,
      args,
    ),
  list: (args: HandlerArgs): Promise<VoiceoverListItemOutput[]> =>
    callHandler<VoiceoverListItemOutput[]>(
      voiceoverRouter.list as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.get as unknown as ORPCProcedure,
      args,
    ),
  update: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.update as unknown as ORPCProcedure,
      args,
    ),
  delete: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      voiceoverRouter.delete as unknown as ORPCProcedure,
      args,
    ),
  generate: (args: HandlerArgs): Promise<GenerateResponse> =>
    callHandler<GenerateResponse>(
      voiceoverRouter.generate as unknown as ORPCProcedure,
      args,
    ),
  getJob: (args: HandlerArgs): Promise<JobOutput> =>
    callHandler<JobOutput>(
      voiceoverRouter.getJob as unknown as ORPCProcedure,
      args,
    ),
  approve: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.approve as unknown as ORPCProcedure,
      args,
    ),
  revokeApproval: (args: HandlerArgs): Promise<VoiceoverOutput> =>
    callHandler<VoiceoverOutput>(
      voiceoverRouter.revokeApproval as unknown as ORPCProcedure,
      args,
    ),
};

// =============================================================================
// Test Setup
// =============================================================================

/**
 * In-memory storage instance for voiceover audio.
 * Shared across tests and cleared in beforeEach.
 */
let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create a minimal test runtime with only the services needed for voiceover operations.
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
  const voiceoverRepoLayer = VoiceoverRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    voiceoverRepoLayer,
    queueLayer,
  );

  return createTestServerRuntime(allLayers);
};

/**
 * Insert a user into the database for testing.
 * Required because voiceovers have a foreign key to the user table.
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
 * Insert a voiceover into the database for testing.
 */
const insertTestVoiceover = async (
  ctx: TestContext,
  userId: string,
  options: Omit<Parameters<typeof createTestVoiceover>[0], 'createdBy'> = {},
) => {
  const voiceover = createTestVoiceover({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(voiceoverTable).values(voiceover);
  return voiceover;
};

// =============================================================================
// Tests
// =============================================================================

describe('voiceover router', () => {
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
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);

      // Act & Assert
      await expect(
        handlers.list({
          context,
          input: { limit: 10, offset: 0 },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('returns empty array when no voiceovers exist', async () => {
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

    it('returns paginated voiceovers for the authenticated user', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create some voiceovers for this user
      await insertTestVoiceover(ctx, testUser.id, { title: 'Voiceover One' });
      await insertTestVoiceover(ctx, testUser.id, { title: 'Voiceover Two' });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map((v) => v.title)).toContain('Voiceover One');
      expect(result.map((v) => v.title)).toContain('Voiceover Two');
    });

    it('respects limit parameter', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create 5 voiceovers
      for (let i = 1; i <= 5; i++) {
        await insertTestVoiceover(ctx, testUser.id, {
          title: `Voiceover ${i}`,
        });
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

      // Create 5 voiceovers
      for (let i = 1; i <= 5; i++) {
        await insertTestVoiceover(ctx, testUser.id, {
          title: `Voiceover ${i}`,
        });
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

    it('only returns voiceovers owned by the user, not other users voiceovers', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create voiceover for current user
      await insertTestVoiceover(ctx, testUser.id, { title: 'My Voiceover' });

      // Create another user and their voiceover
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      await insertTestVoiceover(ctx, otherTestUser.id, {
        title: 'Other User Voiceover',
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert - filtering by userId should only return current user's voiceovers
      const myVoiceovers = result.filter((v) => v.createdBy === testUser.id);
      expect(myVoiceovers).toHaveLength(1);
      expect(myVoiceovers[0]!.title).toBe('My Voiceover');
    });

    it('returns voiceovers in serialized format with ISO date strings', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      await insertTestVoiceover(ctx, testUser.id, {
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
      expect(returned.id).toMatch(/^voc_/);
      expect(returned.title).toBe('Serialization Test');
      expect(returned.voice).toBeDefined();
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
      await insertTestVoiceover(ctx, testUser.id, {
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
    it('returns voiceover when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Found Voiceover',
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(voiceover.id);
      expect(result.title).toBe('Found Voiceover');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('throws error when voiceover does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'voc_nonexistent123' as VoiceoverId;

      // Act & Assert
      await expect(
        handlers.get({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it("rejects access to another user's voiceover (ownership check)", async () => {
      // Arrange - create voiceover as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherTestUser.id, {
        title: 'Other User Voiceover',
      });

      // Act & Assert - non-owner cannot access
      const context = createMockContext(runtime, user);

      await expect(
        handlers.get({
          context,
          input: { id: otherVoiceover.id },
          errors,
        }),
      ).rejects.toThrow('do not own');
    });

    it('allows admin to access any voiceover', async () => {
      // Arrange - create voiceover as regular user
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Regular User Voiceover',
      });

      // Create admin user
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);

      // Act - admin accesses another user's voiceover
      const result = await handlers.get({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(voiceover.id);
      expect(result.title).toBe('Regular User Voiceover');
    });

    it('returns voiceover in serialized format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Full Format Test',
        text: 'Some voiceover text content',
        status: 'ready',
        voice: 'Kore',
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(voiceover.id);
      expect(result.title).toBe('Full Format Test');
      expect(result.text).toBe('Some voiceover text content');
      expect(result.status).toBe('ready');
      expect(result.voice).toBe('Kore');
      // Dates should be ISO strings
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
    });
  });

  // ===========================================================================
  // Tests: create handler
  // ===========================================================================

  describe('create handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);

      // Act & Assert
      await expect(
        handlers.create({
          context,
          input: { title: 'New Voiceover' },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('creates voiceover with title', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'My New Voiceover',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('My New Voiceover');
      expect(result.createdBy).toBe(testUser.id);
      expect(result.status).toBe('drafting');
    });

    it('returns serialized voiceover response with proper format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Format Test',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert - id starts with voc_
      expect(result.id).toMatch(/^voc_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(() => new Date(result.createdAt)).not.toThrow();
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string
      expect(typeof result.updatedAt).toBe('string');
      expect(() => new Date(result.updatedAt)).not.toThrow();
    });

    it('persists voiceover to database', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Persistence Test',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Verify - query database directly
      const [dbVoiceover] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, result.id as VoiceoverId));

      expect(dbVoiceover).toBeDefined();
      expect(dbVoiceover!.title).toBe('Persistence Test');
      expect(dbVoiceover!.createdBy).toBe(testUser.id);
    });
  });

  // ===========================================================================
  // Tests: update handler
  // ===========================================================================

  describe('update handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Act & Assert
      await expect(
        handlers.update({
          context,
          input: { id: voiceover.id, title: 'Updated' },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('updates voiceover title', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Original Title',
      });
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: voiceover.id,
          title: 'Updated Title',
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.id).toBe(voiceover.id);
    });

    it('updates voiceover text', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: voiceover.id,
          text: 'New voiceover text content',
        },
        errors,
      });

      // Assert
      expect(result.text).toBe('New voiceover text content');
    });

    it('updates voiceover voice', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        voice: 'Charon',
      });
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: voiceover.id,
          voice: 'Kore',
          voiceName: 'Kore',
        },
        errors,
      });

      // Assert
      expect(result.voice).toBe('Kore');
      expect(result.voiceName).toBe('Kore');
    });

    it('updates multiple fields at once', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: voiceover.id,
          title: 'New Title',
          text: 'New text content',
          voice: 'Fenrir',
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('New Title');
      expect(result.text).toBe('New text content');
      expect(result.voice).toBe('Fenrir');
    });

    it('returns serialized updated voiceover', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: voiceover.id,
          title: 'Serialized Update',
        },
        errors,
      });

      // Assert - id starts with voc_
      expect(result.id).toMatch(/^voc_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string
      expect(typeof result.updatedAt).toBe('string');
      expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws error when voiceover does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'voc_00000000000000' as VoiceoverId;

      // Act & Assert
      await expect(
        handlers.update({
          context,
          input: { id: nonExistentId, title: 'Should Fail' },
          errors,
        }),
      ).rejects.toThrow();
    });

    it("rejects updating another user's voiceover (ownership check)", async () => {
      // Arrange - create voiceover as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherTestUser.id, {
        title: 'Original Title',
      });

      const context = createMockContext(runtime, user);

      // Act & Assert - non-owner cannot update
      await expect(
        handlers.update({
          context,
          input: { id: otherVoiceover.id, title: 'Updated Title' },
          errors,
        }),
      ).rejects.toThrow('do not own');
    });

    it('allows admin to update any voiceover', async () => {
      // Arrange - create voiceover as regular user
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        title: 'Original Title',
      });

      // Create admin user
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);

      // Act - admin updates another user's voiceover
      const result = await handlers.update({
        context,
        input: { id: voiceover.id, title: 'Admin Updated' },
        errors,
      });

      // Assert
      expect(result.id).toBe(voiceover.id);
      expect(result.title).toBe('Admin Updated');
    });

    it('persists updates to database', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      await handlers.update({
        context,
        input: {
          id: voiceover.id,
          title: 'Persisted Title',
        },
        errors,
      });

      // Verify - query database directly
      const [dbVoiceover] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));

      expect(dbVoiceover).toBeDefined();
      expect(dbVoiceover!.title).toBe('Persisted Title');
    });
  });

  // ===========================================================================
  // Tests: delete handler
  // ===========================================================================

  describe('delete handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Act & Assert
      await expect(
        handlers.delete({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('deletes voiceover successfully', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert - returns empty object on success
      expect(result).toEqual({});
    });

    it('throws error when voiceover does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'voc_00000000000000' as VoiceoverId;

      // Act & Assert
      await expect(
        handlers.delete({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it("rejects deleting another user's voiceover (ownership check)", async () => {
      // Arrange - create voiceover as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherTestUser.id);

      const context = createMockContext(runtime, user);

      // Act & Assert - non-owner cannot delete
      await expect(
        handlers.delete({
          context,
          input: { id: otherVoiceover.id },
          errors,
        }),
      ).rejects.toThrow('do not own');
    });

    it('allows admin to delete any voiceover', async () => {
      // Arrange - create voiceover as regular user
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Create admin user
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);

      // Act - admin deletes another user's voiceover
      const result = await handlers.delete({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert - delete succeeded
      expect(result).toEqual({});

      // Verify - voiceover is gone
      const [afterDelete] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(afterDelete).toBeUndefined();
    });

    it('verifies voiceover is actually removed from database after delete', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Verify voiceover exists before delete
      const [beforeDelete] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(beforeDelete).toBeDefined();

      // Act
      await handlers.delete({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert - voiceover no longer exists in database
      const [afterDelete] = await ctx.db
        .select()
        .from(voiceoverTable)
        .where(eq(voiceoverTable.id, voiceover.id));
      expect(afterDelete).toBeUndefined();
    });

    it('cannot delete same voiceover twice', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // First delete succeeds
      await handlers.delete({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Act & Assert - second delete fails
      await expect(
        handlers.delete({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: generate handler
  // ===========================================================================

  describe('generate handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Some text to generate',
        status: 'drafting',
      });

      // Act & Assert
      await expect(
        handlers.generate({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('creates a generation job for the voiceover', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Some text to generate audio for',
        status: 'drafting',
      });

      // Act
      const result = await handlers.generate({
        context,
        input: { id: voiceover.id },
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
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Some text to generate',
        status: 'drafting',
      });

      // Create a pending job for this voiceover
      await ctx.db.insert(jobTable).values({
        type: 'generate-voiceover',
        payload: { voiceoverId: voiceover.id, userId: testUser.id },
        createdBy: testUser.id,
        status: 'pending',
      });

      // Act - call generate again
      const result = await handlers.generate({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert - should return existing job
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('throws error when voiceover does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'voc_nonexistent123' as VoiceoverId;

      // Act & Assert
      await expect(
        handlers.generate({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it("rejects generating another user's voiceover (ownership check)", async () => {
      // Arrange - create voiceover as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherVoiceover = await insertTestVoiceover(ctx, otherTestUser.id, {
        text: 'Some text to generate',
        status: 'drafting',
      });

      const context = createMockContext(runtime, user);

      // Act & Assert - non-owner cannot generate
      await expect(
        handlers.generate({
          context,
          input: { id: otherVoiceover.id },
          errors,
        }),
      ).rejects.toThrow('do not own');
    });

    it('allows admin to generate any voiceover', async () => {
      // Arrange - create voiceover as regular user
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        text: 'Some text to generate audio for',
        status: 'drafting',
      });

      // Create admin user
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);

      // Act - admin generates another user's voiceover
      const result = await handlers.generate({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });
  });

  // ===========================================================================
  // Tests: getJob handler
  // ===========================================================================

  describe('getJob handler', () => {
    it('returns job when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Create a job
      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-voiceover',
          payload: { voiceoverId: voiceover.id, userId: testUser.id },
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
      expect(result.type).toBe('generate-voiceover');
      expect(result.status).toBe('pending');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('throws error when job does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentJobId = 'job_nonexistent123';

      // Act & Assert
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
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-voiceover',
          payload: { voiceoverId: voiceover.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'completed',
          result: {
            voiceoverId: voiceover.id,
            audioUrl: 'https://example.com/audio.wav',
            duration: 120,
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
        voiceoverId: voiceover.id,
        audioUrl: 'https://example.com/audio.wav',
        duration: 120,
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
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-voiceover',
          payload: { voiceoverId: voiceover.id, userId: testUser.id },
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
  // Tests: approve handler
  // ===========================================================================

  describe('approve handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Act & Assert
      await expect(
        handlers.approve({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('allows admin to approve a voiceover', async () => {
      // Arrange
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);

      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        status: 'ready',
      });

      // Act - Approve as admin
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);
      const result = await handlers.approve({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(voiceover.id);
    });

    it('rejects approval from non-admin', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      const strangerTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);
      await insertTestUser(ctx, strangerTestUser);

      const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
        title: 'Private voiceover',
        status: 'ready',
      });

      // Act & Assert - Stranger cannot approve
      const strangerUser = toUser(strangerTestUser);
      const context = createMockContext(runtime, strangerUser);

      await expect(
        handlers.approve({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow('admin role');
    });
  });

  // ===========================================================================
  // Tests: revokeApproval handler
  // ===========================================================================

  describe('revokeApproval handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        approvedBy: testUser.id,
        approvedAt: new Date(),
      });

      // Act & Assert
      await expect(
        handlers.revokeApproval({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('allows admin to revoke approval', async () => {
      // Arrange
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);

      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        status: 'ready',
        approvedBy: testUser.id,
        approvedAt: new Date(),
      });

      // Act - Revoke as admin
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);
      const result = await handlers.revokeApproval({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(voiceover.id);
    });

    it('rejects revoke from non-admin', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      const strangerTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);
      await insertTestUser(ctx, strangerTestUser);

      const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
        status: 'ready',
        approvedBy: ownerTestUser.id,
        approvedAt: new Date(),
      });

      // Act & Assert - Stranger cannot revoke
      const strangerUser = toUser(strangerTestUser);
      const context = createMockContext(runtime, strangerUser);

      await expect(
        handlers.revokeApproval({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow('admin role');
    });
  });
});
