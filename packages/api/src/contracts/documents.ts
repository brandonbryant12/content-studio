import { oc } from '@orpc/contract';
import { CreateDocumentSchema, UpdateDocumentSchema } from '@repo/db/schema';
import * as v from 'valibot';

const documentErrors = {
  DOCUMENT_NOT_FOUND: {
    status: 404,
    data: v.object({
      documentId: v.string(),
    }),
  },
  DOCUMENT_TOO_LARGE: {
    status: 413,
    data: v.object({
      fileName: v.string(),
      fileSize: v.number(),
      maxSize: v.number(),
    }),
  },
  UNSUPPORTED_FORMAT: {
    status: 415,
    data: v.object({
      fileName: v.string(),
      mimeType: v.string(),
      supportedFormats: v.array(v.string()),
    }),
  },
  DOCUMENT_PARSE_ERROR: {
    status: 422,
    data: v.object({
      fileName: v.string(),
    }),
  },
} as const;

// Output schemas
const documentSourceSchema = v.picklist([
  'manual',
  'upload_txt',
  'upload_pdf',
  'upload_docx',
  'upload_pptx',
]);

const documentOutputSchema = v.object({
  id: v.string(),
  title: v.string(),
  contentKey: v.string(),
  mimeType: v.string(),
  wordCount: v.number(),
  source: documentSourceSchema,
  originalFileName: v.nullable(v.string()),
  originalFileSize: v.nullable(v.number()),
  metadata: v.nullable(v.record(v.string(), v.unknown())),
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
});

// Upload input schema (base64 encoded file)
const uploadDocumentSchema = v.object({
  fileName: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
  mimeType: v.string(),
  data: v.string(), // Base64 encoded file content
  title: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(256))),
  metadata: v.optional(v.record(v.string(), v.unknown())),
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
        v.object({
          limit: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
          offset: v.optional(v.pipe(v.number(), v.minValue(0))),
        }),
      )
      .output(v.array(documentOutputSchema)),

    // Get a single document by ID
    get: oc
      .route({
        method: 'GET',
        path: '/{id}',
        summary: 'Get document',
        description: 'Retrieve a document by ID',
      })
      .errors(documentErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(documentOutputSchema),

    // Get document content
    getContent: oc
      .route({
        method: 'GET',
        path: '/{id}/content',
        summary: 'Get document content',
        description: 'Retrieve the parsed text content of a document',
      })
      .errors(documentErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(v.object({ content: v.string() })),

    // Create a document from text content
    create: oc
      .route({
        method: 'POST',
        path: '/',
        summary: 'Create document',
        description: 'Create a new document from text content',
      })
      .errors(documentErrors)
      .input(CreateDocumentSchema)
      .output(documentOutputSchema),

    // Upload a document file
    upload: oc
      .route({
        method: 'POST',
        path: '/upload',
        summary: 'Upload document',
        description: 'Upload a document file (TXT, PDF, DOCX, PPTX). Max 10MB.',
      })
      .errors(documentErrors)
      .input(uploadDocumentSchema)
      .output(documentOutputSchema),

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
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          ...UpdateDocumentSchema.entries,
        }),
      )
      .output(documentOutputSchema),

    // Delete a document
    delete: oc
      .route({
        method: 'DELETE',
        path: '/{id}',
        summary: 'Delete document',
        description: 'Permanently delete a document',
      })
      .errors(documentErrors)
      .input(v.object({ id: v.pipe(v.string(), v.uuid()) }))
      .output(v.object({})),
  });

export default documentContract;
