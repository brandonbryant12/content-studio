import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import {
  infographic,
  infographicVersion,
  type Infographic,
  type InfographicVersion,
  type InfographicId,
  type InfographicStatusType,
} from '@repo/db/schema';
import { eq, desc, asc, inArray } from 'drizzle-orm';
import { Context, Effect, Layer } from 'effect';
import { InfographicNotFound } from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface InsertInfographic {
  id: InfographicId;
  title: string;
  prompt?: string;
  infographicType: Infographic['infographicType'];
  stylePreset: Infographic['stylePreset'];
  format: Infographic['format'];
  sourceDocumentIds?: readonly string[];
  status?: InfographicStatusType;
  createdBy: string;
}

export interface UpdateInfographic {
  title?: string;
  prompt?: string;
  infographicType?: Infographic['infographicType'];
  stylePreset?: Infographic['stylePreset'];
  format?: Infographic['format'];
  sourceDocumentIds?: readonly string[];
  imageStorageKey?: string | null;
  thumbnailStorageKey?: string | null;
  status?: InfographicStatusType;
  errorMessage?: string | null;
}

export interface InsertInfographicVersion {
  infographicId: InfographicId;
  versionNumber: number;
  prompt?: string;
  infographicType: InfographicVersion['infographicType'];
  stylePreset: InfographicVersion['stylePreset'];
  format: InfographicVersion['format'];
  imageStorageKey: string;
  thumbnailStorageKey?: string;
}

export interface ListOptions {
  createdBy: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface InfographicRepoService {
  readonly insert: (
    data: InsertInfographic,
  ) => Effect.Effect<Infographic, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Infographic[], DatabaseError, Db>;

  readonly update: (
    id: string,
    data: UpdateInfographic,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  readonly insertVersion: (
    data: InsertInfographicVersion,
  ) => Effect.Effect<InfographicVersion, DatabaseError, Db>;

  readonly listVersions: (
    infographicId: string,
  ) => Effect.Effect<readonly InfographicVersion[], DatabaseError, Db>;

  readonly deleteOldVersions: (
    infographicId: string,
    keepCount: number,
  ) => Effect.Effect<number, DatabaseError, Db>;

  /**
   * Set approval (approvedBy + approvedAt).
   */
  readonly setApproval: (
    id: string,
    approvedBy: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Clear approval (set approvedBy/approvedAt to null).
   */
  readonly clearApproval: (
    id: string,
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
      const [row] = await db
        .insert(infographic)
        .values({
          id: data.id,
          title: data.title,
          prompt: data.prompt,
          infographicType: data.infographicType,
          stylePreset: data.stylePreset,
          format: data.format,
          sourceDocumentIds: data.sourceDocumentIds
            ? [...data.sourceDocumentIds]
            : [],
          status: data.status ?? 'draft',
          createdBy: data.createdBy,
        })
        .returning();
      return row!;
    }),

  findById: (id) =>
    withDb('infographicRepo.findById', async (db) => {
      const [row] = await db
        .select()
        .from(infographic)
        .where(eq(infographic.id, id as InfographicId))
        .limit(1);
      return row ?? null;
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  list: (options) =>
    withDb('infographicRepo.list', (db) =>
      db
        .select()
        .from(infographic)
        .where(eq(infographic.createdBy, options.createdBy))
        .orderBy(desc(infographic.createdAt))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0),
    ),

  update: (id, data) =>
    withDb('infographicRepo.update', async (db) => {
      const updateValues: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.title !== undefined) updateValues.title = data.title;
      if (data.prompt !== undefined) updateValues.prompt = data.prompt;
      if (data.infographicType !== undefined)
        updateValues.infographicType = data.infographicType;
      if (data.stylePreset !== undefined)
        updateValues.stylePreset = data.stylePreset;
      if (data.format !== undefined) updateValues.format = data.format;
      if (data.sourceDocumentIds !== undefined)
        updateValues.sourceDocumentIds = [...data.sourceDocumentIds];
      if (data.imageStorageKey !== undefined)
        updateValues.imageStorageKey = data.imageStorageKey;
      if (data.thumbnailStorageKey !== undefined)
        updateValues.thumbnailStorageKey = data.thumbnailStorageKey;
      if (data.status !== undefined) updateValues.status = data.status;
      if (data.errorMessage !== undefined)
        updateValues.errorMessage = data.errorMessage;

      const [row] = await db
        .update(infographic)
        .set(updateValues)
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return row ?? null;
    }).pipe(
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(row)
          : Effect.fail(new InfographicNotFound({ id })),
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

  insertVersion: (data) =>
    withDb('infographicRepo.insertVersion', async (db) => {
      const [row] = await db
        .insert(infographicVersion)
        .values({
          infographicId: data.infographicId,
          versionNumber: data.versionNumber,
          prompt: data.prompt,
          infographicType: data.infographicType,
          stylePreset: data.stylePreset,
          format: data.format,
          imageStorageKey: data.imageStorageKey,
          thumbnailStorageKey: data.thumbnailStorageKey,
        })
        .returning();
      return row!;
    }),

  listVersions: (infographicId) =>
    withDb('infographicRepo.listVersions', (db) =>
      db
        .select()
        .from(infographicVersion)
        .where(
          eq(infographicVersion.infographicId, infographicId as InfographicId),
        )
        .orderBy(asc(infographicVersion.versionNumber)),
    ),

  deleteOldVersions: (infographicId, keepCount) =>
    withDb('infographicRepo.deleteOldVersions', async (db) => {
      // Get versions to keep (newest N)
      const toKeep = await db
        .select({ id: infographicVersion.id })
        .from(infographicVersion)
        .where(
          eq(infographicVersion.infographicId, infographicId as InfographicId),
        )
        .orderBy(desc(infographicVersion.versionNumber))
        .limit(keepCount);

      if (toKeep.length === 0) return 0;

      const keepIds = toKeep.map((v) => v.id);

      // Delete all versions not in the keep list
      const allVersions = await db
        .select({ id: infographicVersion.id })
        .from(infographicVersion)
        .where(
          eq(infographicVersion.infographicId, infographicId as InfographicId),
        );

      const toDeleteIds = allVersions
        .filter((v) => !keepIds.includes(v.id))
        .map((v) => v.id);
      if (toDeleteIds.length === 0) return 0;

      await db
        .delete(infographicVersion)
        .where(inArray(infographicVersion.id, toDeleteIds));

      return toDeleteIds.length;
    }),

  setApproval: (id, approvedBy) =>
    withDb('infographicRepo.setApproval', async (db) => {
      const [row] = await db
        .update(infographic)
        .set({
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return row ?? null;
    }).pipe(
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(row)
          : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),

  clearApproval: (id) =>
    withDb('infographicRepo.clearApproval', async (db) => {
      const [row] = await db
        .update(infographic)
        .set({
          approvedBy: null,
          approvedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(infographic.id, id as InfographicId))
        .returning();
      return row ?? null;
    }).pipe(
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(row)
          : Effect.fail(new InfographicNotFound({ id })),
      ),
    ),
};

// =============================================================================
// Layer
// =============================================================================

export const InfographicRepoLive: Layer.Layer<InfographicRepo, never, Db> =
  Layer.sync(InfographicRepo, () => make);
