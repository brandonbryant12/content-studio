import { oc } from '@orpc/contract';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  DocumentOutputSchema,
} from '@repo/db/schema';
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

// Project with document junction records (for create/update responses)
const projectWithDocumentsSchema = v.object({
  ...projectOutputSchema.entries,
  documents: v.array(projectDocumentSchema),
});

// Full project with resolved documents and output counts (for get responses)
const projectFullSchema = v.object({
  ...projectOutputSchema.entries,
  documents: v.array(DocumentOutputSchema),
  outputCounts: v.object({
    podcasts: v.number(),
  }),
});

const projectContract = oc
  .prefix('/projects')
  .tag('project')
  .router({
    // =====================================================================
    // Core CRUD
    // =====================================================================

    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List projects',
        description: 'Retrieve all projects for the current user',
      })
      .input(
        v.object({
          limit: v.optional(
            v.pipe(
              v.union([v.string(), v.number()]),
              v.transform(Number),
              v.number(),
              v.minValue(1),
              v.maxValue(100),
            ),
          ),
          offset: v.optional(
            v.pipe(
              v.union([v.string(), v.number()]),
              v.transform(Number),
              v.number(),
              v.minValue(0),
            ),
          ),
        }),
      )
      .output(v.array(projectOutputSchema)),

    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get project',
        description:
          'Retrieve a project with resolved documents and output counts',
      })
      .errors(projectErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(projectFullSchema),

    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create project',
        description: 'Create a new project with optional documents',
      })
      .errors(projectErrors)
      .input(CreateProjectSchema)
      .output(projectWithDocumentsSchema),

    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update project',
        description: 'Update project settings and optionally replace documents',
      })
      .errors(projectErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          ...UpdateProjectSchema.entries,
        }),
      )
      .output(projectWithDocumentsSchema),

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

    // =====================================================================
    // Document Management
    // =====================================================================

    addDocument: oc
      .route({
        method: 'POST',
        path: '/{id}/documents',
        summary: 'Add document to project',
        description: 'Add a document to a project',
      })
      .errors(projectErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          documentId: v.pipe(v.string(), v.uuid()),
          order: v.optional(v.number()),
        }),
      )
      .output(projectDocumentSchema),

    removeDocument: oc
      .route({
        method: 'DELETE',
        path: '/{id}/documents/{documentId}',
        summary: 'Remove document from project',
        description: 'Remove a document from a project',
      })
      .errors(projectErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          documentId: v.pipe(v.string(), v.uuid()),
        }),
      )
      .output(v.object({})),

    reorderDocuments: oc
      .route({
        method: 'PUT',
        path: '/{id}/documents/order',
        summary: 'Reorder project documents',
        description: 'Set the order of documents by providing ordered IDs',
      })
      .errors(projectErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          documentIds: v.array(v.pipe(v.string(), v.uuid())),
        }),
      )
      .output(v.array(projectDocumentSchema)),
  });

export default projectContract;
