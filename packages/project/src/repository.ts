import {
  document,
  project,
  projectDocument,
  projectMedia,
  type ProjectDocument,
  type ProjectMedia,
  type CreateProject,
  type UpdateProject,
  type MediaType,
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
 * Insert a new project with document links.
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

    // Insert document links
    let docLinks: ProjectDocument[] = [];
    if (documentIds.length > 0) {
      docLinks = await db
        .insert(projectDocument)
        .values(
          documentIds.map((documentId, index) => ({
            projectId: proj!.id,
            documentId,
            order: index,
          })),
        )
        .returning();
    }

    return { ...proj!, documents: docLinks };
  });

/**
 * Find project by ID with documents.
 */
export const findProjectById = (id: string) =>
  withDb('project.findById', async (db) => {
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, id))
      .limit(1);

    if (!proj) return null;

    const docs = await db
      .select()
      .from(projectDocument)
      .where(eq(projectDocument.projectId, id))
      .orderBy(projectDocument.order);

    return { ...proj, documents: docs };
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
    let docLinks: ProjectDocument[] = [];
    if (documentIds !== undefined) {
      // Delete existing links
      await db.delete(projectDocument).where(eq(projectDocument.projectId, id));

      // Insert new links
      if (documentIds.length > 0) {
        docLinks = await db
          .insert(projectDocument)
          .values(
            documentIds.map((documentId, index) => ({
              projectId: id,
              documentId,
              order: index,
            })),
          )
          .returning();
      }
    } else {
      // Fetch existing document links if not updating
      docLinks = await db
        .select()
        .from(projectDocument)
        .where(eq(projectDocument.projectId, id))
        .orderBy(projectDocument.order);
    }

    return { ...proj, documents: docLinks };
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
  items: { mediaType: MediaType; mediaId: string }[],
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
 * Delete a media item from a project.
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
