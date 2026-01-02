import { Layer } from 'effect';
import type { Db } from '@repo/db/effect';
import type { Storage } from '@repo/storage';

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
} from '@repo/db/errors';

// Document module - Repository
export {
  DocumentRepo,
  DocumentRepoLive,
  type DocumentRepoService,
  type ListOptions as DocumentListOptions,
} from './document';

// Document module - Service (legacy - will be deprecated)
export {
  Documents,
  DocumentsLive,
  type DocumentService,
  type UploadDocumentInput as ServiceUploadDocumentInput,
} from './document';

// Document module - Use cases
export {
  listDocuments,
  getDocument,
  getDocumentContent,
  createDocument,
  uploadDocument,
  updateDocument,
  deleteDocument,
  type ListDocumentsInput,
  type ListDocumentsResult,
  type ListDocumentsError,
  type GetDocumentInput,
  type GetDocumentError,
  type GetDocumentContentInput,
  type GetDocumentContentResult,
  type GetDocumentContentError,
  type CreateDocumentInput,
  type CreateDocumentError,
  type UploadDocumentInput,
  type UploadDocumentError,
  type UpdateDocumentInput,
  type UpdateDocumentError,
  type DeleteDocumentInput,
  type DeleteDocumentError,
} from './document';

// Document module - Parsers and types
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
  type InsertDocumentInput,
  type UpdateDocumentInput as RepoUpdateDocumentInput,
  type Document,
  type CreateDocument,
  type UpdateDocument,
  type DocumentSource,
} from './document';

// Podcast module - Repos
export {
  PodcastRepo,
  PodcastRepoLive,
  ScriptVersionRepo,
  ScriptVersionRepoLive,
  type PodcastRepoService,
  type ScriptVersionRepoService,
  type PodcastWithDocuments,
  type PodcastFull,
  type ListOptions,
  type VersionStatus,
} from './podcast';

// Import for combined layer
import { Documents, DocumentsLive, DocumentRepo, DocumentRepoLive } from './document';
import { PodcastRepo, PodcastRepoLive, ScriptVersionRepo, ScriptVersionRepoLive } from './podcast';

// =============================================================================
// Combined Media Layer
// =============================================================================

/**
 * All media services bundled together.
 * Use this type in SharedServices instead of listing each service individually.
 */
export type Media = Documents | DocumentRepo | PodcastRepo | ScriptVersionRepo;

/**
 * Combined layer for all media services.
 *
 * Provides:
 * - Documents: Document CRUD operations (legacy service)
 * - DocumentRepo: Document repository operations (new pattern)
 * - PodcastRepo: Podcast repository operations
 * - ScriptVersionRepo: Script version repository operations
 *
 * Requires:
 * - Db: Database connection
 * - Storage: File storage backend
 *
 * @example
 * ```typescript
 * // In runtime.ts
 * const mediaLayer = MediaLive.pipe(
 *   Layer.provide(Layer.mergeAll(dbLayer, storageLayer)),
 * );
 * ```
 */
export const MediaLive: Layer.Layer<Media, never, Db | Storage> = Layer.mergeAll(
  DocumentsLive,
  DocumentRepoLive,
  PodcastRepoLive,
  ScriptVersionRepoLive,
);

// Podcast module - Use Cases
export {
  createPodcast,
  getPodcast,
  updatePodcast,
  deletePodcast,
  listPodcasts,
  editScript,
  saveChanges,
  generateScript,
  generateAudio,
  progressTo,
  InvalidAudioGenerationError,
  InvalidProgressionError,
  InvalidSaveError,
  type CreatePodcastInput,
  type GetPodcastInput,
  type UpdatePodcastInput,
  type DeletePodcastInput,
  type ListPodcastsInput,
  type ListPodcastsResult,
  type EditScriptInput,
  type EditScriptResult,
  type SaveChangesInput,
  type SaveChangesResult,
  type GenerateScriptInput,
  type GenerateScriptResult,
  type GenerateAudioInput,
  type GenerateAudioResult,
  type ProgressToInput,
  type ProgressToResult,
  type ScriptSegment,
} from './podcast';

// Podcast module - Types
export {
  type Podcast,
  type PodcastScript,
  type PodcastFormat,
  type CreatePodcast,
  type UpdatePodcast,
} from './podcast';
