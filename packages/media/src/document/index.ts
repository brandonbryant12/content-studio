// Errors
export {
  DocumentNotFound,
  DocumentError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
  DocumentParseError,
  DocumentContentNotFound,
} from '../errors';

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

// Services
export { calculateContentHash } from './services/content-utils';
export { validateUrl } from './services/url-validator';
export {
  UrlScraper,
  type UrlScraperService,
  type ScrapedContent,
} from './services/url-scraper';
export { UrlScraperLive } from './services/url-scraper-impl';

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
