/**
 * Document Use Cases
 *
 * Pure functions that implement business logic for document operations.
 * Each use case yields its dependencies from context using Effect.gen.
 */

// =============================================================================
// CRUD Operations
// =============================================================================

export {
  listDocuments,
  type ListDocumentsInput,
  type ListDocumentsResult,
  type ListDocumentsError,
} from './list-documents';

export {
  getDocument,
  type GetDocumentInput,
  type GetDocumentError,
} from './get-document';

export {
  getDocumentContent,
  type GetDocumentContentInput,
  type GetDocumentContentResult,
  type GetDocumentContentError,
} from './get-document-content';

export {
  createDocument,
  type CreateDocumentInput,
  type CreateDocumentError,
} from './create-document';

export {
  uploadDocument,
  type UploadDocumentInput,
  type UploadDocumentError,
} from './upload-document';

export {
  updateDocument,
  type UpdateDocumentInput,
  type UpdateDocumentError,
} from './update-document';

export {
  deleteDocument,
  type DeleteDocumentInput,
  type DeleteDocumentError,
} from './delete-document';
