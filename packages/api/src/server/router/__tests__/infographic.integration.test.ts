import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  user as userTable,
  document as documentTable,
  infographic as infographicTable,
  infographicSelection as selectionTable,
  job as jobTable,
  generateInfographicId,
  generateInfographicSelectionId,
  type Infographic,
  type InfographicSelection,
  type InfographicId,
  type InfographicSelectionId,
  type DocumentId,
  type InfographicFullOutput,
  type InfographicOutput,
  type InfographicListItemOutput,
  type InfographicSelectionOutput,
} from '@repo/db/schema';
import {
  InfographicRepoLive,
  SelectionRepoLive,
  DocumentRepoLive,
} from '@repo/media';
import { QueueLive } from '@repo/queue';
import {
  createTestContext,
  createTestUser,
  createTestDocument,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import {
  createInMemoryStorage,
  MockLLMLive,
  MockImageLive,
} from '@repo/testing/mocks';
import { eq } from 'drizzle-orm';
import { Layer, ManagedRuntime } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import infographicRouter from '../infographic';
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

// List response type
interface ListResponse {
  items: InfographicListItemOutput[];
  total: number;
  limit: number;
  offset: number;
}

// Add selection response type
interface AddSelectionResponse {
  selection: InfographicSelectionOutput;
  warningMessage: string | null;
}

// Update selection response type
interface UpdateSelectionResponse {
  selection: InfographicSelectionOutput;
}

// Reorder selections response type
interface ReorderSelectionsResponse {
  selections: InfographicSelectionOutput[];
}

// Extract key points response type
interface ExtractKeyPointsResponse {
  suggestions: Array<{
    text: string;
    documentId: string;
    documentTitle: string;
    relevance: number;
    category?: string;
  }>;
}

// Typed handler accessors for infographic router
const handlers = {
  create: (args: HandlerArgs): Promise<InfographicFullOutput> =>
    callHandler<InfographicFullOutput>(
      infographicRouter.create as unknown as ORPCProcedure,
      args,
    ),
  list: (args: HandlerArgs): Promise<ListResponse> =>
    callHandler<ListResponse>(
      infographicRouter.list as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<InfographicFullOutput> =>
    callHandler<InfographicFullOutput>(
      infographicRouter.get as unknown as ORPCProcedure,
      args,
    ),
  update: (args: HandlerArgs): Promise<InfographicOutput> =>
    callHandler<InfographicOutput>(
      infographicRouter.update as unknown as ORPCProcedure,
      args,
    ),
  delete: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      infographicRouter.delete as unknown as ORPCProcedure,
      args,
    ),
  addSelection: (args: HandlerArgs): Promise<AddSelectionResponse> =>
    callHandler<AddSelectionResponse>(
      infographicRouter.addSelection as unknown as ORPCProcedure,
      args,
    ),
  removeSelection: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      infographicRouter.removeSelection as unknown as ORPCProcedure,
      args,
    ),
  updateSelection: (args: HandlerArgs): Promise<UpdateSelectionResponse> =>
    callHandler<UpdateSelectionResponse>(
      infographicRouter.updateSelection as unknown as ORPCProcedure,
      args,
    ),
  reorderSelections: (args: HandlerArgs): Promise<ReorderSelectionsResponse> =>
    callHandler<ReorderSelectionsResponse>(
      infographicRouter.reorderSelections as unknown as ORPCProcedure,
      args,
    ),
  extractKeyPoints: (args: HandlerArgs): Promise<ExtractKeyPointsResponse> =>
    callHandler<ExtractKeyPointsResponse>(
      infographicRouter.extractKeyPoints as unknown as ORPCProcedure,
      args,
    ),
  generate: (args: HandlerArgs): Promise<GenerateResponse> =>
    callHandler<GenerateResponse>(
      infographicRouter.generate as unknown as ORPCProcedure,
      args,
    ),
  getJob: (args: HandlerArgs): Promise<JobOutput> =>
    callHandler<JobOutput>(
      infographicRouter.getJob as unknown as ORPCProcedure,
      args,
    ),
};

// =============================================================================
// Test Setup
// =============================================================================

/**
 * In-memory storage instance for infographic images.
 * Shared across tests and cleared in beforeEach.
 */
