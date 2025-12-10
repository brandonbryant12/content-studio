import { oc } from '@orpc/contract';
import { CreateProjectSchema, UpdateProjectSchema } from '@repo/db/schema';
import * as v from 'valibot';

const projectErrors = {
    PROJECT_NOT_FOUND: {
        status: 404,
        data: v.object({
            projectId: v.string(),
        }),
    },
    DOCUMENT_NOT_FOUND: {
        status: 404,
        data: v.object({
            documentId: v.string(),
        }),
    },
} as const;

// Output schemas
const projectOutputSchema = v.object({
    id: v.string(),
    title: v.string(),
    description: v.nullable(v.string()),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
});

const projectDocumentSchema = v.object({
    id: v.string(),
    projectId: v.string(),
    documentId: v.string(),
    order: v.number(),
    createdAt: v.string(),
});

const projectFullSchema = v.object({
    ...projectOutputSchema.entries,
    documents: v.array(projectDocumentSchema),
});

const projectContract = oc
    .prefix('/projects')
    .tag('project')
    .router({
        // List all projects for current user
        list: oc
            .route({
                method: 'GET',
                path: '/',
                summary: 'List projects',
                description: 'Retrieve all projects for the current user',
            })
            .input(
                v.object({
                    limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
                    offset: v.optional(v.pipe(v.number(), v.minValue(0))),
                }),
            )
            .output(v.array(projectOutputSchema)),

        // Get a single project by ID
        get: oc
            .route({
                method: 'GET',
                path: '/{id}',
                summary: 'Get project',
                description: 'Retrieve a project with its documents',
            })
            .errors(projectErrors)
            .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
            .output(projectFullSchema),

        // Create a new project
        create: oc
            .route({
                method: 'POST',
                path: '/',
                summary: 'Create project',
                description: 'Create a new project from documents',
            })
            .errors(projectErrors)
            .input(CreateProjectSchema)
            .output(projectFullSchema),

        // Update a project
        update: oc
            .route({
                method: 'PATCH',
                path: '/{id}',
                summary: 'Update project',
                description: 'Update project settings',
            })
            .errors(projectErrors)
            .input(
                v.object({
                    id: v.pipe(v.string(), v.uuid()),
                    ...UpdateProjectSchema.entries,
                }),
            )
            .output(projectOutputSchema),

        // Delete a project
        delete: oc
            .route({
                method: 'DELETE',
                path: '/{id}',
                summary: 'Delete project',
                description: 'Permanently delete a project and all associated data',
            })
            .errors(projectErrors)
            .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
            .output(v.object({})),
    });

export default projectContract;
