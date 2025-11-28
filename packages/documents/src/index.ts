// Types and errors
export * from './errors';

// Service interface
export { Documents, type DocumentService, type UploadDocumentInput } from './service';

// Live implementation
export { DocumentsLive } from './live';

// Parsers (for direct use if needed)
export {
  parseUploadedFile,
  parseDocumentContent,
  validateFileSize,
  validateMimeType,
  getMimeType,
  extractTitleFromFileName,
  MAX_FILE_SIZE,
  SUPPORTED_MIME_TYPES,
  EXTENSION_TO_MIME,
  type ParsedDocument,
  type FileUploadInput,
} from './parsers';

// Repository types (for advanced use cases)
export type { InsertDocumentInput, UpdateDocumentInput } from './repository';

// Re-export DB types for convenience
export type { Document, CreateDocument, UpdateDocument, DocumentSource } from '@repo/db/schema';
