import {
  document,
  project,
  projectDocument,
  podcast,
  type ProjectDocument,
  type CreateProject,
  type UpdateProject,
} from '@repo/db/schema';
import { withDb } from '@repo/effect/db';
import { DocumentNotFound } from '@repo/effect/errors';
import { eq, desc, and, inArray, count as drizzleCount } from 'drizzle-orm';
import { Effect } from 'effect';
import type { AddDocumentInput } from './types';

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

/**
 * Verify documents exist and are owned by the user.
 */
export const verifyDocumentsExist = (documentIds: string[], userId: string) =>
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
 * Insert a new project with optional initial documents.
 */
export const insertProject = (
  data: Omit<CreateProject, 'documentIds'> & { createdBy: string },
  documentIds: string[],
) =>
  withDb('project.insert', async (db) => {
    const [proj] = await db
      .insert(project)
      .values({
        title: data.title,
        description: data.description,
        createdBy: data.createdBy,
      })
      .returning();

    let documents: ProjectDocument[] = [];
    if (documentIds.length > 0) {
      documents = await db
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

    return { ...proj!, documents };
  });

/**
 * Find project by ID with documents and output counts.
 */
export const findProjectById = (id: string) =>
  withDb('project.findById', async (db) => {
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, id))
      .limit(1);

    if (!proj) return null;

    // Get document junction records
    const docLinks = await db
      .select()
      .from(projectDocument)
      .where(eq(projectDocument.projectId, id))
      .orderBy(projectDocument.order);

    // Resolve full document objects
    const documentIds = docLinks.map((d) => d.documentId);
    const documents =
      documentIds.length > 0
        ? await db
            .select()
            .from(document)
            .where(inArray(document.id, documentIds))
        : [];

    // Sort documents by junction table order
    const docMap = new Map(documents.map((d) => [d.id, d]));
    const sortedDocuments = docLinks
      .map((link) => docMap.get(link.documentId))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);

    // Count podcasts for this project
    const [podcastCount] = await db
      .select({ count: drizzleCount() })
      .from(podcast)
      .where(eq(podcast.projectId, id));

    return {
      ...proj,
      documents: sortedDocuments,
      outputCounts: {
        podcasts: podcastCount?.count ?? 0,
      },
    };
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

    const [proj] = await db
      .update(project)
      .set({
        ...projectData,
        updatedAt: new Date(),
      })
      .where(eq(project.id, id))
      .returning();

    if (!proj) return null;

    let documents: ProjectDocument[] = [];
    if (documentIds !== undefined) {
      // Delete existing document links
      await db
        .delete(projectDocument)
        .where(eq(projectDocument.projectId, id));

      // Insert new document links
      if (documentIds.length > 0) {
        documents = await db
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
      documents = await db
        .select()
        .from(projectDocument)
        .where(eq(projectDocument.projectId, id))
        .orderBy(projectDocument.order);
    }

    return { ...proj, documents };
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
// Document Operations
// =============================================================================

/**
 * Get all documents for a project.
 */
export const findDocumentsByProjectId = (projectId: string) =>
  withDb('project.findDocuments', async (db) => {
    const links = await db
      .select()
      .from(projectDocument)
      .where(eq(projectDocument.projectId, projectId))
      .orderBy(projectDocument.order);

    if (links.length === 0) return [];

    const documentIds = links.map((l) => l.documentId);
    const docs = await db
      .select()
      .from(document)
      .where(inArray(document.id, documentIds));

    // Sort by order
    const docMap = new Map(docs.map((d) => [d.id, d]));
    return links
      .map((link) => docMap.get(link.documentId))
      .filter((d): d is NonNullable<typeof d> => d !== undefined);
  });

/**
 * Add a document to a project.
 */
export const insertProjectDocument = (
  projectId: string,
  input: AddDocumentInput,
) =>
  withDb('projectDocument.insert', async (db) => {
    let order = input.order;
    if (order === undefined) {
      const existing = await db
        .select({ order: projectDocument.order })
        .from(projectDocument)
        .where(eq(projectDocument.projectId, projectId))
        .orderBy(desc(projectDocument.order))
        .limit(1);
      order = existing.length > 0 ? existing[0]!.order + 1 : 0;
    }

    const [result] = await db
      .insert(projectDocument)
      .values({
        projectId,
        documentId: input.documentId,
        order,
      })
      .returning();

    return result!;
  });

/**
 * Remove a document from a project.
 */
export const deleteProjectDocument = (projectId: string, documentId: string) =>
  withDb('projectDocument.delete', async (db) => {
    const result = await db
      .delete(projectDocument)
      .where(
        and(
          eq(projectDocument.projectId, projectId),
          eq(projectDocument.documentId, documentId),
        ),
      )
      .returning({ id: projectDocument.id });
    return result.length > 0;
  });

/**
 * Reorder documents in a project.
 */
export const reorderProjectDocuments = (
  projectId: string,
  documentIds: string[],
) =>
  withDb('projectDocument.reorder', async (db) => {
    const updates = documentIds.map((documentId, index) =>
      db
        .update(projectDocument)
        .set({ order: index })
        .where(
          and(
            eq(projectDocument.projectId, projectId),
            eq(projectDocument.documentId, documentId),
          ),
        ),
    );

    await Promise.all(updates);

    return db
      .select()
      .from(projectDocument)
      .where(eq(projectDocument.projectId, projectId))
      .orderBy(projectDocument.order);
  });
