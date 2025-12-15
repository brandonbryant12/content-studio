import {
  document,
  project,
  projectMedia,
  mediaSource,
  type ProjectMedia,
  type CreateProject,
  type UpdateProject,
  type ContentType,
} from '@repo/db/schema';
import { withDb } from '@repo/effect/db';
import {
  DocumentNotFound,
  ProjectNotFound as ProjectNotFoundError,
} from '@repo/effect/errors';
import { eq, desc, and, inArray, count as drizzleCount } from 'drizzle-orm';
import { Effect } from 'effect';
import type { AddMediaInput } from './types';

/**
 * Project Not Found Error
 */
export class ProjectNotFound {
  readonly _tag = 'ProjectNotFound';
  constructor(readonly props: { id: string; message?: string }) {}
  get message() {
    return this.props.message ?? `Project ${this.props.id} not found`;
  }
}

export const verifyDocumentsExistForProject = (
  documentIds: string[],
  userId: string,
) =>
  withDb('project.verifyDocuments', async (db) => {
    const docs = await db
      .select({ id: document.id, createdBy: document.createdBy })
      .from(document)
      .where(inArray(document.id, documentIds));

    const foundIds = new Set(docs.map((d) => d.id));
    const missingId = documentIds.find((id) => !foundIds.has(id));
    const notOwned = docs.find((d) => d.createdBy !== userId);

    return { docs, missingId, notOwnedId: notOwned?.id };
  }).pipe(
    Effect.flatMap(({ docs, missingId, notOwnedId }) => {
      if (missingId) {
        return Effect.fail(new DocumentNotFound({ id: missingId }));
      }
      if (notOwnedId) {
        return Effect.fail(
          new DocumentNotFound({
            id: notOwnedId,
            message: 'Document not found or access denied',
          }),
        );
      }
      return Effect.succeed(docs);
    }),
  );

/**
 * Insert a new project with optional initial media (documents).
 */
export const insertProject = (
  data: Omit<CreateProject, 'documentIds'> & { createdBy: string },
  documentIds: string[],
) =>
  withDb('project.insert', async (db) => {
    // Insert project
    const [proj] = await db
      .insert(project)
      .values({
        title: data.title,
        description: data.description,
        createdBy: data.createdBy,
      })
      .returning();

    // Insert document links as media items
    let mediaItems: ProjectMedia[] = [];
    if (documentIds.length > 0) {
      mediaItems = await db
        .insert(projectMedia)
        .values(
          documentIds.map((documentId, index) => ({
            projectId: proj!.id,
            mediaType: 'document' as ContentType,
            mediaId: documentId,
            order: index,
          })),
        )
        .returning();
    }

    return { ...proj!, media: mediaItems };
  });

/**
 * Find project by ID with media.
 */
export const findProjectById = (id: string) =>
  withDb('project.findById', async (db) => {
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, id))
      .limit(1);

    if (!proj) return null;

    const media = await db
      .select()
      .from(projectMedia)
      .where(eq(projectMedia.projectId, id))
      .orderBy(projectMedia.order);

    return { ...proj, media };
  }).pipe(
    Effect.flatMap((result) =>
      result
        ? Effect.succeed(result)
        : Effect.fail(new ProjectNotFound({ id })),
    ),
  );

/**
 * List projects with optional filters.
 */
export const listProjects = (options: {
  createdBy?: string;
  limit?: number;
  offset?: number;
}) =>
  withDb('project.list', (db) => {
    const conditions = [];
    if (options.createdBy) {
      conditions.push(eq(project.createdBy, options.createdBy));
    }

    return db
      .select()
      .from(project)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(project.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0);
  });

/**
 * Update project by ID with optional document links.
 */
