// Re-export media errors from centralized error catalog
export {
  // Document errors
  DocumentNotFound,
  DocumentError,
  DocumentTooLargeError,
  UnsupportedDocumentFormat,
  DocumentParseError,
  // Podcast errors
  PodcastNotFound,
  PodcastError,
  ScriptNotFound,
} from '@repo/effect/errors';

// Document module
export {
  Documents,
  DocumentsLive,
  type DocumentService,
  type UploadDocumentInput,
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
  type InsertDocumentInput,
  type UpdateDocumentInput,
  type Document,
  type CreateDocument,
  type UpdateDocument,
  type DocumentSource,
} from './document';

// Podcast module
export {
  Podcasts,
  PodcastsLive,
  PodcastGenerator,
  PodcastGeneratorLive,
  type PodcastService,
  type PodcastGeneratorService,
  type PodcastWithDocuments,
  type PodcastWithScript,
  type PodcastFull,
  type GenerationError,
  type Podcast,
  type PodcastScript,
  type PodcastFormat,
  type PodcastStatus,
  type CreatePodcast,
  type UpdatePodcast,
  type UpdateScript,
  type ScriptSegment,
} from './podcast';
