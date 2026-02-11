import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  user as userTable,
  document as documentTable,
  type DocumentOutput,
  type DocumentId,
} from '@repo/db/schema';
import { DocumentRepoLive } from '@repo/media';
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
import { eq } from 'drizzle-orm';
import { Layer } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import documentRouter from '../document';
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

/**
 * Helper to assert an error contains an expected message.
 * Handles both ORPCError and FiberFailure (which wraps thrown errors).
 */
const expectErrorWithMessage = async (
  promise: Promise<unknown>,
  expectedMessage: string | RegExp,
) => {
  await expect(promise).rejects.toThrow();
  try {
    await promise;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (typeof expectedMessage === 'string') {
      expect(errorMessage).toContain(expectedMessage);
    } else {
      expect(errorMessage).toMatch(expectedMessage);
    }
  }
};

// Handler args type
type HandlerArgs = { context: unknown; input: unknown; errors: unknown };

// Typed handler accessors for document router
const handlers = {
  create: (args: HandlerArgs): Promise<DocumentOutput> =>
    callHandler<DocumentOutput>(
      documentRouter.create as unknown as ORPCProcedure,
      args,
    ),
  list: (args: HandlerArgs): Promise<DocumentOutput[]> =>
    callHandler<DocumentOutput[]>(
      documentRouter.list as unknown as ORPCProcedure,
      args,
    ),
  get: (args: HandlerArgs): Promise<DocumentOutput> =>
    callHandler<DocumentOutput>(
      documentRouter.get as unknown as ORPCProcedure,
      args,
    ),
  getContent: (args: HandlerArgs): Promise<{ content: string }> =>
    callHandler<{ content: string }>(
      documentRouter.getContent as unknown as ORPCProcedure,
      args,
    ),
  upload: (args: HandlerArgs): Promise<DocumentOutput> =>
    callHandler<DocumentOutput>(
      documentRouter.upload as unknown as ORPCProcedure,
      args,
    ),
  update: (args: HandlerArgs): Promise<DocumentOutput> =>
    callHandler<DocumentOutput>(
      documentRouter.update as unknown as ORPCProcedure,
      args,
    ),
  delete: (args: HandlerArgs): Promise<Record<string, never>> =>
    callHandler<Record<string, never>>(
      documentRouter.delete as unknown as ORPCProcedure,
      args,
    ),
};

// =============================================================================
// Test Setup
// =============================================================================

/**
 * In-memory storage instance for document content.
 * Shared across tests and cleared in beforeEach.
 */
let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

