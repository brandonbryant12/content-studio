import { Context, Effect, Layer } from 'effect';
import {
  audienceSegment,
  type AudienceSegment,
  type AudienceSegmentId,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { AudienceSegmentNotFound } from '../../errors';
import { eq, desc, count as drizzleCount } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

export interface ListOptions {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface AudienceSegmentRepoService {
  readonly insert: (
    data: typeof audienceSegment.$inferInsert,
  ) => Effect.Effect<AudienceSegment, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<
    AudienceSegment,
    AudienceSegmentNotFound | DatabaseError,
    Db
  >;

  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly AudienceSegment[], DatabaseError, Db>;

  readonly update: (
    id: string,
    data: Partial<typeof audienceSegment.$inferInsert>,
  ) => Effect.Effect<
    AudienceSegment,
    AudienceSegmentNotFound | DatabaseError,
    Db
  >;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  readonly count: (options?: {
    createdBy?: string;
  }) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class AudienceSegmentRepo extends Context.Tag(
  '@repo/media/AudienceSegmentRepo',
)<AudienceSegmentRepo, AudienceSegmentRepoService>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: AudienceSegmentRepoService = {
  insert: (data) =>
    withDb('audienceSegmentRepo.insert', async (db) => {
      const [result] = await db
        .insert(audienceSegment)
        .values(data)
        .returning();
      return result!;
    }),

  findById: (id) =>
    withDb('audienceSegmentRepo.findById', (db) =>
      db
        .select()
        .from(audienceSegment)
        .where(eq(audienceSegment.id, id as AudienceSegmentId))
        .limit(1)
        .then((rows) => rows[0]),
    ).pipe(
      Effect.flatMap((seg) =>
        seg
          ? Effect.succeed(seg)
          : Effect.fail(new AudienceSegmentNotFound({ id })),
      ),
    ),

  list: (options) =>
    withDb('audienceSegmentRepo.list', (db) => {
      const conditions = options.createdBy
        ? eq(audienceSegment.createdBy, options.createdBy)
        : undefined;

      return db
        .select()
        .from(audienceSegment)
        .where(conditions)
        .orderBy(desc(audienceSegment.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  update: (id, data) =>
    withDb('audienceSegmentRepo.update', async (db) => {
      const [result] = await db
        .update(audienceSegment)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(audienceSegment.id, id as AudienceSegmentId))
        .returning();
      return result;
    }).pipe(
      Effect.flatMap((seg) =>
        seg
          ? Effect.succeed(seg)
          : Effect.fail(new AudienceSegmentNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('audienceSegmentRepo.delete', async (db) => {
      const result = await db
        .delete(audienceSegment)
        .where(eq(audienceSegment.id, id as AudienceSegmentId))
        .returning({ id: audienceSegment.id });
      return result.length > 0;
    }),

  count: (options) =>
    withDb('audienceSegmentRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(audienceSegment.createdBy, options.createdBy)
        : undefined;
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(audienceSegment)
        .where(conditions);
      return result?.count ?? 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const AudienceSegmentRepoLive: Layer.Layer<
  AudienceSegmentRepo,
  never,
  Db
> = Layer.succeed(AudienceSegmentRepo, make);
