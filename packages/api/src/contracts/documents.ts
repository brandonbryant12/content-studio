import { oc } from '@orpc/contract';
import { Schema } from 'effect';
import {
  CreateDocumentSchema,
  UpdateDocumentFields,
  DocumentOutputSchema,
  DocumentIdSchema,
} from '@repo/db/schema';

// Helper to convert Effect Schema to Standard Schema for oRPC
const std = Schema.standardSchemaV1;

// Helper for query params that may come in as strings
const CoerceNumber = Schema.Union(
  Schema.Number,
  Schema.String.pipe(
    Schema.transform(Schema.Number, { decode: Number, encode: String }),
  ),
).pipe(Schema.compose(Schema.Number));

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

// Upload input schema (base64 encoded file)
const UploadDocumentSchema = Schema.Struct({
  fileName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(256)),
  mimeType: Schema.String,
  data: Schema.String, // Base64 encoded file content
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
            limit: Schema.optional(
              CoerceNumber.pipe(
                Schema.greaterThanOrEqualTo(1),
                Schema.lessThanOrEqualTo(100),
              ),
            ),
            offset: Schema.optional(
              CoerceNumber.pipe(Schema.greaterThanOrEqualTo(0)),
            ),
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
  });

export default documentContract;
