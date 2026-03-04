import { user as userTable, source as sourceTable } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { createTestContext, type TestContext } from '../setup';
import { stopPostgresContainer } from '../testcontainers';

describe('database test context', () => {
  let ctx: TestContext | null = null;

  afterEach(async () => {
    if (ctx) {
      await ctx.rollback();
      ctx = null;
    }
  });

  afterAll(async () => {
    await stopPostgresContainer();
  });

  it('creates a working database context', async () => {
    ctx = await createTestContext();
    expect(ctx.db).toBeDefined();
    expect(ctx.dbLayer).toBeDefined();
  });

  it('supports insert and query operations', async () => {
    ctx = await createTestContext();
    const now = new Date();

    await ctx.db.insert(userTable).values({
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const users = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, 'test-user-1'));

    expect(users).toHaveLength(1);
    expect(users[0]!.email).toBe('test@example.com');
  });

  it('isolates data between tests via rollback', async () => {
    ctx = await createTestContext();

    const users = await ctx.db.select().from(userTable);
    expect(users).toHaveLength(0);
  });

  it('supports foreign keys and JSONB', async () => {
    ctx = await createTestContext();
    const now = new Date();

    await ctx.db.insert(userTable).values({
      id: 'user-fk-test',
      email: 'fk@example.com',
      name: 'FK Test User',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert(sourceTable).values({
      title: 'Test Source',
      contentKey: 'docs/test.txt',
      mimeType: 'text/plain',
      wordCount: 100,
      metadata: { key: 'value', nested: { a: 1 } },
      createdBy: 'user-fk-test',
      createdAt: now,
      updatedAt: now,
    });

    const docs = await ctx.db
      .select()
      .from(sourceTable)
      .where(eq(sourceTable.createdBy, 'user-fk-test'));

    expect(docs).toHaveLength(1);
    expect(docs[0]!.title).toBe('Test Source');
    expect(docs[0]!.metadata).toEqual({ key: 'value', nested: { a: 1 } });
  });
});
