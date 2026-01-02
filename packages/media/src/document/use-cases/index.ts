/**
 * Document Use Cases
 *
 * Pure functions that implement business logic for document operations.
 * Each use case yields its dependencies from context using Effect.gen.
 * Error types are inferred by Effect - no explicit error type exports.
 */

// =============================================================================
// CRUD Operations
// =============================================================================

export { listDocuments, type ListDocumentsInput, type ListDocumentsResult } from './list-documents';

export { getDocument, type GetDocumentInput } from './get-document';

export {
  getDocumentContent,
  type GetDocumentContentInput,
  type GetDocumentContentResult,
} from './get-document-content';

export { createDocument, type CreateDocumentInput } from './create-document';

export { uploadDocument, type UploadDocumentInput } from './upload-document';

export { updateDocument, type UpdateDocumentInput } from './update-document';

export { deleteDocument, type DeleteDocumentInput } from './delete-document';
