import { Context, Effect, Layer } from 'effect';
import {
  infographicSelection,
  type InfographicSelection,
  type InfographicId,
  type InfographicSelectionId,
  type DocumentId,
} from '@repo/db/schema';
import { withDb, type Db, type DatabaseError } from '@repo/db/effect';
import { InfographicSelectionNotFound } from '../../errors';
import { eq, and, count as drizzleCount, asc } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

/**
 * Data for inserting a new selection.
 */
export interface InsertSelection {
  infographicId: InfographicId;
  documentId: DocumentId;
  selectedText: string;
  startOffset?: number;
  endOffset?: number;
  orderIndex?: number;
}

/**
 * Data for updating a selection.
 */
export interface UpdateSelection {
  selectedText?: string;
  startOffset?: number;
  endOffset?: number;
  orderIndex?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Repository interface for infographic selection operations.
 * Handles raw database access without business logic.
 * All methods require Db context.
 */
export interface SelectionRepoService {
  /**
   * Insert a new selection.
   */
  readonly insert: (
    data: InsertSelection,
  ) => Effect.Effect<InfographicSelection, DatabaseError, Db>;

  /**
   * Find selection by ID.
   */
  readonly findById: (
    id: string,
  ) => Effect.Effect<
    InfographicSelection,
    InfographicSelectionNotFound | DatabaseError,
    Db
  >;

  /**
   * Find all selections for an infographic, ordered by orderIndex.
   */
  readonly findByInfographic: (
    infographicId: string,
  ) => Effect.Effect<readonly InfographicSelection[], DatabaseError, Db>;

  /**
   * Update selection by ID.
   */
  readonly update: (
    id: string,
    data: UpdateSelection,
  ) => Effect.Effect<
    InfographicSelection,
    InfographicSelectionNotFound | DatabaseError,
    Db
  >;

  /**
   * Delete selection by ID.
   */
  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  /**
   * Reorder selections for an infographic.
   * Updates all order indices in a single transaction.
   */
  readonly reorder: (
    infographicId: string,
    orderedIds: readonly string[],
  ) => Effect.Effect<readonly InfographicSelection[], DatabaseError, Db>;

  /**
   * Insert multiple selections at once.
   */
  readonly bulkInsert: (
    data: readonly InsertSelection[],
  ) => Effect.Effect<readonly InfographicSelection[], DatabaseError, Db>;

  /**
   * Count selections for an infographic.
   */
  readonly count: (
    infographicId: string,
  ) => Effect.Effect<number, DatabaseError, Db>;

  /**
   * Delete all selections for an infographic.
   */
  readonly deleteByInfographic: (
    infographicId: string,
  ) => Effect.Effect<boolean, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class SelectionRepo extends Context.Tag('@repo/media/SelectionRepo')<
  SelectionRepo,
  SelectionRepoService
>() {}

// =============================================================================
// Implementation
// =============================================================================

const make: SelectionRepoService = {
  insert: (data) =>
    withDb('selectionRepo.insert', async (db) => {
      const [selection] = await db
        .insert(infographicSelection)
        .values({
          infographicId: data.infographicId,
          documentId: data.documentId,
          selectedText: data.selectedText,
          startOffset: data.startOffset,
          endOffset: data.endOffset,
          orderIndex: data.orderIndex ?? 0,
        })
        .returning();
      return selection!;
    }),

  findById: (id) =>
    withDb('selectionRepo.findById', async (db) => {
      const [selection] = await db
        .select()
        .from(infographicSelection)
        .where(eq(infographicSelection.id, id as InfographicSelectionId))
        .limit(1);
      return selection ?? null;
    }).pipe(
      Effect.flatMap((result) =>
        result
          ? Effect.succeed(result)
          : Effect.fail(new InfographicSelectionNotFound({ id })),
      ),
    ),

  findByInfographic: (infographicId) =>
    withDb('selectionRepo.findByInfographic', (db) =>
      db
        .select()
        .from(infographicSelection)
        .where(
          eq(
            infographicSelection.infographicId,
            infographicId as InfographicId,
          ),
        )
        .orderBy(asc(infographicSelection.orderIndex)),
    ),

  update: (id, data) =>
    withDb('selectionRepo.update', async (db) => {
      const updateValues: Partial<InfographicSelection> = {};

      if (data.selectedText !== undefined)
        updateValues.selectedText = data.selectedText;
      if (data.startOffset !== undefined)
        updateValues.startOffset = data.startOffset;
      if (data.endOffset !== undefined) updateValues.endOffset = data.endOffset;
      if (data.orderIndex !== undefined)
        updateValues.orderIndex = data.orderIndex;

      const [selection] = await db
        .update(infographicSelection)
        .set(updateValues)
        .where(eq(infographicSelection.id, id as InfographicSelectionId))
        .returning();
      return selection ?? null;
    }).pipe(
      Effect.flatMap((selection) =>
        selection
          ? Effect.succeed(selection)
          : Effect.fail(new InfographicSelectionNotFound({ id })),
      ),
    ),

  delete: (id) =>
    withDb('selectionRepo.delete', async (db) => {
      const result = await db
        .delete(infographicSelection)
        .where(eq(infographicSelection.id, id as InfographicSelectionId))
        .returning({ id: infographicSelection.id });
      return result.length > 0;
    }),

  reorder: (infographicId, orderedIds) =>
    withDb('selectionRepo.reorder', async (db) => {
      return db.transaction(async (tx) => {
        // Update each selection's orderIndex based on its position in the array
        for (let i = 0; i < orderedIds.length; i++) {
          await tx
            .update(infographicSelection)
            .set({ orderIndex: i })
            .where(
              and(
                eq(
                  infographicSelection.id,
                  orderedIds[i] as InfographicSelectionId,
                ),
                eq(
                  infographicSelection.infographicId,
                  infographicId as InfographicId,
                ),
              ),
            );
        }

        // Return the updated selections in order
        return tx
          .select()
          .from(infographicSelection)
          .where(
            eq(
              infographicSelection.infographicId,
              infographicId as InfographicId,
            ),
          )
          .orderBy(asc(infographicSelection.orderIndex));
      });
    }),

  bulkInsert: (data) =>
    withDb('selectionRepo.bulkInsert', async (db) => {
      if (data.length === 0) {
        return [];
      }

      const values = data.map((item, index) => ({
        infographicId: item.infographicId,
        documentId: item.documentId,
        selectedText: item.selectedText,
        startOffset: item.startOffset,
        endOffset: item.endOffset,
        orderIndex: item.orderIndex ?? index,
      }));

      return db.insert(infographicSelection).values(values).returning();
    }),

  count: (infographicId) =>
    withDb('selectionRepo.count', async (db) => {
      const [result] = await db
        .select({ count: drizzleCount() })
        .from(infographicSelection)
        .where(
          eq(
            infographicSelection.infographicId,
            infographicId as InfographicId,
          ),
        );
      return result?.count ?? 0;
    }),

  deleteByInfographic: (infographicId) =>
    withDb('selectionRepo.deleteByInfographic', async (db) => {
      const result = await db
        .delete(infographicSelection)
        .where(
          eq(
            infographicSelection.infographicId,
            infographicId as InfographicId,
          ),
        )
        .returning({ id: infographicSelection.id });
      return result.length > 0;
    }),
};

// =============================================================================
// Layer
// =============================================================================

export const SelectionRepoLive: Layer.Layer<SelectionRepo, never, Db> =
  Layer.succeed(SelectionRepo, make);
