// Errors
export * from './errors';

// Repository (Context.Tag pattern)
export {
  DocumentRepo,
  DocumentRepoLive,
  type DocumentRepoService,
  type ListOptions,
  type InsertDocumentInput,
  type UpdateDocumentInput,
} from './repos';

// Use cases
export * from './use-cases';

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

// Re-export DB types for convenience
export type {
  Document,
  CreateDocument,
  UpdateDocument,
  DocumentSource,
} from '@repo/db/schema';