export const updateProject = (id: string, data: UpdateProject) =>
  withDb('project.update', async (db) => {
    const { documentIds, ...projectData } = data;

    // Update project metadata only
    const [proj] = await db
      .update(project)
      .set({
        ...projectData,
        updatedAt: new Date(),
      })
      .where(eq(project.id, id))
      .returning();

    if (!proj) return null;

    // Handle document links if provided
    let mediaItems: ProjectMedia[] = [];
    if (documentIds !== undefined) {
      // Delete existing document media items
      await db
        .delete(projectMedia)
        .where(
          and(
            eq(projectMedia.projectId, id),
            eq(projectMedia.mediaType, 'document'),
          ),
        );

      // Insert new document links as media items
      if (documentIds.length > 0) {
        mediaItems = await db
          .insert(projectMedia)
          .values(
            documentIds.map((documentId, index) => ({
              projectId: id,
              mediaType: 'document' as ContentType,
              mediaId: documentId,
              order: index,
            })),
          )
          .returning();
      }
    } else {
      // Fetch existing media items if not updating
      mediaItems = await db
        .select()
        .from(projectMedia)
        .where(eq(projectMedia.projectId, id))
        .orderBy(projectMedia.order);
    }

    return { ...proj, media: mediaItems };
  }).pipe(
    Effect.flatMap((result) =>
      result
        ? Effect.succeed(result)
        : Effect.fail(new ProjectNotFound({ id })),
    ),
  );

/**
 * Delete project by ID.
 */
export const deleteProject = (id: string) =>
  withDb('project.delete', async (db) => {
    const result = await db
      .delete(project)
      .where(eq(project.id, id))
      .returning({ id: project.id });
    return result.length > 0;
  });

/**
 * Count projects.
 */
export const countProjects = (options?: { createdBy?: string }) =>
  withDb('project.count', async (db) => {
    const conditions = [];
    if (options?.createdBy) {
      conditions.push(eq(project.createdBy, options.createdBy));
    }

    const [result] = await db
      .select({ count: drizzleCount() })
      .from(project)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return result?.count ?? 0;
  });

// =============================================================================
// Project Media Operations (Polymorphic)
// =============================================================================

/**
 * Get all media items for a project.
 */
export const findProjectMediaByProjectId = (projectId: string) =>
  withDb('projectMedia.findByProjectId', (db) =>
    db
      .select()
      .from(projectMedia)
      .where(eq(projectMedia.projectId, projectId))
      .orderBy(projectMedia.order),
  );

/**
 * Insert a media item into a project.
 */
export const insertProjectMedia = (projectId: string, input: AddMediaInput) =>
  withDb('projectMedia.insert', async (db) => {
    // If order not specified, get the max order and add 1
    let order = input.order;
    if (order === undefined) {
      const existing = await db
        .select({ order: projectMedia.order })
        .from(projectMedia)
        .where(eq(projectMedia.projectId, projectId))
        .orderBy(desc(projectMedia.order))
        .limit(1);
      order = existing.length > 0 ? existing[0]!.order + 1 : 0;
    }

    const [result] = await db
      .insert(projectMedia)
      .values({
        projectId,
        mediaType: input.mediaType,
        mediaId: input.mediaId,
        order,
      })
      .returning();

    return result!;
  });

/**
 * Insert multiple media items into a project.
 */
export const insertProjectMediaBatch = (
  projectId: string,
  items: { mediaType: ContentType; mediaId: string }[],
) =>
  withDb('projectMedia.insertBatch', async (db) => {
    if (items.length === 0) return [];

    const result = await db
      .insert(projectMedia)
      .values(
        items.map((item, index) => ({
          projectId,
          mediaType: item.mediaType,
          mediaId: item.mediaId,
          order: index,
        })),
      )
      .returning();

    return result;
  });

/**
 * Delete a media item from a project by its projectMedia id.
 */
export const deleteProjectMediaById = (projectMediaId: string) =>
  withDb('projectMedia.deleteById', async (db) => {
    const result = await db
      .delete(projectMedia)
      .where(eq(projectMedia.id, projectMediaId))
      .returning({ id: projectMedia.id });
    return result.length > 0;
  });

/**
 * Delete a media item from a project by mediaId.
 */
export const deleteProjectMedia = (projectId: string, mediaId: string) =>
  withDb('projectMedia.delete', async (db) => {
    const result = await db
      .delete(projectMedia)
      .where(
        and(
          eq(projectMedia.projectId, projectId),
          eq(projectMedia.mediaId, mediaId),
        ),
      )
      .returning({ id: projectMedia.id });
    return result.length > 0;
  });

/**
 * Delete all media items from a project.
 */
export const deleteAllProjectMedia = (projectId: string) =>
  withDb('projectMedia.deleteAll', async (db) => {
    await db.delete(projectMedia).where(eq(projectMedia.projectId, projectId));
  });

