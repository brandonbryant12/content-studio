import { MockLLMLive, MockTTSLive } from '@repo/ai/testing';
import { DatabasePolicyLive, type User } from '@repo/auth/policy';
import {
  user as userTable,
  source as sourceTable,
  type SourceOutput,
  type SourceId,
  generateSourceId,
} from '@repo/db/schema';
import { ActivityLogRepoLive, SourceRepoLive } from '@repo/media';
import { createInMemoryStorage } from '@repo/storage/testing';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  toUser,
  type TestContext,
} from '@repo/testing';
import { eq } from 'drizzle-orm';
import { Layer } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ServerRuntime } from '../../runtime';
import sourceRouter from '../source';
import {
  createMockContext,
  createMockErrors,
  createTestServerRuntime,
  callORPCHandler,
  expectHandlerErrorCode,
  expectIsoTimestamp,
} from './helpers';

type HandlerArgs = { context: unknown; input?: unknown; errors: unknown };

const handlers = {
  create: (args: HandlerArgs): Promise<SourceOutput> =>
    callORPCHandler<SourceOutput>(
      sourceRouter.create as unknown as {
        '~orpc': { handler: (args: unknown) => Promise<unknown> };
      },
      args,
    ),
  list: (args: HandlerArgs): Promise<SourceOutput[]> =>
    callORPCHandler<SourceOutput[]>(
      sourceRouter.list as unknown as {
        '~orpc': { handler: (args: unknown) => Promise<unknown> };
      },
      args,
    ),
  get: (args: HandlerArgs): Promise<SourceOutput> =>
    callORPCHandler<SourceOutput>(
      sourceRouter.get as unknown as {
        '~orpc': { handler: (args: unknown) => Promise<unknown> };
      },
      args,
    ),
  getContent: (args: HandlerArgs): Promise<{ content: string }> =>
    callORPCHandler<{ content: string }>(
      sourceRouter.getContent as unknown as {
        '~orpc': { handler: (args: unknown) => Promise<unknown> };
      },
      args,
    ),
  upload: (args: HandlerArgs): Promise<SourceOutput> =>
    callORPCHandler<SourceOutput>(
      sourceRouter.upload as unknown as {
        '~orpc': { handler: (args: unknown) => Promise<unknown> };
      },
      args,
    ),
  update: (args: HandlerArgs): Promise<SourceOutput> =>
    callORPCHandler<SourceOutput>(
      sourceRouter.update as unknown as {
        '~orpc': { handler: (args: unknown) => Promise<unknown> };
      },
      args,
    ),
  delete: (args: HandlerArgs): Promise<Record<string, never>> =>
    callORPCHandler<Record<string, never>>(
      sourceRouter.delete as unknown as {
        '~orpc': { handler: (args: unknown) => Promise<unknown> };
      },
      args,
    ),
};

let inMemoryStorage: ReturnType<typeof createInMemoryStorage>;

const createTestRuntime = (ctx: TestContext): ServerRuntime => {
  inMemoryStorage = createInMemoryStorage();
  const mockAILayers = Layer.mergeAll(
    MockLLMLive,
    MockTTSLive,
    inMemoryStorage.layer,
  );
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(ctx.dbLayer));
  const documentRepoLayer = SourceRepoLive.pipe(Layer.provide(ctx.dbLayer));
  const activityLogRepoLayer = ActivityLogRepoLive.pipe(
    Layer.provide(ctx.dbLayer),
  );

  return createTestServerRuntime(
    Layer.mergeAll(
      ctx.dbLayer,
      mockAILayers,
      policyLayer,
      documentRepoLayer,
      activityLogRepoLayer,
    ),
  );
};

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

