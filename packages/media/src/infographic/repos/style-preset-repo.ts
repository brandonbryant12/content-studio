import { Db, withDb, type DatabaseError } from '@repo/db/effect';
import {
  infographicStylePreset,
  type InfographicStylePreset,
  type InfographicStylePresetId,
  type StyleProperty,
} from '@repo/db/schema';
import { eq, or, isNull } from 'drizzle-orm';
import { Context, Effect, Layer } from 'effect';

// =============================================================================
// Types
// =============================================================================

export interface InsertStylePreset {
  id?: InfographicStylePresetId;
  name: string;
  properties: StyleProperty[];
  isBuiltIn?: boolean;
  createdBy?: string;
}

// =============================================================================
// Errors
// =============================================================================

export class StylePresetNotFound {
  readonly _tag = 'StylePresetNotFound';
  constructor(readonly id: string) {}
}

// =============================================================================
// Service Interface
// =============================================================================

export interface StylePresetRepoService {
  readonly insert: (
    data: InsertStylePreset,
  ) => Effect.Effect<InfographicStylePreset, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<
    InfographicStylePreset,
    StylePresetNotFound | DatabaseError,
    Db
  >;

  readonly list: (
    userId: string,
  ) => Effect.Effect<readonly InfographicStylePreset[], DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class StylePresetRepo extends Context.Tag('@repo/media/StylePresetRepo')<
  StylePresetRepo,
  StylePresetRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const requirePreset = (id: string) =>
  Effect.flatMap((row: InfographicStylePreset | null | undefined) =>
    row ? Effect.succeed(row) : Effect.fail(new StylePresetNotFound(id)),
  );

const make: StylePresetRepoService = {
  insert: (data) =>
    withDb('stylePresetRepo.insert', async (db) => {
      const [row] = await db
        .insert(infographicStylePreset)
        .values({
          id: data.id,
          name: data.name,
          properties: data.properties,
          isBuiltIn: data.isBuiltIn ?? false,
          createdBy: data.createdBy ?? null,
        })
        .returning();
      return row!;
    }),

  findById: (id) =>
    withDb('stylePresetRepo.findById', async (db) => {
      const [row] = await db
        .select()
        .from(infographicStylePreset)
        .where(eq(infographicStylePreset.id, id as InfographicStylePresetId))
        .limit(1);
      return row ?? null;
    }).pipe(requirePreset(id)),

  list: (userId) =>
    withDb('stylePresetRepo.list', (db) =>
      db
        .select()
        .from(infographicStylePreset)
        .where(
          or(
            eq(infographicStylePreset.isBuiltIn, true),
            eq(infographicStylePreset.createdBy, userId),
            isNull(infographicStylePreset.createdBy),
          ),
        )
        .orderBy(infographicStylePreset.name),
    ),

  delete: (id) =>
    withDb('stylePresetRepo.delete', async (db) => {
      const result = await db
        .delete(infographicStylePreset)
        .where(eq(infographicStylePreset.id, id as InfographicStylePresetId))
        .returning({ id: infographicStylePreset.id });
      return result.length > 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const StylePresetRepoLive: Layer.Layer<StylePresetRepo, never, Db> =
  Layer.effect(
    StylePresetRepo,
    Effect.map(Db, () => make),
  );
