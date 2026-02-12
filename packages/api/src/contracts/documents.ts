import { oc } from '@orpc/contract';
import {
  CreateDocumentSchema,
  UpdateDocumentFields,
  DocumentOutputSchema,
  DocumentIdSchema,
} from '@repo/db/schema';
import { Schema } from 'effect';
import { std, PaginationFields } from './shared';

const documentErrors = {
  DOCUMENT_NOT_FOUND: {
    status: 404,
    data: std(
      Schema.Struct({
        documentId: Schema.String,
      }),
    ),
  },
  DOCUMENT_TOO_LARGE: {
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
  DOCUMENT_PARSE_ERROR: {
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
  DOCUMENT_ALREADY_PROCESSING: {
    status: 409,
    data: std(Schema.Struct({ documentId: Schema.String })),
  },
} as const;

const UploadDocumentSchema = Schema.Struct({
  fileName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  mimeType: Schema.String,
  data: Schema.String,
  title: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  ),
  metadata: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  ),
});

const documentContract = oc
  .prefix('/documents')
  .tag('document')
  .router({
    // List all documents for current user
    list: oc
      .route({
        method: 'GET',
        path: '/',
        summary: 'List documents',
        description: 'Retrieve all documents for the current user',
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
      .output(std(Schema.Array(DocumentOutputSchema))),

    // Get a single document by ID
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get document',
        description: 'Retrieve a document by ID',
      })
      .errors(documentErrors)
      .input(std(Schema.Struct({ id: DocumentIdSchema })))
      .output(std(DocumentOutputSchema)),

    // Get document content
    getContent: oc
      .route({
        method: 'GET',
        path: '/{id}/content',
        summary: 'Get document content',
        description: 'Retrieve the parsed text content of a document',
      })
      .errors(documentErrors)
      .input(std(Schema.Struct({ id: DocumentIdSchema })))
      .output(std(Schema.Struct({ content: Schema.String }))),

    // Create a document from text content
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create document',
        description: 'Create a new document from text content',
      })
      .errors(documentErrors)
      .input(std(CreateDocumentSchema))
      .output(std(DocumentOutputSchema)),

    // Upload a document file
    upload: oc
      .route({
        method: 'POST',
        path: '/upload',
        summary: 'Upload document',
        description: 'Upload a document file (TXT, PDF, DOCX, PPTX). Max 10MB.',
      })
      .errors(documentErrors)
      .input(std(UploadDocumentSchema))
      .output(std(DocumentOutputSchema)),

    // Update a document
    update: oc
      .route({
        method: 'PATCH',
        path: '/{id}',
        summary: 'Update document',
        description: 'Update document metadata or content',
      })
      .errors(documentErrors)
      .input(
        std(
          Schema.Struct({
            id: DocumentIdSchema,
            ...UpdateDocumentFields,
          }),
        ),
      )
      .output(std(DocumentOutputSchema)),

    // Delete a document
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete document',
        description: 'Permanently delete a document',
      })
      .errors(documentErrors)
      .input(std(Schema.Struct({ id: DocumentIdSchema })))
      .output(std(Schema.Struct({}))),

    // Create from URL
    fromUrl: oc
      .route({
        method: 'POST',
        path: '/from-url',
        summary: 'Create from URL',
        description: 'Create a document by scraping a URL',
      })
      .errors({ ...documentErrors, ...urlErrors })
      .input(
        std(
          Schema.Struct({
            url: Schema.String.pipe(Schema.minLength(1)),
            title: Schema.optional(
              Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
            ),
            metadata: Schema.optional(
              Schema.Record({ key: Schema.String, value: Schema.Unknown }),
            ),
          }),
        ),
      )
      .output(std(DocumentOutputSchema)),

    // Create from research
    fromResearch: oc
      .route({
        method: 'POST',
        path: '/from-research',
        summary: 'Create from research',
        description:
          'Start a deep research operation that produces a knowledge base document',
      })
      .errors({ ...documentErrors, ...urlErrors })
      .input(
        std(
          Schema.Struct({
            query: Schema.String.pipe(Schema.minLength(10)),
            title: Schema.optional(
              Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
            ),
          }),
        ),
      )
      .output(std(DocumentOutputSchema)),

    // Retry failed processing
    retry: oc
      .route({
        method: 'POST',
        path: '/{id}/retry',
        summary: 'Retry processing',
        description: 'Retry processing a failed document',
      })
      .errors({ ...documentErrors, ...urlErrors })
      .input(std(Schema.Struct({ id: DocumentIdSchema })))
      .output(std(DocumentOutputSchema)),
  });

export default documentContract;