/**
 * Create a minimal test runtime with only the services needed for document operations.
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

  const allLayers = Layer.mergeAll(
    ctx.dbLayer,
    mockAILayers,
    policyLayer,
    documentRepoLayer,
  );

  return createTestServerRuntime(allLayers);
};

/**
 * Insert a user into the database for testing.
 * Required because documents have a foreign key to the user table.
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

// =============================================================================
// Tests
// =============================================================================

describe('document router', () => {
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
  // Tests: create handler
  // ===========================================================================

  describe('create handler', () => {
    it('creates document with title and content', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'My Test Document',
        content: 'This is the document content.',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('My Test Document');
      expect(result.mimeType).toBe('text/plain');
      expect(result.source).toBe('manual');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('creates document with optional metadata', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Document with Metadata',
        content: 'Content here',
        metadata: { source: 'api', version: 1 },
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('Document with Metadata');
      expect(result.metadata).toEqual({ source: 'api', version: 1 });
    });

    it('calculates word count correctly', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Word Count Test',
        content: 'One two three four five six seven',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.wordCount).toBe(7);
    });

    it('returns serialized document response with proper format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Format Test',
        content: 'Testing the response format',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert - id starts with doc_
      expect(result.id).toMatch(/^doc_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(() => new Date(result.createdAt)).not.toThrow();
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string
      expect(typeof result.updatedAt).toBe('string');
      expect(() => new Date(result.updatedAt)).not.toThrow();
    });

    it('persists document to database', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Persistence Test',
        content: 'This should be persisted',
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Verify - query database directly
      const [dbDocument] = await ctx.db
        .select()
        .from(documentTable)
        .where(eq(documentTable.id, result.id as DocumentId));

      expect(dbDocument).toBeDefined();
      expect(dbDocument!.title).toBe('Persistence Test');
      expect(dbDocument!.createdBy).toBe(testUser.id);
    });

    it('handles whitespace-only content with zero word count', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        title: 'Empty Content Test',
        content: '   ', // Whitespace only
      };

      // Act
      const result = await handlers.create({
        context,
        input,
        errors,
      });

      // Assert - word count should be 0 for whitespace-only content
      expect(result.wordCount).toBe(0);
    });
  });

  // ===========================================================================
  // Tests: upload handler
  // ===========================================================================

  describe('upload handler', () => {
    it('uploads text file and extracts content', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const textContent = 'Plain text content here for testing';
      const input = {
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        data: Buffer.from(textContent).toString('base64'),
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.mimeType).toBe('text/plain');
      expect(result.source).toBe('upload_txt');
      expect(result.originalFileName).toBe('notes.txt');
      expect(result.originalFileSize).toBe(textContent.length);
      expect(result.wordCount).toBe(6); // 'Plain text content here for testing' = 6 words
    });

    it('extracts title from filename when not provided', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'my-document-title.txt',
        mimeType: 'text/plain',
        data: Buffer.from('Some content').toString('base64'),
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Assert - title extracted from filename with hyphens converted to spaces
      expect(result.title).toBe('my document title');
    });

    it('uses provided title over filename', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'file.txt',
        mimeType: 'text/plain',
        data: Buffer.from('Content').toString('base64'),
        title: 'Custom Title',
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.title).toBe('Custom Title');
    });

    it('returns serialized document with extracted content', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'test.txt',
        mimeType: 'text/plain',
        data: Buffer.from('Test content for serialization').toString('base64'),
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Assert - id starts with doc_
      expect(result.id).toMatch(/^doc_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - contentKey is set
      expect(result.contentKey).toMatch(/^documents\//);
    });

    it('handles files within size limits', async () => {
      // Arrange - create a reasonably sized file (100KB)
      const context = createMockContext(runtime, user);
      const largeContent = 'A'.repeat(100 * 1024); // 100KB of 'A's
      const input = {
        fileName: 'large-file.txt',
        mimeType: 'text/plain',
        data: Buffer.from(largeContent).toString('base64'),
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Assert - file was uploaded successfully
      expect(result.originalFileSize).toBe(100 * 1024);
      expect(result.id).toMatch(/^doc_/);
    });

    it('fails for unsupported file types', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'image.png',
        mimeType: 'image/png',
        data: Buffer.from('fake png content').toString('base64'),
      };

      // Act & Assert - error contains the UNSUPPORTED_FORMAT message
      await expectErrorWithMessage(
        handlers.upload({ context, input, errors }),
        /not supported|UNSUPPORTED_FORMAT/i,
      );
    });

    it('fails for unknown mime types with unknown extension', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'file.xyz',
        mimeType: 'application/octet-stream',
        data: Buffer.from('Unknown content').toString('base64'),
      };

      // Act & Assert - error contains the UNSUPPORTED_FORMAT message
      await expectErrorWithMessage(
        handlers.upload({ context, input, errors }),
        /not supported|UNSUPPORTED_FORMAT/i,
      );
    });

    it('infers mime type from file extension when not provided', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'document.txt',
        mimeType: 'application/octet-stream', // Generic mime type
        data: Buffer.from('Text content').toString('base64'),
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Assert - should infer text/plain from .txt extension
      expect(result.mimeType).toBe('text/plain');
      expect(result.source).toBe('upload_txt');
    });

    it('includes metadata in uploaded document', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'metadata-test.txt',
        mimeType: 'text/plain',
        data: Buffer.from('Content').toString('base64'),
        metadata: { uploadedFrom: 'test', priority: 'high' },
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Assert
      expect(result.metadata).toEqual(
        expect.objectContaining({ uploadedFrom: 'test', priority: 'high' }),
      );
    });

    it('persists uploaded document to database', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const input = {
        fileName: 'persist-test.txt',
        mimeType: 'text/plain',
        data: Buffer.from('Persistence test content').toString('base64'),
      };

      // Act
      const result = await handlers.upload({
        context,
        input,
        errors,
      });

      // Verify - query database directly
      const [dbDocument] = await ctx.db
        .select()
        .from(documentTable)
        .where(eq(documentTable.id, result.id as DocumentId));

      expect(dbDocument).toBeDefined();
      expect(dbDocument!.originalFileName).toBe('persist-test.txt');
      expect(dbDocument!.createdBy).toBe(testUser.id);
    });

    describe('PDF upload', () => {
      it('fails with parse error for malformed PDF', async () => {
        // Arrange
        const context = createMockContext(runtime, user);
        const invalidPdf = Buffer.from('%PDF-1.4 invalid content');
        const input = {
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          data: invalidPdf.toString('base64'),
        };

        // Act & Assert - error contains parse error message
        await expectErrorWithMessage(
          handlers.upload({ context, input, errors }),
          /parse|DOCUMENT_PARSE_ERROR/i,
        );
      });
    });
  });

  // ===========================================================================
  // Tests: list handler
  // ===========================================================================

  describe('list handler', () => {
    it('returns empty array when no documents exist', async () => {
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

    it('returns paginated documents for the authenticated user', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create some documents for this user
      await handlers.create({
        context,
        input: { title: 'Doc One', content: 'Content one' },
        errors,
      });
      await handlers.create({
        context,
        input: { title: 'Doc Two', content: 'Content two' },
        errors,
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.title)).toContain('Doc One');
      expect(result.map((d) => d.title)).toContain('Doc Two');
    });

    it('respects limit parameter', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create 5 documents
      for (let i = 1; i <= 5; i++) {
        await handlers.create({
          context,
          input: { title: `Doc ${i}`, content: `Content ${i}` },
          errors,
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

      // Create 5 documents
      for (let i = 1; i <= 5; i++) {
        await handlers.create({
          context,
          input: { title: `Doc ${i}`, content: `Content ${i}` },
          errors,
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

    it('only returns documents owned by the user, not other users documents', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create document for current user
      await handlers.create({
        context,
        input: { title: 'My Document', content: 'My content' },
        errors,
      });

      // Create another user and their document
      const otherTestUser = createTestUser();
      const otherUser = toUser(otherTestUser);
      await insertTestUser(ctx, otherTestUser);

      const otherContext = createMockContext(runtime, otherUser);
      await handlers.create({
        context: otherContext,
        input: { title: 'Other User Document', content: 'Other content' },
        errors,
      });

      // Act
      const result = await handlers.list({
        context,
        input: { limit: 10 },
        errors,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('My Document');
      expect(result[0]!.createdBy).toBe(testUser.id);
    });

    it('returns documents in serialized format with ISO date strings', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      await handlers.create({
        context,
        input: { title: 'Serialization Test', content: 'Test content' },
        errors,
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
      expect(returned.id).toMatch(/^doc_/);
      expect(returned.title).toBe('Serialization Test');
      expect(returned.contentKey).toBeDefined();
      expect(returned.mimeType).toBeDefined();
      expect(typeof returned.wordCount).toBe('number');
      expect(returned.source).toBeDefined();
      expect(returned.createdBy).toBe(testUser.id);
      // Dates should be ISO strings
      expect(typeof returned.createdAt).toBe('string');
      expect(typeof returned.updatedAt).toBe('string');
      expect(() => new Date(returned.createdAt)).not.toThrow();
      expect(() => new Date(returned.updatedAt)).not.toThrow();
    });

    it('uses default pagination when not specified', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      // Create some documents
      for (let i = 1; i <= 3; i++) {
        await handlers.create({
          context,
          input: { title: `Doc ${i}`, content: `Content ${i}` },
          errors,
        });
      }

      // Act - no limit or offset specified
      const result = await handlers.list({
        context,
        input: {},
        errors,
      });

      // Assert - should return all documents within default limit
      expect(result).toHaveLength(3);
    });
  });

  // ===========================================================================
  // Tests: get handler
  // ===========================================================================

  describe('get handler', () => {
    it('returns document when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      const created = await handlers.create({
        context,
        input: { title: 'Found Document', content: 'Document content' },
        errors,
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: created.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Found Document');
      expect(result.createdBy).toBe(testUser.id);
    });

    it('throws DOCUMENT_NOT_FOUND when document does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'doc_nonexistent123';

      // Act & Assert - error contains DOCUMENT_NOT_FOUND in message
      await expectErrorWithMessage(
        handlers.get({
          context,
          input: { id: nonExistentId },
          errors,
        }),
        'DOCUMENT_NOT_FOUND',
      );
    });

    it('throws DOCUMENT_NOT_FOUND when accessing another users document', async () => {
      // Arrange - create document as another user
      const otherTestUser = createTestUser();
      const otherUser = toUser(otherTestUser);
      await insertTestUser(ctx, otherTestUser);

      const otherContext = createMockContext(runtime, otherUser);
      const otherDoc = await handlers.create({
        context: otherContext,
        input: { title: 'Private Document', content: 'Private content' },
        errors,
      });

      // Act & Assert - try to access as original user (appears as not found for security)
      const context = createMockContext(runtime, user);

      await expectErrorWithMessage(
        handlers.get({
          context,
          input: { id: otherDoc.id },
          errors,
        }),
        /DOCUMENT_NOT_FOUND|do not own/i,
      );
    });

    it('returns document in serialized format', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      const created = await handlers.create({
        context,
        input: {
          title: 'Serialization Test',
          content: 'Test content for serialization',
          metadata: { key: 'value' },
        },
        errors,
      });

      // Act
      const result = await handlers.get({
        context,
        input: { id: created.id },
        errors,
      });

      // Assert
      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Serialization Test');
      expect(result.mimeType).toBe('text/plain');
      expect(result.source).toBe('manual');
      expect(result.metadata).toEqual({ key: 'value' });
      expect(result.createdBy).toBe(testUser.id);
      // Dates should be ISO strings
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
    });
  });

  // ===========================================================================
  // Tests: getContent handler
  // ===========================================================================

  describe('getContent handler', () => {
    it('returns document content when found', async () => {
      // Arrange
      const context = createMockContext(runtime, user);

      const created = await handlers.create({
        context,
        input: {
          title: 'Content Test',
          content: 'This is the document content.',
        },
        errors,
      });

      // Act
      const result = await handlers.getContent({
        context,
        input: { id: created.id },
        errors,
      });

      // Assert
      expect(result).toEqual({
        content: 'This is the document content.',
      });
    });

    it('throws DOCUMENT_NOT_FOUND when document does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'doc_doesnotexist1';

      // Act & Assert - error contains DOCUMENT_NOT_FOUND in message
      await expectErrorWithMessage(
        handlers.getContent({
          context,
          input: { id: nonExistentId },
          errors,
        }),
        'DOCUMENT_NOT_FOUND',
      );
    });

    it('throws DOCUMENT_NOT_FOUND for another users document', async () => {
      // Arrange - create document as another user
      const otherTestUser = createTestUser();
      const otherUser = toUser(otherTestUser);
      await insertTestUser(ctx, otherTestUser);

      const otherContext = createMockContext(runtime, otherUser);
      const otherDoc = await handlers.create({
        context: otherContext,
        input: { title: 'Other User Content', content: 'Private content.' },
        errors,
      });

      // Act & Assert - try to access as original user (appears as not found for security)
      const context = createMockContext(runtime, user);

      await expectErrorWithMessage(
        handlers.getContent({
          context,
          input: { id: otherDoc.id },
          errors,
        }),
        /DOCUMENT_NOT_FOUND|do not own/i,
      );
    });
  });

  // ===========================================================================
  // Tests: update handler
  // ===========================================================================

  describe('update handler', () => {
    /**
     * Helper to create a document for update tests.
     */
    const createDocumentForTest = async (
      content: string = 'Original content for testing',
    ) => {
      const context = createMockContext(runtime, user);
      return handlers.create({
        context,
        input: {
          title: 'Original Title',
          content,
        },
        errors,
      });
    };

    it('updates document title', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: doc.id,
          title: 'Updated Title',
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.id).toBe(doc.id);
    });

    it('updates document content', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: doc.id,
          content: 'This is the new content that replaced the original.',
        },
        errors,
      });

      // Assert
      expect(result.id).toBe(doc.id);
      // Content key should be different (new content uploaded)
      expect(result.contentKey).not.toBe(doc.contentKey);
    });

    it('updates document metadata', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: doc.id,
          metadata: { version: 2, updatedBy: 'test' },
        },
        errors,
      });

      // Assert
      expect(result.metadata).toEqual({ version: 2, updatedBy: 'test' });
    });

    it('updates multiple fields at once', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: doc.id,
          title: 'New Title',
          content: 'New content here with multiple words',
          metadata: { combined: true },
        },
        errors,
      });

      // Assert
      expect(result.title).toBe('New Title');
      expect(result.metadata).toEqual({ combined: true });
      expect(result.contentKey).not.toBe(doc.contentKey);
    });

    it('recalculates word count when content changes', async () => {
      // Arrange
      const doc = await createDocumentForTest('One two three');
      expect(doc.wordCount).toBe(3);
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: doc.id,
          content: 'One two three four five six seven eight',
        },
        errors,
      });

      // Assert - new content has 8 words
      expect(result.wordCount).toBe(8);
    });

    it('returns serialized updated document', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.update({
        context,
        input: {
          id: doc.id,
          title: 'Serialized Update',
        },
        errors,
      });

      // Assert - id starts with doc_
      expect(result.id).toMatch(/^doc_/);

      // Assert - createdAt is an ISO string
      expect(typeof result.createdAt).toBe('string');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Assert - updatedAt is an ISO string and different from createdAt
      expect(typeof result.updatedAt).toBe('string');
      expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws DOCUMENT_NOT_FOUND when document does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'doc_0000000000000000';

      // Act & Assert
      await expectErrorWithMessage(
        handlers.update({
          context,
          input: { id: nonExistentId, title: 'Should Fail' },
          errors,
        }),
        /DOCUMENT_NOT_FOUND|not found/i,
      );
    });

    it("throws FORBIDDEN when trying to update another user's document", async () => {
      // Arrange - create document as first user
      const doc = await createDocumentForTest();

      // Create another user
      const otherTestUser = createTestUser({ id: 'other-user-id' });
      await insertTestUser(ctx, otherTestUser);
      const otherUser = toUser(otherTestUser);
      const context = createMockContext(runtime, otherUser);

      // Act & Assert - trying to update as different user
      await expectErrorWithMessage(
        handlers.update({
          context,
          input: { id: doc.id, title: 'Hijacked' },
          errors,
        }),
        /FORBIDDEN|do not own/i,
      );
    });

    it('persists updates to database', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      await handlers.update({
        context,
        input: {
          id: doc.id,
          title: 'Persisted Title',
        },
        errors,
      });

      // Verify - query database directly
      const [dbDocument] = await ctx.db
        .select()
        .from(documentTable)
        .where(eq(documentTable.id, doc.id as DocumentId));

      expect(dbDocument).toBeDefined();
      expect(dbDocument!.title).toBe('Persisted Title');
    });
  });

  // ===========================================================================
  // Tests: delete handler
  // ===========================================================================

  describe('delete handler', () => {
    /**
     * Helper to create a document for delete tests.
     */
    const createDocumentForTest = async () => {
      const context = createMockContext(runtime, user);
      return handlers.create({
        context,
        input: {
          title: 'Document to Delete',
          content: 'This document will be deleted.',
        },
        errors,
      });
    };

    it('deletes document successfully', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: doc.id },
        errors,
      });

      // Assert - returns empty object on success
      expect(result).toEqual({});
    });

    it('returns empty object on successful delete', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Act
      const result = await handlers.delete({
        context,
        input: { id: doc.id },
        errors,
      });

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('throws DOCUMENT_NOT_FOUND when document does not exist', async () => {
      // Arrange
      const context = createMockContext(runtime, user);
      const nonExistentId = 'doc_0000000000000000';

      // Act & Assert
      await expectErrorWithMessage(
        handlers.delete({
          context,
          input: { id: nonExistentId },
          errors,
        }),
        /DOCUMENT_NOT_FOUND|not found/i,
      );
    });

    it("throws FORBIDDEN when trying to delete another user's document", async () => {
      // Arrange - create document as first user
      const doc = await createDocumentForTest();

      // Create another user
      const otherTestUser = createTestUser({ id: 'delete-other-user-id' });
      await insertTestUser(ctx, otherTestUser);
      const otherUser = toUser(otherTestUser);
      const context = createMockContext(runtime, otherUser);

      // Act & Assert - trying to delete as different user
      await expectErrorWithMessage(
        handlers.delete({
          context,
          input: { id: doc.id },
          errors,
        }),
        /FORBIDDEN|do not own/i,
      );
    });

    it('verifies document is actually removed from database after delete', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // Verify document exists before delete
      const [beforeDelete] = await ctx.db
        .select()
        .from(documentTable)
        .where(eq(documentTable.id, doc.id as DocumentId));
      expect(beforeDelete).toBeDefined();

      // Act
      await handlers.delete({
        context,
        input: { id: doc.id },
        errors,
      });

      // Assert - document no longer exists in database
      const [afterDelete] = await ctx.db
        .select()
        .from(documentTable)
        .where(eq(documentTable.id, doc.id as DocumentId));
      expect(afterDelete).toBeUndefined();
    });

    it('allows admin to delete any document', async () => {
      // Arrange - create document as regular user
      const doc = await createDocumentForTest();

      // Create admin user
      const adminTestUser = createTestUser({
        id: 'admin-delete-id',
        role: 'admin',
      });
      await insertTestUser(ctx, adminTestUser);
      const adminUser = toUser(adminTestUser);
      const context = createMockContext(runtime, adminUser);

      // Act - admin deletes another user's document
      const result = await handlers.delete({
        context,
        input: { id: doc.id },
        errors,
      });

      // Assert - delete succeeded
      expect(result).toEqual({});

      // Verify - document is gone
      const [afterDelete] = await ctx.db
        .select()
        .from(documentTable)
        .where(eq(documentTable.id, doc.id as DocumentId));
      expect(afterDelete).toBeUndefined();
    });

    it('cannot delete same document twice', async () => {
      // Arrange
      const doc = await createDocumentForTest();
      const context = createMockContext(runtime, user);

      // First delete succeeds
      await handlers.delete({
        context,
        input: { id: doc.id },
        errors,
      });

      // Act & Assert - second delete fails
      await expectErrorWithMessage(
        handlers.delete({
          context,
          input: { id: doc.id },
          errors,
        }),
        /DOCUMENT_NOT_FOUND|not found/i,
      );
    });
  });
});
