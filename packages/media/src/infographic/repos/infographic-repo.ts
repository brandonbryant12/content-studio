import { Context, Effect, Layer } from 'effect';
import {
  infographic,
  infographicSelection,
  type Infographic,
  type InfographicId,
  type InfographicStatus,
  type InfographicGenerationContext,
  type InfographicStyleOptions,
  type InfographicSelection,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { InfographicNotFound } from '../../errors';
import { eq, desc, count as drizzleCount } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for listing infographics.
 */
export interface ListOptions {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * Infographic with selections joined.
 */
export interface InfographicFull extends Infographic {
  selections: InfographicSelection[];
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for infographic operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface InfographicRepoService {
  /**
   * Insert a new infographic.
   */
  readonly insert: (data: {
    title: string;
    infographicType: string;
    aspectRatio: string;
    sourceDocumentIds: string[];
    createdBy: string;
  }) => Effect.Effect<Infographic, DatabaseError, Db>;

  /**
   * Find infographic by ID.
   * Fails with InfographicNotFound if not found.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Find infographic by ID with selections joined.
   * Fails with InfographicNotFound if not found.
   */
  readonly findByIdFull: (
    id: string,
  ) => Effect.Effect<InfographicFull, InfographicNotFound | DatabaseError, Db>;

  /**
   * Update infographic by ID.
   * Fails with InfographicNotFound if not found.
   */
  readonly update: (
    id: string,
    data: {
      title?: string;
      infographicType?: string;
      aspectRatio?: string;
      customInstructions?: string | null;
      feedbackInstructions?: string | null;
      styleOptions?: InfographicStyleOptions | null;
      sourceDocumentIds?: string[];
    },
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Delete infographic by ID.
   * Returns true if deleted, false if not found.
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * List infographics with optional filters.
   */
  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Infographic[], DatabaseError, Db>;

  /**
   * Count infographics with optional filter.
   */
  readonly count: (
    options?: { createdBy?: string },
  ) => Effect.Effect<number, DatabaseError, Db>;

  /**
   * Update infographic status.
   * Fails with InfographicNotFound if not found.
   */
  readonly updateStatus: (
    id: string,
    status: InfographicStatus,
    errorMessage?: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Update image URL after generation.
   * Fails with InfographicNotFound if not found.
   */
  readonly updateImage: (
    id: string,
    imageUrl: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Clear image URL for regeneration.
   * Fails with InfographicNotFound if not found.
   */
  readonly clearImage: (
    id: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Update generation context.
   * Fails with InfographicNotFound if not found.
   */
  readonly updateGenerationContext: (
    id: string,
    context: InfographicGenerationContext,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class InfographicRepo extends Context.Tag('@repo/media/InfographicRepo')<
  InfographicRepo,
  InfographicRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: InfographicRepoService = {
  insert: (data) =>
    withDb('infographicRepo.insert', async (db) => {
      const [ig] = await db
        .insert(infographic)
        .values({
          title: data.title,
          infographicType: data.infographicType,
          aspectRatio: data.aspectRatio,
          sourceDocumentIds: data.sourceDocumentIds,
          createdBy: data.createdBy,
        })
        .returning();
      return ig!;
    }),

  findById: (id) =>
    withDb('infographicRepo.findById', async (db) => {
      const [ig] = await db
        .select()
        .from(infographic)
        .where(eq(infographic.id, id as InfographicId))
        .limit(1);
      return ig ?? null;
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  findByIdFull: (id) =>
    withDb('infographicRepo.findByIdFull', async (db) => {
      // Query infographic
      const [ig] = await db
        .select()
        .from(infographic)
        .where(eq(infographic.id, id as InfographicId))
        .limit(1);
      if (!ig) return null;

      // Query related selections
      const selections = await db
        .select()
        .from(infographicSelection)
        .where(eq(infographicSelection.infographicId, id as InfographicId))
        .orderBy(infographicSelection.orderIndex);

      return { ...ig, selections };
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  update: (id, data) =>
    withDb('infographicRepo.update', async (db) => {
      const updateValues: Partial<Infographic> = {
        updatedAt: new Date(),
      };

      if (data.title !== undefined) updateValues.title = data.title;
      if (data.infographicType !== undefined)
        updateValues.infographicType = data.infographicType;
      if (data.aspectRatio !== undefined)
        updateValues.aspectRatio = data.aspectRatio;
      if (data.customInstructions !== undefined)
        updateValues.customInstructions = data.customInstructions;
      if (data.feedbackInstructions !== undefined)
        updateValues.feedbackInstructions = data.feedbackInstructions;
      if (data.styleOptions !== undefined)
        updateValues.styleOptions = data.styleOptions;
      if (data.sourceDocumentIds !== undefined)
        updateValues.sourceDocumentIds = data.sourceDocumentIds;

      const [ig] = await db
        .update(infographic)
        .set(updateValues)
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return ig ?? null;
    }).pipe(
      Effect.flatMap((ig) =>
        ig ? Effect.succeed(ig) : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('infographicRepo.delete', async (db) => {
      const result = await db
        .delete(infographic)
        .where(eq(infographic.id, id as InfographicId))
        .returning({ id: infographic.id });
      return result.length > 0;
    }),

  list: (options) =>
    withDb('infographicRepo.list', (db) => {
      const conditions = options.createdBy
        ? eq(infographic.createdBy, options.createdBy)
        : undefined;

      return db
        .select()
        .from(infographic)
        .where(conditions)
        .orderBy(desc(infographic.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  count: (options) =>
    withDb('infographicRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(infographic.createdBy, options.createdBy)
        : undefined;

      const [result] = await db
        .select({ count: drizzleCount() })
        .from(infographic)
        .where(conditions);
      return result?.count ?? 0;
    }),

  updateStatus: (id, status, errorMessage) =>
    withDb('infographicRepo.updateStatus', async (db) => {
      const [ig] = await db
        .update(infographic)
        .set({
          status,
          errorMessage: errorMessage ?? null,
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return ig ?? null;
    }).pipe(
      Effect.flatMap((ig) =>
        ig ? Effect.succeed(ig) : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  updateImage: (id, imageUrl) =>
    withDb('infographicRepo.updateImage', async (db) => {
      const [ig] = await db
        .update(infographic)
        .set({
          imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return ig ?? null;
    }).pipe(
      Effect.flatMap((ig) =>
        ig ? Effect.succeed(ig) : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  clearImage: (id) =>
    withDb('infographicRepo.clearImage', async (db) => {
      const [ig] = await db
        .update(infographic)
        .set({
          imageUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return ig ?? null;
    }).pipe(
      Effect.flatMap((ig) =>
        ig ? Effect.succeed(ig) : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  updateGenerationContext: (id, context) =>
    withDb('infographicRepo.updateGenerationContext', async (db) => {
      const [ig] = await db
        .update(infographic)
        .set({
          generationContext: context,
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return ig ?? null;
    }).pipe(
      Effect.flatMap((ig) =>
        ig ? Effect.succeed(ig) : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),
};

// =============================================================================
// Layer
// =============================================================================

export const InfographicRepoLive: Layer.Layer<InfographicRepo, never, Db> =
  Layer.succeed(InfographicRepo, make);
