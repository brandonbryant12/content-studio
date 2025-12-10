import {
    document,
    project,
    projectDocument,
    type ProjectDocument,
    type CreateProject,
    type UpdateProject,
} from '@repo/db/schema';
import { withDb } from '@repo/effect/db';
import { DocumentNotFound } from '@repo/effect/errors';
import { eq, desc, and, inArray, count as drizzleCount } from 'drizzle-orm';
import { Effect } from 'effect';


/**
 * Project Not Found Error
 */
export class ProjectNotFound {
    readonly _tag = 'ProjectNotFound';
    constructor(readonly props: { id: string; message?: string }) { }
    get message() {
        return this.props.message ?? `Project ${this.props.id} not found`;
    }
}

export const verifyDocumentsExistForProject = (documentIds: string[], userId: string) =>
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
        const [proj] = await db.select().from(project).where(eq(project.id, id)).limit(1);

        if (!proj) return null;

        const docs = await db
            .select()
            .from(projectDocument)
            .where(eq(projectDocument.projectId, id))
            .orderBy(projectDocument.order);

        return { ...proj, documents: docs };
    }).pipe(
        Effect.flatMap((result) =>
            result ? Effect.succeed(result) : Effect.fail(new ProjectNotFound({ id })),
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
 * Update project by ID.
 */
export const updateProject = (id: string, data: UpdateProject) =>
    withDb('project.update', async (db) => {
        const [proj] = await db
            .update(project)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(project.id, id))
            .returning();
        return proj;
    }).pipe(
        Effect.flatMap((proj) => (proj ? Effect.succeed(proj) : Effect.fail(new ProjectNotFound({ id })))),
    );

/**
 * Delete project by ID.
 */
export const deleteProject = (id: string) =>
    withDb('project.delete', async (db) => {
        const result = await db.delete(project).where(eq(project.id, id)).returning({ id: project.id });
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
