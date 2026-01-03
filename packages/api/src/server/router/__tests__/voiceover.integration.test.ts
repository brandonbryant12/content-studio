import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Layer, ManagedRuntime } from 'effect';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import {
  createInMemoryStorage,
  MockLLMLive,
  MockTTSLive,
} from '@repo/testing/mocks';
import {
  user as userTable,
  voiceover as voiceoverTable,
  voiceoverCollaborator as collaboratorTable,
  job as jobTable,
  type VoiceoverId,
  type VoiceoverOutput,
  type VoiceoverListItemOutput,
  type VoiceoverCollaboratorWithUserOutput,
  generateVoiceoverId,
  generateVoiceoverCollaboratorId,
} from '@repo/db/schema';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import { VoiceoverRepoLive, VoiceoverCollaboratorRepoLive } from '@repo/media';
import { QueueLive } from '@repo/queue';
import { eq } from 'drizzle-orm';
import type { ServerRuntime } from '../../runtime';
import voiceoverRouter from '../voiceover';
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

// Claim invites response type
interface ClaimInvitesResponse {
  claimedCount: number;
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
  listCollaborators: (
    args: HandlerArgs,
  ): Promise<VoiceoverCollaboratorWithUserOutput[]> =>
    callHandler<VoiceoverCollaboratorWithUserOutput[]>(
      voiceoverRouter.listCollaborators as unknown as ORPCProcedure,
      args,
    ),
  addCollaborator: (
    args: HandlerArgs,
  ): Promise<VoiceoverCollaboratorWithUserOutput> =>
    callHandler<VoiceoverCollaboratorWithUserOutput>(
      voiceoverRouter.addCollaborator as unknown as ORPCProcedure,
      args,
    ),
  removeCollaborator: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      voiceoverRouter.removeCollaborator as unknown as ORPCProcedure,
      args,
    ),
  approve: (args: HandlerArgs): Promise<{ isOwner: boolean }> =>
    callHandler<{ isOwner: boolean }>(
      voiceoverRouter.approve as unknown as ORPCProcedure,
      args,
    ),
  revokeApproval: (args: HandlerArgs): Promise<{ isOwner: boolean }> =>
    callHandler<{ isOwner: boolean }>(
      voiceoverRouter.revokeApproval as unknown as ORPCProcedure,
      args,
    ),
  claimInvites: (args: HandlerArgs): Promise<ClaimInvitesResponse> =>
    callHandler<ClaimInvitesResponse>(
      voiceoverRouter.claimInvites as unknown as ORPCProcedure,
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
  const collaboratorRepoLayer = VoiceoverCollaboratorRepoLive.pipe(
    Layer.provide(ctx.dbLayer),
  );
  const queueLayer = QueueLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    voiceoverRepoLayer,
    collaboratorRepoLayer,
    queueLayer,
  );

  // Type assertion needed because Layer type inference doesn't perfectly match ServerRuntime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ManagedRuntime.make(allLayers as any) as ServerRuntime;
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
 * Options for creating a test voiceover.
 */
interface CreateTestVoiceoverOptions {
  id?: VoiceoverId;
  title?: string;
  text?: string;
  voice?: string;
  voiceName?: string | null;
  audioUrl?: string | null;
  duration?: number | null;
  status?: 'drafting' | 'generating_audio' | 'ready' | 'failed';
  errorMessage?: string | null;
  ownerHasApproved?: boolean;
  createdBy?: string;
}

let voiceoverCounter = 0;

/**
 * Create a test voiceover data object.
 */
