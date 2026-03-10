import { oc } from '@orpc/contract';
import {
  CreateSourceSchema,
  UpdateSourceFields,
  SourceOutputSchema,
  SourceListItemOutputSchema,
  SourceIdSchema,
  MetadataSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { std, PaginationFields } from './shared';

const sourceErrors = {
  SOURCE_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        sourceId: Schema.String,
      }),
    ),
  },
  SOURCE_TOO_LARGE: {
    status: 413,
    data: std(
      Schema.Struct({
        fileName: Schema.String,
        fileSize: Schema.Number,
        maxSize: Schema.Number,
      }),
    ),
  },
  UNSUPPORTED_FORMAT: {
    status: 415,
    data: std(
      Schema.Struct({
        fileName: Schema.String,
        mimeType: Schema.String,
        supportedFormats: Schema.Array(Schema.String),
      }),
    ),
  },
  SOURCE_PARSE_ERROR: {
    status: 422,
    data: std(
      Schema.Struct({
        fileName: Schema.String,
      }),
    ),
  },
} as const;

const urlErrors = {
  INVALID_URL: {
    status: 400,
    data: std(Schema.Struct({ url: Schema.String })),
  },
  URL_FETCH_ERROR: {
    status: 422,
    data: std(Schema.Struct({ url: Schema.String })),
  },
  SOURCE_ALREADY_PROCESSING: {
    status: 409,
    data: std(Schema.Struct({ sourceId: Schema.String })),
  },
} as const;

const featureErrors = {
  DEEP_RESEARCH_DISABLED: {
    status: 403,
    data: std(
      Schema.Struct({
        feature: Schema.Literal('deep_research'),
      }),
    ),
  },
} as const;

const MAX_UPLOAD_SOURCE_BYTES = 10 * 1024 * 1024;
// Base64 expands payload size by ~4/3. Keep a small buffer for transport overhead.
export const MAX_UPLOAD_SOURCE_BASE64_CHARS =
  Math.ceil((MAX_UPLOAD_SOURCE_BYTES * 4) / 3) + 2048;

const UploadSourceSchema = Schema.Struct({
  fileName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  mimeType: Schema.String,
  data: Schema.String.pipe(Schema.maxLength(MAX_UPLOAD_SOURCE_BASE64_CHARS)),
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  metadata: Schema.optional(MetadataSchema),
});

const sourceContract = oc
  .prefix('/sources')
  .tag('source')
  .router({
    // List all sources for current user
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List sources',
        description: 'Retrieve all sources for the current user',
      })
      .input(
        std(
          Schema.Struct({
            ...PaginationFields,
            source: Schema.optional(Schema.String),
            status: Schema.optional(Schema.String),
          }),
        ),
      )
      .output(std(Schema.Array(SourceListItemOutputSchema))),

    // Get a single source by ID
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get source',
        description: 'Retrieve a source by ID',
      })
      .errors(sourceErrors)
      .input(std(Schema.Struct({ id: SourceIdSchema })))
      .output(std(SourceOutputSchema)),

    // Get source content
    getContent: oc
      .route({
        method: 'GET',
        path: '/{id}/content',
        summary: 'Get source content',
        description: 'Retrieve the parsed text content of a source',
      })
      .errors(sourceErrors)
      .input(std(Schema.Struct({ id: SourceIdSchema })))
      .output(std(Schema.Struct({ content: Schema.String }))),

    // Create a source from text content
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create source',
        description: 'Create a new source from text content',
      })
      .errors(sourceErrors)
      .input(std(CreateSourceSchema))
      .output(std(SourceOutputSchema)),

    // Upload a source file
    upload: oc
      .route({
        method: 'POST',
        path: '/upload',
        summary: 'Upload source',
        description: 'Upload a source file (TXT, PDF, DOCX, PPTX). Max 10MB.',
      })
      .errors(sourceErrors)
      .input(std(UploadSourceSchema))
      .output(std(SourceOutputSchema)),

    // Update a source
    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update source',
        description: 'Update source metadata or content',
      })
      .errors(sourceErrors)
      .input(
        std(
          Schema.Struct({
            id: SourceIdSchema,
            ...UpdateSourceFields,
          }),
        ),
      )
      .output(std(SourceOutputSchema)),

    // Delete a source
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete source',
        description: 'Permanently delete a source',
      })
      .errors(sourceErrors)
      .input(std(Schema.Struct({ id: SourceIdSchema })))
      .output(std(Schema.Struct({}))),

    // Create from URL
    fromUrl: oc
      .route({
        method: 'POST',
        path: '/from-url',
        summary: 'Create from URL',
        description: 'Create a source by scraping a URL',
      })
      .errors({ ...sourceErrors, ...urlErrors })
      .input(
        std(
          Schema.Struct({
            url: Schema.String.pipe(Schema.minLength(1)),
            title: Schema.optional(
              Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
            ),
            metadata: Schema.optional(MetadataSchema),
          }),
        ),
      )
      .output(std(SourceOutputSchema)),

    // Create from research
    fromResearch: oc
      .route({
        method: 'POST',
        path: '/from-research',
        summary: 'Create from research',
        description:
          'Start a deep research operation that produces a knowledge base source',
      })
      .errors({ ...sourceErrors, ...urlErrors, ...featureErrors })
      .input(
        std(
          Schema.Struct({
            query: Schema.String.pipe(Schema.minLength(10)),
            title: Schema.optional(
              Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
            ),
            autoGeneratePodcast: Schema.optional(Schema.Boolean),
          }),
        ),
      )
      .output(std(SourceOutputSchema)),

    // Retry failed processing
    retry: oc
      .route({
        method: 'POST',
        path: '/{id}/retry',
        summary: 'Retry processing',
        description: 'Retry processing a failed source',
      })
      .errors({ ...sourceErrors, ...urlErrors, ...featureErrors })
      .input(std(Schema.Struct({ id: SourceIdSchema })))
      .output(std(SourceOutputSchema)),
  });

export default sourceContract;
