import { Context, Effect, Layer } from 'effect';
import {
  brand,
  type Brand,
  type BrandId,
  type BrandColors,
  type BrandPersona,
  type BrandSegment,
  type BrandChatMessage,
  type CreateBrand,
  type UpdateBrand,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { BrandNotFound } from '../../errors';
import { eq, desc, count as drizzleCount } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for listing brands.
 */
export interface ListOptions {
  createdBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * Extended update data that includes chatMessages.
 * Used by the append-chat-message use case.
 */
export interface BrandUpdateData extends Partial<UpdateBrand> {
  chatMessages?: BrandChatMessage[];
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for brand operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface BrandRepoService {
  /**
   * Insert a new brand.
   */
  readonly insert: (
    data: Omit<CreateBrand, 'chatMessages'> & { createdBy: string },
  ) => Effect.Effect<Brand, DatabaseError, Db>;

  /**
   * Find brand by ID.
   * Fails with BrandNotFound if not found.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<Brand, BrandNotFound | DatabaseError, Db>;

  /**
   * List brands with optional filters.
   */
  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Brand[], DatabaseError, Db>;

  /**
   * Update brand by ID.
   * Fails with BrandNotFound if not found.
   */
  readonly update: (
    id: string,
    data: BrandUpdateData,
  ) => Effect.Effect<Brand, BrandNotFound | DatabaseError, Db>;

  /**
   * Delete brand by ID.
   * Returns true if deleted, false if not found.
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * Count brands with optional filter.
   */
  readonly count: (options?: {
    createdBy?: string;
  }) => Effect.Effect<number, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class BrandRepo extends Context.Tag('@repo/media/BrandRepo')<
  BrandRepo,
  BrandRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: BrandRepoService = {
  insert: (data) =>
    withDb('brandRepo.insert', async (db) => {
      const [result] = await db
        .insert(brand)
        .values({
          name: data.name,
          description: data.description,
          mission: data.mission,
          values: data.values ? [...data.values] : undefined,
          colors: data.colors
            ? {
                primary: data.colors.primary,
                secondary: data.colors.secondary,
                accent: data.colors.accent,
              }
            : undefined,
          brandGuide: data.brandGuide,
          personas: data.personas
            ? data.personas.map((p) => ({
                id: p.id,
                name: p.name,
                role: p.role,
                voiceId: p.voiceId,
                personalityDescription: p.personalityDescription,
                speakingStyle: p.speakingStyle,
                exampleQuotes: [...p.exampleQuotes],
              }))
            : undefined,
          segments: data.segments
            ? data.segments.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                messagingTone: s.messagingTone,
                keyBenefits: [...s.keyBenefits],
              }))
            : undefined,
          createdBy: data.createdBy,
        })
        .returning();
      return result!;
    }),

  findById: (id) =>
    withDb('brandRepo.findById', (db) =>
      db
        .select()
        .from(brand)
        .where(eq(brand.id, id as BrandId))
        .limit(1)
        .then((rows) => rows[0]),
    ).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new BrandNotFound({ id })),
      ),
    ),

  list: (options) =>
    withDb('brandRepo.list', (db) => {
      const conditions = options.createdBy
        ? eq(brand.createdBy, options.createdBy)
        : undefined;

      return db
        .select()
        .from(brand)
        .where(conditions)
        .orderBy(desc(brand.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0);
    }),

  update: (id, data) =>
    withDb('brandRepo.update', async (db) => {
      // Convert readonly arrays to mutable for Drizzle
      const updateValues: Partial<Brand> = {
        updatedAt: new Date(),
      };

      if (data.name !== undefined) updateValues.name = data.name;
      if (data.description !== undefined)
        updateValues.description = data.description;
      if (data.mission !== undefined) updateValues.mission = data.mission;
      if (data.brandGuide !== undefined)
        updateValues.brandGuide = data.brandGuide;

      if (data.values !== undefined) {
        updateValues.values = [...data.values];
      }

      if (data.colors !== undefined) {
        updateValues.colors = {
          primary: data.colors.primary,
          secondary: data.colors.secondary,
          accent: data.colors.accent,
        } as BrandColors;
      }

      if (data.personas !== undefined) {
        updateValues.personas = data.personas.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          voiceId: p.voiceId,
          personalityDescription: p.personalityDescription,
          speakingStyle: p.speakingStyle,
          exampleQuotes: [...p.exampleQuotes],
        })) as BrandPersona[];
      }

      if (data.segments !== undefined) {
        updateValues.segments = data.segments.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          messagingTone: s.messagingTone,
          keyBenefits: [...s.keyBenefits],
        })) as BrandSegment[];
      }

      if (data.chatMessages !== undefined) {
        updateValues.chatMessages = data.chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })) as BrandChatMessage[];
      }

      const [result] = await db
        .update(brand)
        .set(updateValues)
        .where(eq(brand.id, id as BrandId))
        .returning();
      return result;
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new BrandNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('brandRepo.delete', async (db) => {
      const result = await db
        .delete(brand)
        .where(eq(brand.id, id as BrandId))
        .returning({ id: brand.id });
      return result.length > 0;
    }),

  count: (options) =>
    withDb('brandRepo.count', async (db) => {
      const conditions = options?.createdBy
        ? eq(brand.createdBy, options.createdBy)
        : undefined;
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(brand)
        .where(conditions);
      return result?.count ?? 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const BrandRepoLive: Layer.Layer<BrandRepo, never, Db> = Layer.succeed(
  BrandRepo,
  make,
);