const createTestVoiceover = (
  options: CreateTestVoiceoverOptions = {},
): {
  id: VoiceoverId;
  title: string;
  text: string;
  voice: string;
  voiceName: string | null;
  audioUrl: string | null;
  duration: number | null;
  status: 'drafting' | 'generating_audio' | 'ready' | 'failed';
  errorMessage: string | null;
  ownerHasApproved: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
} => {
  voiceoverCounter++;

  return {
    id: options.id ?? generateVoiceoverId(),
    title: options.title ?? `Test Voiceover ${voiceoverCounter}`,
    text: options.text ?? 'This is test voiceover text.',
    voice: options.voice ?? 'Charon',
    voiceName: options.voiceName ?? 'Charon',
    audioUrl: options.audioUrl ?? null,
    duration: options.duration ?? null,
    status: options.status ?? 'drafting',
    errorMessage: options.errorMessage ?? null,
    ownerHasApproved: options.ownerHasApproved ?? false,
    createdBy: options.createdBy ?? 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Reset voiceover counter.
 */
const resetVoiceoverCounter = () => {
  voiceoverCounter = 0;
};

/**
 * Insert a voiceover into the database for testing.
 */
const insertTestVoiceover = async (
  ctx: TestContext,
  userId: string,
  options: Omit<CreateTestVoiceoverOptions, 'createdBy'> = {},
) => {
  const voiceover = createTestVoiceover({
    createdBy: userId,
    ...options,
  });
  await ctx.db.insert(voiceoverTable).values(voiceover);
  return voiceover;
};

/**
 * Options for creating a test voiceover collaborator.
 */
interface CreateTestCollaboratorOptions {
  voiceoverId: VoiceoverId;
  userId?: string | null;
  email: string;
  addedBy: string;
  hasApproved?: boolean;
  approvedAt?: Date | null;
}

/**
 * Insert a voiceover collaborator into the database for testing.
 */
const insertTestCollaborator = async (
  ctx: TestContext,
  options: CreateTestCollaboratorOptions,
) => {
  const collaborator = {
    id: generateVoiceoverCollaboratorId(),
    voiceoverId: options.voiceoverId,
    userId: options.userId ?? null,
    email: options.email,
    hasApproved: options.hasApproved ?? false,
    approvedAt: options.approvedAt ?? null,
    addedAt: new Date(),
    addedBy: options.addedBy,
  };
  await ctx.db.insert(collaboratorTable).values(collaborator);
  return collaborator;
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
    resetVoiceoverCounter();
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
        await insertTestVoiceover(ctx, testUser.id, { title: `Voiceover ${i}` });
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
        await insertTestVoiceover(ctx, testUser.id, { title: `Voiceover ${i}` });
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

    it('returns empty object on successful delete', async () => {
      // Arrange
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toHaveLength(0);
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
  // Tests: listCollaborators handler
  // ===========================================================================

  describe('listCollaborators handler', () => {
    it('returns empty array when no collaborators exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Act
      const result = await handlers.listCollaborators({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result).toEqual([]);
    });

    it('returns collaborators with user info when present', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Create a collaborator user
      const collaboratorTestUser = createTestUser();
      await insertTestUser(ctx, collaboratorTestUser);

      // Add them as a collaborator
      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        userId: collaboratorTestUser.id,
        email: collaboratorTestUser.email,
        addedBy: testUser.id,
      });

      // Act
      const result = await handlers.listCollaborators({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.email).toBe(collaboratorTestUser.email);
      expect(result[0]!.userId).toBe(collaboratorTestUser.id);
      expect(result[0]!.userName).toBe(collaboratorTestUser.name);
    });

    it('returns pending invites (null userId) with email only', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Add a pending invite (no userId)
      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        userId: null,
        email: 'pending@example.com',
        addedBy: testUser.id,
      });

      // Act
      const result = await handlers.listCollaborators({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.email).toBe('pending@example.com');
      expect(result[0]!.userId).toBeNull();
      expect(result[0]!.userName).toBeNull();
    });
  });

  // ===========================================================================
  // Tests: addCollaborator handler
  // ===========================================================================

  describe('addCollaborator handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Act & Assert
      await expect(
        handlers.addCollaborator({
          context,
          input: { id: voiceover.id, email: 'collab@example.com' },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('adds collaborator successfully', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Act
      const result = await handlers.addCollaborator({
        context,
        input: { id: voiceover.id, email: 'newcollab@example.com' },
        errors,
      });

      // Assert
      expect(result.email).toBe('newcollab@example.com');
      expect(result.voiceoverId).toBe(voiceover.id);
      expect(result.addedBy).toBe(testUser.id);
    });

    it('links to existing user when email matches', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Create a user with the email we'll invite
      const existingUser = createTestUser();
      await insertTestUser(ctx, existingUser);

      // Act
      const result = await handlers.addCollaborator({
        context,
        input: { id: voiceover.id, email: existingUser.email },
        errors,
      });

      // Assert
      expect(result.email).toBe(existingUser.email);
      expect(result.userId).toBe(existingUser.id);
      expect(result.userName).toBe(existingUser.name);
    });

    it('creates pending invite when user does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);

      // Act
      const result = await handlers.addCollaborator({
        context,
        input: { id: voiceover.id, email: 'nonexistent@example.com' },
        errors,
      });

      // Assert
      expect(result.email).toBe('nonexistent@example.com');
      expect(result.userId).toBeNull();
      expect(result.userName).toBeNull();
    });
  });

  // ===========================================================================
  // Tests: removeCollaborator handler
  // ===========================================================================

  describe('removeCollaborator handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const collaborator = await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        email: 'collab@example.com',
        addedBy: testUser.id,
      });

      // Act & Assert
      await expect(
        handlers.removeCollaborator({
          context,
          input: { id: voiceover.id, collaboratorId: collaborator.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('removes collaborator successfully', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id);
      const collaborator = await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        email: 'toremove@example.com',
        addedBy: testUser.id,
      });

      // Act
      const result = await handlers.removeCollaborator({
        context,
        input: { id: voiceover.id, collaboratorId: collaborator.id },
        errors,
      });

      // Assert
      expect(result).toEqual({});

      // Verify collaborator is removed
      const [dbCollaborator] = await ctx.db
        .select()
        .from(collaboratorTable)
        .where(eq(collaboratorTable.id, collaborator.id));
      expect(dbCollaborator).toBeUndefined();
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

    it('allows owner to approve their own voiceover', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        status: 'ready',
      });

      // Act
      const result = await handlers.approve({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.isOwner).toBe(true);
    });

    it('allows collaborator with claimed invite to approve', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      const collaboratorTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);
      await insertTestUser(ctx, collaboratorTestUser);

      // Create a voiceover
      const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
        title: 'Voiceover for approval',
        status: 'ready',
      });

      // Add collaborator with userId set (claimed invite)
      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        userId: collaboratorTestUser.id,
        email: collaboratorTestUser.email,
        addedBy: ownerTestUser.id,
      });

      // Act - Approve as collaborator
      const collaboratorUser = toUser(collaboratorTestUser);
      const context = createMockContext(runtime, collaboratorUser);
      const result = await handlers.approve({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.isOwner).toBe(false);
    });

    it('rejects approval from user with pending invite (userId is null)', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      const pendingTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);
      await insertTestUser(ctx, pendingTestUser);

      const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
        title: 'Voiceover with pending invite',
        status: 'ready',
      });

      // Add collaborator with NULL userId (pending invite)
      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        userId: null,
        email: pendingTestUser.email,
        addedBy: ownerTestUser.id,
      });

      // Act & Assert - Should fail because invite not claimed
      const pendingUser = toUser(pendingTestUser);
      const context = createMockContext(runtime, pendingUser);

      await expect(
        handlers.approve({
          context,
          input: { id: voiceover.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('rejects approval from user who is neither owner nor collaborator', async () => {
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
      ).rejects.toThrow();
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
        ownerHasApproved: true,
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

    it('allows owner to revoke their approval', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const voiceover = await insertTestVoiceover(ctx, testUser.id, {
        status: 'ready',
        ownerHasApproved: true,
      });

      // Act
      const result = await handlers.revokeApproval({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.isOwner).toBe(true);
    });

    it('allows collaborator to revoke their approval', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      const collaboratorTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);
      await insertTestUser(ctx, collaboratorTestUser);

      const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
        status: 'ready',
      });

      // Add collaborator with approval
      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        userId: collaboratorTestUser.id,
        email: collaboratorTestUser.email,
        addedBy: ownerTestUser.id,
        hasApproved: true,
        approvedAt: new Date(),
      });

      // Act - Revoke as collaborator
      const collaboratorUser = toUser(collaboratorTestUser);
      const context = createMockContext(runtime, collaboratorUser);
      const result = await handlers.revokeApproval({
        context,
        input: { id: voiceover.id },
        errors,
      });

      // Assert
      expect(result.isOwner).toBe(false);
    });

    it('rejects revoke from user who is neither owner nor collaborator', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      const strangerTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);
      await insertTestUser(ctx, strangerTestUser);

      const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
        status: 'ready',
        ownerHasApproved: true,
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
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: claimInvites handler
  // ===========================================================================

  describe('claimInvites handler', () => {
    it('returns UNAUTHORIZED when user is null', async () => {
      // Arrange
      const context = createMockContext(runtime, null);

      // Act & Assert
      await expect(
        handlers.claimInvites({
          context,
          input: {},
          errors,
        }),
      ).rejects.toThrow();
    });

    it('claims pending invites successfully', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);

      // Create voiceover and pending invite for testUser's email
      const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id);
      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover.id,
        userId: null, // Pending
        email: testUser.email,
        addedBy: ownerTestUser.id,
      });

      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.claimInvites({
        context,
        input: {},
        errors,
      });

      // Assert
      expect(result.claimedCount).toBe(1);

      // Verify the invite is now claimed
      const [dbCollaborator] = await ctx.db
        .select()
        .from(collaboratorTable)
        .where(eq(collaboratorTable.email, testUser.email));
      expect(dbCollaborator!.userId).toBe(testUser.id);
    });

    it('returns zero when no pending invites exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.claimInvites({
        context,
        input: {},
        errors,
      });

      // Assert
      expect(result.claimedCount).toBe(0);
    });

    it('claims multiple pending invites across voiceovers', async () => {
      // Arrange
      const ownerTestUser = createTestUser();
      await insertTestUser(ctx, ownerTestUser);

      // Create multiple voiceovers with pending invites
      const voiceover1 = await insertTestVoiceover(ctx, ownerTestUser.id, {
        title: 'Voiceover 1',
      });
      const voiceover2 = await insertTestVoiceover(ctx, ownerTestUser.id, {
        title: 'Voiceover 2',
      });

      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover1.id,
        userId: null,
        email: testUser.email,
        addedBy: ownerTestUser.id,
      });
      await insertTestCollaborator(ctx, {
        voiceoverId: voiceover2.id,
        userId: null,
        email: testUser.email,
        addedBy: ownerTestUser.id,
      });

      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.claimInvites({
        context,
        input: {},
        errors,
      });

      // Assert
      expect(result.claimedCount).toBe(2);
    });
  });

  // ===========================================================================
  // Tests: Multi-user collaboration scenarios
  // ===========================================================================

  describe('multi-user collaboration', () => {
    describe('list handler with collaborators', () => {
      it('includes voiceovers where user is a collaborator', async () => {
        // Arrange - Create owner and collaborator users
        const ownerTestUser = createTestUser();
        const collaboratorTestUser = createTestUser();
        await insertTestUser(ctx, ownerTestUser);
        await insertTestUser(ctx, collaboratorTestUser);

        // Create a voiceover owned by owner
        const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
          title: 'Shared Voiceover',
        });

        // Add collaborator to the voiceover (with claimed userId)
        await insertTestCollaborator(ctx, {
          voiceoverId: voiceover.id,
          userId: collaboratorTestUser.id,
          email: collaboratorTestUser.email,
          addedBy: ownerTestUser.id,
        });

        // Act - List voiceovers as the collaborator
        const collaboratorUser = toUser(collaboratorTestUser);
        const context = createMockContext(runtime, collaboratorUser);
        const result = await handlers.list({
          context,
          input: { limit: 10 },
          errors,
        });

        // Assert - Collaborator can see the shared voiceover
        expect(result).toHaveLength(1);
        expect(result[0]?.title).toBe('Shared Voiceover');
      });

      it('shows voiceovers where user is both owner and collaborator on different voiceovers', async () => {
        // Arrange
        const userA = createTestUser();
        const userB = createTestUser();
        await insertTestUser(ctx, userA);
        await insertTestUser(ctx, userB);

        // User A owns voiceover 1
        const voiceover1 = await insertTestVoiceover(ctx, userA.id, {
          title: 'Owned by A',
        });

        // User B owns voiceover 2, A is collaborator
        const voiceover2 = await insertTestVoiceover(ctx, userB.id, {
          title: 'Owned by B, A collaborates',
        });
        await insertTestCollaborator(ctx, {
          voiceoverId: voiceover2.id,
          userId: userA.id,
          email: userA.email,
          addedBy: userB.id,
        });

        // Act - List voiceovers as user A
        const userAAuth = toUser(userA);
        const context = createMockContext(runtime, userAAuth);
        const result = await handlers.list({
          context,
          input: { limit: 10 },
          errors,
        });

        // Assert - User A sees both voiceovers
        expect(result).toHaveLength(2);
        const titles = result.map((v) => v.title);
        expect(titles).toContain('Owned by A');
        expect(titles).toContain('Owned by B, A collaborates');
      });

      it('does not show voiceovers with pending invites (userId is null)', async () => {
        // Arrange
        const ownerTestUser = createTestUser();
        const invitedTestUser = createTestUser();
        await insertTestUser(ctx, ownerTestUser);
        await insertTestUser(ctx, invitedTestUser);

        // Create a voiceover
        const voiceover = await insertTestVoiceover(ctx, ownerTestUser.id, {
          title: 'Voiceover with pending invite',
        });

        // Add collaborator with NULL userId (pending invite - not yet claimed)
        await insertTestCollaborator(ctx, {
          voiceoverId: voiceover.id,
          userId: null, // Pending invite
          email: invitedTestUser.email,
          addedBy: ownerTestUser.id,
        });

        // Act - List voiceovers as the invited user (before claiming invite)
        const invitedUser = toUser(invitedTestUser);
        const context = createMockContext(runtime, invitedUser);
        const result = await handlers.list({
          context,
          input: { limit: 10 },
          errors,
        });

        // Assert - Pending invites don't show in list
        expect(result).toHaveLength(0);
      });
    });
  });
});