let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create a minimal test runtime with only the services needed for infographic operations.
 * Uses in-memory storage from @repo/testing to properly store and retrieve content.
 */
const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    MockLLMLive,
    MockImageLive,
    inMemoryStorage.layer,
  );
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const documentRepoLayer = DocumentRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const infographicRepoLayer = InfographicRepoLive.pipe(
    Layer.provide(ctx.dbLayer),
  );
  const selectionRepoLayer = SelectionRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const queueLayer = QueueLive.pipe(Layer.provide(ctx.dbLayer));

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    documentRepoLayer,
    infographicRepoLayer,
    selectionRepoLayer,
    queueLayer,
  );

  // Type assertion needed because Layer type inference doesn't perfectly match ServerRuntime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ManagedRuntime.make(allLayers as any) as ServerRuntime;
};

/**
 * Insert a user into the database for testing.
 * Required because infographics have a foreign key to the user table.
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
 * Required for creating infographics with source documents.
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
 * Options for creating a test infographic.
 */
interface CreateTestInfographicOptions {
  id?: InfographicId;
  title?: string;
  status?: Infographic['status'];
  infographicType?: string;
  aspectRatio?: string;
  customInstructions?: string | null;
  feedbackInstructions?: string | null;
  styleOptions?: Infographic['styleOptions'];
  imageUrl?: string | null;
  errorMessage?: string | null;
  sourceDocumentIds?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Insert an infographic into the database for testing.
 */
const insertTestInfographic = async (
  ctx: TestContext,
  userId: string,
  options: CreateTestInfographicOptions = {},
): Promise<Infographic> => {
  const now = new Date();
  const infographic: Infographic = {
    id: options.id ?? generateInfographicId(),
    title: options.title ?? 'Test Infographic',
    status: options.status ?? 'drafting',
    infographicType: options.infographicType ?? 'comparison',
    aspectRatio: options.aspectRatio ?? '1:1',
    customInstructions: options.customInstructions ?? null,
    feedbackInstructions: options.feedbackInstructions ?? null,
    styleOptions: options.styleOptions ?? null,
    imageUrl: options.imageUrl ?? null,
    errorMessage: options.errorMessage ?? null,
    sourceDocumentIds: options.sourceDocumentIds ?? [],
    generationContext: null,
    createdBy: options.createdBy ?? userId,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };
  await ctx.db.insert(infographicTable).values(infographic);
  return infographic;
};

/**
 * Options for creating a test selection.
 */
interface CreateTestSelectionOptions {
  id?: InfographicSelectionId;
  infographicId: InfographicId;
  documentId: DocumentId;
  selectedText?: string;
  startOffset?: number | null;
  endOffset?: number | null;
  orderIndex?: number;
  createdAt?: Date;
}

/**
 * Insert a selection into the database for testing.
 */
const insertTestSelection = async (
  ctx: TestContext,
  options: CreateTestSelectionOptions,
): Promise<InfographicSelection> => {
  const now = new Date();
  const selection = {
    id: options.id ?? generateInfographicSelectionId(),
    infographicId: options.infographicId,
    documentId: options.documentId,
    selectedText: options.selectedText ?? 'Test selected text',
    startOffset: options.startOffset ?? null,
    endOffset: options.endOffset ?? null,
    orderIndex: options.orderIndex ?? 0,
    createdAt: options.createdAt ?? now,
  };
  await ctx.db.insert(selectionTable).values(selection);
  // Return with proper types - need to cast documentId
  return selection as unknown as InfographicSelection;
};

// =============================================================================
// Tests
// =============================================================================

describe('infographic router', () => {
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
    it('returns empty array when no infographics exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns paginated infographics for the authenticated user', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create some infographics for this user
      await insertTestInfographic(ctx, testUser.id, {
        title: 'Infographic One',
      });
      await insertTestInfographic(ctx, testUser.id, {
        title: 'Infographic Two',
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.title)).toContain('Infographic One');
      expect(result.items.map((i) => i.title)).toContain('Infographic Two');
    });

    it('respects limit parameter', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create 5 infographics
      for (let i = 1; i <= 5; i++) {
        await insertTestInfographic(ctx, testUser.id, {
          title: `Infographic ${i}`,
        });
      }

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 3 },
        errors,
      });

      // Assert
      expect(result.items).toHaveLength(3);
      expect(result.limit).toBe(3);
    });

    it('respects offset parameter', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create 5 infographics
      for (let i = 1; i <= 5; i++) {
        await insertTestInfographic(ctx, testUser.id, {
          title: `Infographic ${i}`,
        });
      }

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 2, offset: 2 },
        errors,
      });

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.offset).toBe(2);
    });

    it('only returns infographics owned by the user', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create infographic for current user
      await insertTestInfographic(ctx, testUser.id, {
        title: 'My Infographic',
      });

      // Create another user and their infographic
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      await insertTestInfographic(ctx, otherTestUser.id, {
        title: 'Other User Infographic',
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert - should only return current user's infographics
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.title).toBe('My Infographic');
    });

    it('returns infographics in serialized format with ISO date strings', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      await insertTestInfographic(ctx, testUser.id, {
        title: 'Serialization Test',
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert
      expect(result.items).toHaveLength(1);
      const returned = result.items[0]!;

      // Verify serialized format
      expect(returned.id).toMatch(/^inf_/);
      expect(returned.title).toBe('Serialization Test');
      expect(returned.infographicType).toBeDefined();
      // Dates should be ISO strings
      expect(typeof returned.createdAt).toBe('string');
      expect(typeof returned.updatedAt).toBe('string');
      expect(() => new Date(returned.createdAt)).not.toThrow();
      expect(() => new Date(returned.updatedAt)).not.toThrow();
    });

    it('includes status and imageUrl when present', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      await insertTestInfographic(ctx, testUser.id, {
        title: 'With Status',
        status: 'ready',
        imageUrl: 'https://example.com/image.png',
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.status).toBe('ready');
      expect(result.items[0]!.imageUrl).toBe('https://example.com/image.png');
    });
  });

  // ===========================================================================
  // Tests: get handler
  // ===========================================================================

  describe('get handler', () => {
    it('returns infographic when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        title: 'Found Infographic',
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(infographic.id);
      expect(result.title).toBe('Found Infographic');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('throws error when infographic does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'inf_nonexistent12345';

      // Act & Assert
      await expect(
        handlers.get({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('returns infographic in serialized full format with selections', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id, {
        title: 'Source Doc',
      });
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        title: 'Full Format Test',
        sourceDocumentIds: [doc.id],
        status: 'ready',
      });

      // Add a selection
      await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Important text',
        orderIndex: 0,
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(infographic.id);
      expect(result.title).toBe('Full Format Test');
      expect(result.selections).toBeDefined();
      expect(result.selections).toHaveLength(1);
      expect(result.selections[0]!.selectedText).toBe('Important text');
      expect(result.status).toBe('ready');
      // Dates should be ISO strings
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
    });

    it('throws error when accessing another users infographic', async () => {
      // Arrange - create infographic as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
        {
          title: 'Other User Infographic',
        },
      );

      // Act - access as original user
      const context = createMockContext(runtime, user);

      // Assert - should fail because user doesn't own this infographic
      await expect(
        handlers.get({
          context,
          input: { id: otherInfographic.id },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: create handler
  // ===========================================================================

  describe('create handler', () => {
    it('creates infographic with title and type', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const input = {
        title: 'My New Infographic',
        infographicType: 'comparison',
        documentIds: [doc.id],
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('My New Infographic');
      expect(result.infographicType).toBe('comparison');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('creates infographic with source documents', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id, {
        title: 'Source Document',
      });
      const input = {
        title: 'Infographic with Docs',
        infographicType: 'timeline',
        documentIds: [doc.id],
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('Infographic with Docs');
      expect(result.sourceDocumentIds).toContain(doc.id);
    });

    it('creates infographic with optional aspect ratio', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const input = {
        title: 'Infographic with Aspect Ratio',
        infographicType: 'comparison',
        aspectRatio: '16:9',
        documentIds: [doc.id],
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('Infographic with Aspect Ratio');
      expect(result.aspectRatio).toBe('16:9');
    });

    it('returns serialized infographic response with proper format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const input = {
        title: 'Format Test',
        infographicType: 'comparison',
        documentIds: [doc.id],
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert - id starts with inf_
      expect(result.id).toMatch(/^inf_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(() => new Date(result.createdAt)).not.toThrow();
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string
      expect(typeof result.updatedAt).toBe('string');
      expect(() => new Date(result.updatedAt)).not.toThrow();
    });

    it('persists infographic to database', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const input = {
        title: 'Persistence Test',
        infographicType: 'comparison',
        documentIds: [doc.id],
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Verify - query database directly
      const [dbInfographic] = await ctx.db
        .select()
        .from(infographicTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(infographicTable.id, result.id as any));

      expect(dbInfographic).toBeDefined();
      expect(dbInfographic!.title).toBe('Persistence Test');
      expect(dbInfographic!.createdBy).toBe(testUser.id);
    });
  });

  // ===========================================================================
  // Tests: update handler
  // ===========================================================================

  describe('update handler', () => {
    it('updates infographic title', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        title: 'Original Title',
      });
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: infographic.id,
          title: 'Updated Title',
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.id).toBe(infographic.id);
    });

    it('updates infographic custom instructions', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: infographic.id,
          customInstructions: 'New instructions',
        },
        errors,
      });

      // Assert
      expect(result.customInstructions).toBe('New instructions');
    });

    it('updates infographic style options', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: infographic.id,
          styleOptions: {
            colorScheme: 'dark',
            emphasis: ['bold', 'italic'],
            layout: 'grid',
          },
        },
        errors,
      });

      // Assert
      expect(result.styleOptions).toEqual({
        colorScheme: 'dark',
        emphasis: ['bold', 'italic'],
        layout: 'grid',
      });
    });

    it('updates multiple fields at once', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: infographic.id,
          title: 'New Title',
          customInstructions: 'New instructions',
          aspectRatio: '4:3',
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('New Title');
      expect(result.customInstructions).toBe('New instructions');
      expect(result.aspectRatio).toBe('4:3');
    });

    it('returns serialized updated infographic', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: infographic.id,
          title: 'Serialized Update',
        },
        errors,
      });

      // Assert - id starts with inf_
      expect(result.id).toMatch(/^inf_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string
      expect(typeof result.updatedAt).toBe('string');
      expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws error when infographic does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'inf_00000000000000';

      // Act & Assert
      await expect(
        handlers.update({
          context,
          input: { id: nonExistentId, title: 'Should Fail' },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('throws error when updating another users infographic', async () => {
      // Arrange - create infographic as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
        {
          title: 'Original Title',
        },
      );

      const context = createMockContext(runtime, user);

      // Act & Assert - should fail because user doesn't own this infographic
      await expect(
        handlers.update({
          context,
          input: { id: otherInfographic.id, title: 'Updated Title' },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('persists updates to database', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      await handlers.update({
        context,
        input: {
          id: infographic.id,
          title: 'Persisted Title',
        },
        errors,
      });

      // Verify - query database directly
      const [dbInfographic] = await ctx.db
        .select()
        .from(infographicTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(infographicTable.id, infographic.id as any));

      expect(dbInfographic).toBeDefined();
      expect(dbInfographic!.title).toBe('Persisted Title');
    });
  });

  // ===========================================================================
  // Tests: delete handler
  // ===========================================================================

  describe('delete handler', () => {
    it('deletes infographic successfully', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert - returns empty object on success
      expect(result).toEqual({});
    });

    it('returns empty object on successful delete', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('throws error when infographic does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'inf_00000000000000';

      // Act & Assert
      await expect(
        handlers.delete({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('throws error when deleting another users infographic', async () => {
      // Arrange - create infographic as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
      );

      const context = createMockContext(runtime, user);

      // Act & Assert - should fail because user doesn't own this infographic
      await expect(
        handlers.delete({
          context,
          input: { id: otherInfographic.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('verifies infographic is actually removed from database after delete', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // Verify infographic exists before delete
      const [beforeDelete] = await ctx.db
        .select()
        .from(infographicTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(infographicTable.id, infographic.id as any));
      expect(beforeDelete).toBeDefined();

      // Act
      await handlers.delete({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert - infographic no longer exists in database
      const [afterDelete] = await ctx.db
        .select()
        .from(infographicTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(infographicTable.id, infographic.id as any));
      expect(afterDelete).toBeUndefined();
    });

    it('allows admin to delete any infographic', async () => {
      // Arrange - create infographic as regular user
      const infographic = await insertTestInfographic(ctx, testUser.id);

      // Create admin user
      const adminTestUser = createTestUser({ role: 'admin' });
      await insertTestUser(ctx, adminTestUser);
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);

      // Act - admin deletes another user's infographic
      const result = await handlers.delete({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert - delete succeeded
      expect(result).toEqual({});

      // Verify - infographic is gone
      const [afterDelete] = await ctx.db
        .select()
        .from(infographicTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(infographicTable.id, infographic.id as any));
      expect(afterDelete).toBeUndefined();
    });

    it('cannot delete same infographic twice', async () => {
      // Arrange
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const context = createMockContext(runtime, user);

      // First delete succeeds
      await handlers.delete({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Act & Assert - second delete fails
      await expect(
        handlers.delete({
          context,
          input: { id: infographic.id },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: addSelection handler
  // ===========================================================================

  describe('addSelection handler', () => {
    it('adds a selection to an infographic', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });

      // Act
      const result = await handlers.addSelection({
        context,
        input: {
          id: infographic.id,
          documentId: doc.id,
          selectedText: 'Important text to highlight',
          startOffset: 0,
          endOffset: 27,
        },
        errors,
      });

      // Assert
      expect(result.selection).toBeDefined();
      expect(result.selection.selectedText).toBe('Important text to highlight');
      expect(result.selection.documentId).toBe(doc.id);
      expect(result.selection.infographicId).toBe(infographic.id);
    });

    it('returns selection with proper serialized format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });

      // Act
      const result = await handlers.addSelection({
        context,
        input: {
          id: infographic.id,
          documentId: doc.id,
          selectedText: 'Test text',
          startOffset: 0,
          endOffset: 9,
        },
        errors,
      });

      // Assert
      expect(result.selection.id).toMatch(/^sel_/);
      expect(typeof result.selection.createdAt).toBe('string');
      expect(() => new Date(result.selection.createdAt)).not.toThrow();
    });

    it('throws error when infographic does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const nonExistentId = 'inf_nonexistent12345';

      // Act & Assert
      await expect(
        handlers.addSelection({
          context,
          input: {
            id: nonExistentId,
            documentId: doc.id,
            selectedText: 'Test text',
            startOffset: 0,
            endOffset: 9,
          },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('throws error when adding selection to another users infographic', async () => {
      // Arrange
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const doc = await insertTestDocument(ctx, otherTestUser.id);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
        {
          sourceDocumentIds: [doc.id],
        },
      );

      const context = createMockContext(runtime, user);

      // Act & Assert
      await expect(
        handlers.addSelection({
          context,
          input: {
            id: otherInfographic.id,
            documentId: doc.id,
            selectedText: 'Test text',
            startOffset: 0,
            endOffset: 9,
          },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: removeSelection handler
  // ===========================================================================

  describe('removeSelection handler', () => {
    it('removes a selection from an infographic', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });
      const selection = await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Text to remove',
      });

      // Act
      const result = await handlers.removeSelection({
        context,
        input: {
          id: infographic.id,
          selectionId: selection.id,
        },
        errors,
      });

      // Assert
      expect(result).toEqual({});

      // Verify selection is removed from database
      const [afterDelete] = await ctx.db
        .select()
        .from(selectionTable)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .where(eq(selectionTable.id, selection.id as any));
      expect(afterDelete).toBeUndefined();
    });

    it('throws error when selection does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const nonExistentSelectionId = 'sel_nonexistent1234';

      // Act & Assert
      await expect(
        handlers.removeSelection({
          context,
          input: {
            id: infographic.id,
            selectionId: nonExistentSelectionId,
          },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('throws error when removing selection from another users infographic', async () => {
      // Arrange
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const doc = await insertTestDocument(ctx, otherTestUser.id);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
        {
          sourceDocumentIds: [doc.id],
        },
      );
      const selection = await insertTestSelection(ctx, {
        infographicId: otherInfographic.id,
        documentId: doc.id,
      });

      const context = createMockContext(runtime, user);

      // Act & Assert
      await expect(
        handlers.removeSelection({
          context,
          input: {
            id: otherInfographic.id,
            selectionId: selection.id,
          },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: updateSelection handler
  // ===========================================================================

  describe('updateSelection handler', () => {
    it('updates a selection text', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });
      const selection = await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Original text',
      });

      // Act
      const result = await handlers.updateSelection({
        context,
        input: {
          id: infographic.id,
          selectionId: selection.id,
          selectedText: 'Updated text',
        },
        errors,
      });

      // Assert
      expect(result.selection.selectedText).toBe('Updated text');
      expect(result.selection.id).toBe(selection.id);
    });

    it('returns serialized selection', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });
      const selection = await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
      });

      // Act
      const result = await handlers.updateSelection({
        context,
        input: {
          id: infographic.id,
          selectionId: selection.id,
          selectedText: 'New text',
        },
        errors,
      });

      // Assert
      expect(result.selection.id).toMatch(/^sel_/);
      expect(typeof result.selection.createdAt).toBe('string');
    });

    it('throws error when selection does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const infographic = await insertTestInfographic(ctx, testUser.id);
      const nonExistentSelectionId = 'sel_nonexistent1234';

      // Act & Assert
      await expect(
        handlers.updateSelection({
          context,
          input: {
            id: infographic.id,
            selectionId: nonExistentSelectionId,
            selectedText: 'New text',
          },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('throws error when updating selection on another users infographic', async () => {
      // Arrange
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const doc = await insertTestDocument(ctx, otherTestUser.id);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
        {
          sourceDocumentIds: [doc.id],
        },
      );
      const selection = await insertTestSelection(ctx, {
        infographicId: otherInfographic.id,
        documentId: doc.id,
      });

      const context = createMockContext(runtime, user);

      // Act & Assert
      await expect(
        handlers.updateSelection({
          context,
          input: {
            id: otherInfographic.id,
            selectionId: selection.id,
            selectedText: 'New text',
          },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: reorderSelections handler
  // ===========================================================================

  describe('reorderSelections handler', () => {
    it('reorders selections in an infographic', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });

      const selection1 = await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'First',
        orderIndex: 0,
      });
      const selection2 = await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Second',
        orderIndex: 1,
      });
      const selection3 = await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Third',
        orderIndex: 2,
      });

      // Act - reorder to: Third, First, Second
      const result = await handlers.reorderSelections({
        context,
        input: {
          id: infographic.id,
          orderedSelectionIds: [selection3.id, selection1.id, selection2.id],
        },
        errors,
      });

      // Assert
      expect(result.selections).toHaveLength(3);
      expect(result.selections[0]!.id).toBe(selection3.id);
      expect(result.selections[0]!.orderIndex).toBe(0);
      expect(result.selections[1]!.id).toBe(selection1.id);
      expect(result.selections[1]!.orderIndex).toBe(1);
      expect(result.selections[2]!.id).toBe(selection2.id);
      expect(result.selections[2]!.orderIndex).toBe(2);
    });

    it('throws error when infographic does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'inf_nonexistent12345';

      // Act & Assert
      await expect(
        handlers.reorderSelections({
          context,
          input: {
            id: nonExistentId,
            orderedSelectionIds: ['sel_123456789012345'],
          },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('throws error when reordering selections on another users infographic', async () => {
      // Arrange
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const doc = await insertTestDocument(ctx, otherTestUser.id);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
        {
          sourceDocumentIds: [doc.id],
        },
      );
      const selection = await insertTestSelection(ctx, {
        infographicId: otherInfographic.id,
        documentId: doc.id,
      });

      const context = createMockContext(runtime, user);

      // Act & Assert
      await expect(
        handlers.reorderSelections({
          context,
          input: {
            id: otherInfographic.id,
            orderedSelectionIds: [selection.id],
          },
          errors,
        }),
      ).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Tests: generate handler
  // ===========================================================================

  describe('generate handler', () => {
    it('creates a generation job for the infographic', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });

      // Add a selection (required for generation)
      await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Key point for infographic',
      });

      // Act
      const result = await handlers.generate({
        context,
        input: { id: infographic.id },
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
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });

      // Add a selection
      await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Key point',
      });

      // Create a pending job for this infographic
      await ctx.db.insert(jobTable).values({
        type: 'generate-infographic',
        payload: { infographicId: infographic.id, userId: testUser.id },
        createdBy: testUser.id,
        status: 'pending',
      });

      // Act - call generate again
      const result = await handlers.generate({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert - should return existing job
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('throws error when infographic does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'inf_nonexistent12345';

      // Act & Assert
      await expect(
        handlers.generate({
          context,
          input: { id: nonExistentId },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('throws error when generating for another users infographic', async () => {
      // Arrange - create infographic as another user
      const otherTestUser = createTestUser();
      await insertTestUser(ctx, otherTestUser);
      const doc = await insertTestDocument(ctx, otherTestUser.id);
      const otherInfographic = await insertTestInfographic(
        ctx,
        otherTestUser.id,
        {
          sourceDocumentIds: [doc.id],
        },
      );

      await insertTestSelection(ctx, {
        infographicId: otherInfographic.id,
        documentId: doc.id,
        selectedText: 'Key point',
      });

      const context = createMockContext(runtime, user);

      // Act & Assert - should fail because user doesn't own this infographic
      await expect(
        handlers.generate({
          context,
          input: { id: otherInfographic.id },
          errors,
        }),
      ).rejects.toThrow();
    });

    it('passes feedback instructions to the job payload', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });

      await insertTestSelection(ctx, {
        infographicId: infographic.id,
        documentId: doc.id,
        selectedText: 'Key point',
      });

      // Act
      const result = await handlers.generate({
        context,
        input: {
          id: infographic.id,
          feedbackInstructions: 'Make it more colorful',
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
        (job!.payload as { feedbackInstructions?: string })
          .feedbackInstructions,
      ).toBe('Make it more colorful');
    });
  });

  // ===========================================================================
  // Tests: getJob handler
  // ===========================================================================

  describe('getJob handler', () => {
    it('returns job when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const infographic = await insertTestInfographic(ctx, testUser.id);

      // Create a job
      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-infographic',
          payload: { infographicId: infographic.id, userId: testUser.id },
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
      expect(result.type).toBe('generate-infographic');
      expect(result.status).toBe('pending');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('throws error when job does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentJobId = 'job_nonexistent12345';

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
      const infographic = await insertTestInfographic(ctx, testUser.id);

      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-infographic',
          payload: { infographicId: infographic.id, userId: testUser.id },
          createdBy: testUser.id,
          status: 'completed',
          result: {
            imageUrl: 'https://example.com/image.png',
            infographicId: infographic.id,
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
        imageUrl: 'https://example.com/image.png',
        infographicId: infographic.id,
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
      const infographic = await insertTestInfographic(ctx, testUser.id);

      const [createdJob] = await ctx.db
        .insert(jobTable)
        .values({
          type: 'generate-infographic',
          payload: { infographicId: infographic.id, userId: testUser.id },
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
  // Tests: Response Format Verification
  // ===========================================================================

  describe('response format', () => {
    it('list response includes pagination metadata', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      await insertTestInfographic(ctx, testUser.id);

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      // Assert
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('offset');
      expect(typeof result.total).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.offset).toBe('number');
    });

    it('full infographic includes selections array', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const infographic = await insertTestInfographic(ctx, testUser.id, {
        sourceDocumentIds: [doc.id],
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: infographic.id },
        errors,
      });

      // Assert
      expect(result).toHaveProperty('selections');
      expect(Array.isArray(result.selections)).toBe(true);
    });

    it('infographic output includes all expected fields', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const doc = await insertTestDocument(ctx, testUser.id);
      const input = {
        title: 'Complete Test',
        infographicType: 'comparison',
        documentIds: [doc.id],
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert - verify all expected fields are present
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('infographicType');
      expect(result).toHaveProperty('aspectRatio');
      expect(result).toHaveProperty('customInstructions');
      expect(result).toHaveProperty('feedbackInstructions');
      expect(result).toHaveProperty('styleOptions');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('errorMessage');
      expect(result).toHaveProperty('sourceDocumentIds');
      expect(result).toHaveProperty('generationContext');
      expect(result).toHaveProperty('createdBy');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('selections');
    });
  });
});