const encode = (value: string) => Buffer.from(value).toString('base64');

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

  it('returns UNAUTHORIZED for all protected handlers when user is missing', async () => {
    const context = createMockContext(runtime, user);
    const existingDoc = await handlers.create({
      context,
      input: { title: 'Existing document', content: 'Private content' },
      errors,
    });
    const unauthenticatedContext = createMockContext(runtime, null);

    const calls: Array<() => Promise<unknown>> = [
      () =>
        handlers.list({ context: unauthenticatedContext, input: {}, errors }),
      () =>
        handlers.create({
          context: unauthenticatedContext,
          input: { title: 'No auth', content: 'No auth content' },
          errors,
        }),
      () =>
        handlers.upload({
          context: unauthenticatedContext,
          input: {
            fileName: 'private.txt',
            mimeType: 'text/plain',
            data: encode('private data'),
          },
          errors,
        }),
      () =>
        handlers.get({
          context: unauthenticatedContext,
          input: { id: existingDoc.id },
          errors,
        }),
      () =>
        handlers.getContent({
          context: unauthenticatedContext,
          input: { id: existingDoc.id },
          errors,
        }),
      () =>
        handlers.update({
          context: unauthenticatedContext,
          input: { id: existingDoc.id, title: 'Updated title' },
          errors,
        }),
      () =>
        handlers.delete({
          context: unauthenticatedContext,
          input: { id: existingDoc.id },
          errors,
        }),
    ];

    for (const call of calls) {
      await expectHandlerErrorCode(call, 'UNAUTHORIZED');
    }
  });

  describe('create handler', () => {
    it('creates and persists a serialized document with metadata', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.create({
        context,
        input: {
          title: 'Metadata doc',
          content: 'One two three four',
          metadata: { source: 'api', version: 2 },
        },
        errors,
      });

      expect(result.id).toMatch(/^doc_/);
      expect(result.title).toBe('Metadata doc');
      expect(result.wordCount).toBe(4);
      expect(result.mimeType).toBe('text/plain');
      expect(result.source).toBe('manual');
      expect(result.createdBy).toBe(testUser.id);
      expect(result.metadata).toEqual({ source: 'api', version: 2 });
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);

      const [persisted] = await ctx.db
        .select()
        .from(sourceTable)
        .where(eq(sourceTable.id, result.id as SourceId));
      expect(persisted).toBeDefined();
      expect(persisted?.title).toBe('Metadata doc');
      expect(persisted?.createdBy).toBe(testUser.id);
    });

    it('counts whitespace-only content as zero words', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.create({
        context,
        input: {
          title: 'Whitespace doc',
          content: '   ',
        },
        errors,
      });

      expect(result.wordCount).toBe(0);
    });
  });

  describe('upload handler', () => {
    it('uploads a text file, infers fields, and persists metadata', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.upload({
        context,
        input: {
          fileName: 'release-notes-2026.txt',
          mimeType: 'application/octet-stream',
          data: encode('Release notes for this version'),
          metadata: { uploadedFrom: 'test' },
        },
        errors,
      });

      expect(result.id).toMatch(/^doc_/);
      expect(result.title).toBe('release notes 2026');
      expect(result.mimeType).toBe('text/plain');
      expect(result.source).toBe('upload_txt');
      expect(result.originalFileName).toBe('release-notes-2026.txt');
      expect(result.originalFileSize).toBe(
        Buffer.from('Release notes for this version').length,
      );
      expect(result.metadata).toEqual(
        expect.objectContaining({ uploadedFrom: 'test' }),
      );
      expect(result.contentKey).toMatch(/^sources\//);
      expectIsoTimestamp(result.createdAt);

      const [persisted] = await ctx.db
        .select()
        .from(sourceTable)
        .where(eq(sourceTable.id, result.id as SourceId));
      expect(persisted).toBeDefined();
      expect(persisted?.originalFileName).toBe('release-notes-2026.txt');
    });

    it('uses provided title over filename', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.upload({
        context,
        input: {
          fileName: 'ignored-file-name.txt',
          mimeType: 'text/plain',
          data: encode('Uploaded content'),
          title: 'Custom Upload Title',
        },
        errors,
      });

      expect(result.title).toBe('Custom Upload Title');
    });

    it('returns UNSUPPORTED_FORMAT for unsupported file types', async () => {
      const context = createMockContext(runtime, user);

      await expectHandlerErrorCode(
        () =>
          handlers.upload({
            context,
            input: {
              fileName: 'image.png',
              mimeType: 'image/png',
              data: encode('fake png'),
            },
            errors,
          }),
        'UNSUPPORTED_FORMAT',
      );
    });

    it('returns SOURCE_PARSE_ERROR for malformed PDF uploads', async () => {
      const context = createMockContext(runtime, user);

      await expectHandlerErrorCode(
        () =>
          handlers.upload({
            context,
            input: {
              fileName: 'broken.pdf',
              mimeType: 'application/pdf',
              data: Buffer.from('%PDF-1.4 invalid content').toString('base64'),
            },
            errors,
          }),
        'SOURCE_PARSE_ERROR',
      );
    });
  });

  describe('list handler', () => {
    it('returns empty array when no sources exist', async () => {
      const context = createMockContext(runtime, user);

      const result = await handlers.list({
        context,
        input: { limit: 10, offset: 0 },
        errors,
      });

      expect(result).toEqual([]);
    });

    it('applies ownership and pagination with serialized output', async () => {
      const context = createMockContext(runtime, user);
      for (let i = 1; i <= 3; i++) {
        await handlers.create({
          context,
          input: { title: `Mine ${i}`, content: `Mine ${i} content` },
          errors,
        });
      }

      const otherTestUser = createTestUser();
      const otherUser = toUser(otherTestUser);
      await insertTestUser(ctx, otherTestUser);
      const otherContext = createMockContext(runtime, otherUser);
      await handlers.create({
        context: otherContext,
        input: { title: 'Other user doc', content: 'Other user content' },
        errors,
      });

      const result = await handlers.list({
        context,
        input: { limit: 2, offset: 1 },
        errors,
      });

      expect(result).toHaveLength(2);
      expect(result.every((entry) => entry.createdBy === testUser.id)).toBe(
        true,
      );
      expect(result.every((entry) => !entry.title.includes('Other user'))).toBe(
        true,
      );
      expect(result[0]).toBeDefined();
      if (!result[0]) {
        throw new Error('Expected at least one listed document');
      }
      expect(result[0].id).toMatch(/^doc_/);
      expectIsoTimestamp(result[0].createdAt);
      expectIsoTimestamp(result[0].updatedAt);
    });
  });

  describe('get and getContent handlers', () => {
    it('returns the owned document and its stored content', async () => {
      const context = createMockContext(runtime, user);
      const created = await handlers.create({
        context,
        input: {
          title: 'Readable doc',
          content: 'This is stored content.',
          metadata: { key: 'value' },
        },
        errors,
      });

      const result = await handlers.get({
        context,
        input: { id: created.id },
        errors,
      });
      const contentResult = await handlers.getContent({
        context,
        input: { id: created.id },
        errors,
      });

      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Readable doc');
      expect(result.metadata).toEqual({ key: 'value' });
      expect(result.createdBy).toBe(testUser.id);
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);
      expect(contentResult).toEqual({ content: 'This is stored content.' });
    });

    it('returns SOURCE_NOT_FOUND for missing or non-owned documents', async () => {
      const context = createMockContext(runtime, user);
      const missingId = generateSourceId();

      const missingCalls: Array<() => Promise<unknown>> = [
        () => handlers.get({ context, input: { id: missingId }, errors }),
        () =>
          handlers.getContent({ context, input: { id: missingId }, errors }),
      ];
      for (const call of missingCalls) {
        await expectHandlerErrorCode(call, 'SOURCE_NOT_FOUND');
      }

      const otherTestUser = createTestUser();
      const otherUser = toUser(otherTestUser);
      await insertTestUser(ctx, otherTestUser);
      const otherContext = createMockContext(runtime, otherUser);
      const otherDoc = await handlers.create({
        context: otherContext,
        input: { title: 'Other private doc', content: 'Private content' },
        errors,
      });

      const nonOwnedCalls: Array<() => Promise<unknown>> = [
        () => handlers.get({ context, input: { id: otherDoc.id }, errors }),
        () =>
          handlers.getContent({ context, input: { id: otherDoc.id }, errors }),
      ];
      for (const call of nonOwnedCalls) {
        await expectHandlerErrorCode(call, 'SOURCE_NOT_FOUND');
      }
    });
  });

  describe('update handler', () => {
    it('updates multiple fields, recalculates word count, and persists changes', async () => {
      const context = createMockContext(runtime, user);
      const created = await handlers.create({
        context,
        input: {
          title: 'Original title',
          content: 'One two three',
        },
        errors,
      });

      const result = await handlers.update({
        context,
        input: {
          id: created.id,
          title: 'Updated title',
          content: 'One two three four five six seven eight',
          metadata: { combined: true },
        },
        errors,
      });

      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Updated title');
      expect(result.metadata).toEqual({ combined: true });
      expect(result.wordCount).toBe(8);
      expect(result.contentKey).not.toBe(created.contentKey);
      expectIsoTimestamp(result.createdAt);
      expectIsoTimestamp(result.updatedAt);

      const [persisted] = await ctx.db
        .select()
        .from(sourceTable)
        .where(eq(sourceTable.id, created.id as SourceId));
      expect(persisted).toBeDefined();
      expect(persisted?.title).toBe('Updated title');
      expect(persisted?.metadata).toEqual({ combined: true });
    });

    it('returns SOURCE_NOT_FOUND for missing or non-owned documents', async () => {
      const context = createMockContext(runtime, user);
      const missingId = generateSourceId();

      await expectHandlerErrorCode(
        () =>
          handlers.update({
            context,
            input: { id: missingId, title: 'Should fail' },
            errors,
          }),
        'SOURCE_NOT_FOUND',
      );

      const otherTestUser = createTestUser();
      const otherUser = toUser(otherTestUser);
      await insertTestUser(ctx, otherTestUser);
      const otherContext = createMockContext(runtime, otherUser);
      const otherDoc = await handlers.create({
        context: otherContext,
        input: { title: 'Other private doc', content: 'Private content' },
        errors,
      });

      await expectHandlerErrorCode(
        () =>
          handlers.update({
            context,
            input: { id: otherDoc.id, title: 'No access' },
            errors,
          }),
        'SOURCE_NOT_FOUND',
      );
    });
  });

  describe('delete handler', () => {
    it('deletes a document and returns SOURCE_NOT_FOUND on second delete', async () => {
      const context = createMockContext(runtime, user);
      const created = await handlers.create({
        context,
        input: {
          title: 'Delete me',
          content: 'Delete this content',
        },
        errors,
      });

      const deleted = await handlers.delete({
        context,
        input: { id: created.id },
        errors,
      });
      expect(deleted).toEqual({});

      const [afterDelete] = await ctx.db
        .select()
        .from(sourceTable)
        .where(eq(sourceTable.id, created.id as SourceId));
      expect(afterDelete).toBeUndefined();

      await expectHandlerErrorCode(
        () =>
          handlers.delete({
            context,
            input: { id: created.id },
            errors,
          }),
        'SOURCE_NOT_FOUND',
      );
    });

    it('returns SOURCE_NOT_FOUND for non-owned documents', async () => {
      const ownerTestUser = createTestUser();
      const ownerUser = toUser(ownerTestUser);
      await insertTestUser(ctx, ownerTestUser);
      const ownerContext = createMockContext(runtime, ownerUser);
      const ownerDoc = await handlers.create({
        context: ownerContext,
        input: { title: 'Owner doc', content: 'Owner content' },
        errors,
      });

      const context = createMockContext(runtime, user);
      await expectHandlerErrorCode(
        () =>
          handlers.delete({
            context,
            input: { id: ownerDoc.id },
            errors,
          }),
        'SOURCE_NOT_FOUND',
      );
    });
  });
});
