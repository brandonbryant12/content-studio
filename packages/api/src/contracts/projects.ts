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
  MEDIA_NOT_FOUND: {
    status: 404,
    data: v.object({
      mediaType: v.string(),
      mediaId: v.string(),
    }),
  },
} as const;

// Enums
const mediaTypeSchema = v.picklist(['document', 'podcast']);

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

// Polymorphic media schemas
const baseMediaItemSchema = v.object({
  id: v.string(),
  projectId: v.string(),
  mediaId: v.string(),
  order: v.number(),
  createdAt: v.string(),
});

const documentMediaItemSchema = v.object({
  ...baseMediaItemSchema.entries,
  mediaType: v.literal('document'),
  media: v.object({
    id: v.string(),
    title: v.string(),
    contentKey: v.string(),
    mimeType: v.string(),
    wordCount: v.number(),
    source: v.string(),
    originalFileName: v.nullable(v.string()),
    originalFileSize: v.nullable(v.number()),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),
});

const podcastMediaItemSchema = v.object({
  ...baseMediaItemSchema.entries,
  mediaType: v.literal('podcast'),
  media: v.object({
    id: v.string(),
    title: v.string(),
    description: v.nullable(v.string()),
    format: v.string(),
    status: v.string(),
    audioUrl: v.nullable(v.string()),
    duration: v.nullable(v.number()),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }),
});

const projectMediaItemSchema = v.union([
  documentMediaItemSchema,
  podcastMediaItemSchema,
]);

// Legacy full schema (with documents array)
const projectFullSchema = v.object({
  ...projectOutputSchema.entries,
  documents: v.array(projectDocumentSchema),
});

// New full schema (with polymorphic media)
const projectWithMediaSchema = v.object({
  ...projectOutputSchema.entries,
  media: v.array(projectMediaItemSchema),
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
          // Query params come as strings, so coerce to number
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
        description: 'Retrieve a project with its documents (legacy)',
      })
      .errors(projectErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(projectFullSchema),

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
      .output(projectFullSchema),

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
    // Polymorphic Media Management
    // =====================================================================

    getWithMedia: oc
      .route({
        method: 'GET',
        path: '/{id}/full',
        summary: 'Get project with media',
        description:
          'Retrieve a project with all resolved media items (polymorphic)',
      })
      .errors(projectErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(projectWithMediaSchema),

    addMedia: oc
      .route({
        method: 'POST',
        path: '/{id}/media',
        summary: 'Add media to project',
        description:
          'Add a document, podcast, or other media item to a project',
      })
      .errors(projectErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          mediaType: mediaTypeSchema,
          mediaId: v.pipe(v.string(), v.uuid()),
          order: v.optional(v.number()),
        }),
      )
      .output(projectMediaItemSchema),

    removeMedia: oc
      .route({
        method: 'DELETE',
        path: '/{id}/media/{mediaId}',
        summary: 'Remove media from project',
        description: 'Remove a media item from a project',
      })
      .errors(projectErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          mediaId: v.pipe(v.string(), v.uuid()),
        }),
      )
      .output(v.object({})),

    reorderMedia: oc
      .route({
        method: 'PUT',
        path: '/{id}/media/order',
        summary: 'Reorder project media',
        description:
          'Set the order of media items by providing ordered media IDs',
      })
      .errors(projectErrors)
      .input(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          mediaIds: v.array(v.pipe(v.string(), v.uuid())),
        }),
      )
      .output(v.array(projectMediaItemSchema)),
  });

export default projectContract;