/**
 * Reorder media items in a project.
 * Takes an ordered array of media IDs and updates their order accordingly.
 */
export const reorderProjectMedia = (projectId: string, mediaIds: string[]) =>
  withDb('projectMedia.reorder', async (db) => {
    // Update each item's order based on its position in the array
    const updates = mediaIds.map((mediaId, index) =>
      db
        .update(projectMedia)
        .set({ order: index })
        .where(
          and(
            eq(projectMedia.projectId, projectId),
            eq(projectMedia.mediaId, mediaId),
          ),
        ),
    );

    await Promise.all(updates);

    // Return updated items
    return db
      .select()
      .from(projectMedia)
      .where(eq(projectMedia.projectId, projectId))
      .orderBy(projectMedia.order);
  });

// =============================================================================
// Media Source Operations (Content Derivation Graph)
// =============================================================================

/**
 * Find all sources for a given target (what media was used to create this content).
 */
export const findSourcesForTarget = (
  targetType: ContentType,
  targetId: string,
) =>
  withDb('mediaSource.findForTarget', (db) =>
    db
      .select()
      .from(mediaSource)
      .where(
        and(
          eq(mediaSource.targetType, targetType),
          eq(mediaSource.targetId, targetId),
        ),
      )
      .orderBy(mediaSource.order),
  );

/**
 * Find all targets that use a given source (what content was created from this media).
 */
export const findTargetsFromSource = (
  sourceType: ContentType,
  sourceId: string,
) =>
  withDb('mediaSource.findFromSource', (db) =>
    db
      .select()
      .from(mediaSource)
      .where(
        and(
          eq(mediaSource.sourceType, sourceType),
          eq(mediaSource.sourceId, sourceId),
        ),
      )
      .orderBy(mediaSource.createdAt),
  );

/**
 * Add a source relationship.
 */
export const addMediaSource = (input: {
  targetType: ContentType;
  targetId: string;
  sourceType: ContentType;
  sourceId: string;
  order?: number;
}) =>
  withDb('mediaSource.add', async (db) => {
    // If order not specified, get max order and add 1
    let order = input.order;
    if (order === undefined) {
      const existing = await db
        .select({ order: mediaSource.order })
        .from(mediaSource)
        .where(
          and(
            eq(mediaSource.targetType, input.targetType),
            eq(mediaSource.targetId, input.targetId),
          ),
        )
        .orderBy(desc(mediaSource.order))
        .limit(1);
      order = existing.length > 0 ? existing[0]!.order + 1 : 0;
    }

    const [result] = await db
      .insert(mediaSource)
      .values({
        targetType: input.targetType,
        targetId: input.targetId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        order,
      })
      .returning();

    return result!;
  });

/**
 * Add multiple source relationships in batch.
 */
export const addMediaSourceBatch = (
  targetType: ContentType,
  targetId: string,
  sources: { sourceType: ContentType; sourceId: string }[],
) =>
  withDb('mediaSource.addBatch', async (db) => {
    if (sources.length === 0) return [];

    const result = await db
      .insert(mediaSource)
      .values(
        sources.map((source, index) => ({
          targetType,
          targetId,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          order: index,
        })),
      )
      .returning();

    return result;
  });

/**
 * Remove a specific source relationship.
 */
export const removeMediaSource = (
  targetType: ContentType,
  targetId: string,
  sourceType: ContentType,
  sourceId: string,
) =>
  withDb('mediaSource.remove', async (db) => {
    const result = await db
      .delete(mediaSource)
      .where(
        and(
          eq(mediaSource.targetType, targetType),
          eq(mediaSource.targetId, targetId),
          eq(mediaSource.sourceType, sourceType),
          eq(mediaSource.sourceId, sourceId),
        ),
      )
      .returning({ id: mediaSource.id });
    return result.length > 0;
  });

/**
 * Remove all sources for a target.
 */
export const removeAllSourcesForTarget = (
  targetType: ContentType,
  targetId: string,
) =>
  withDb('mediaSource.removeAllForTarget', async (db) => {
    await db
      .delete(mediaSource)
      .where(
        and(
          eq(mediaSource.targetType, targetType),
          eq(mediaSource.targetId, targetId),
        ),
      );
  });
