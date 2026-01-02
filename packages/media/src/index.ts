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
import { Documents, DocumentsLive } from './document';
import { PodcastRepo, PodcastRepoLive, ScriptVersionRepo, ScriptVersionRepoLive } from './podcast';

// =============================================================================
// Combined Media Layer
// =============================================================================

/**
 * All media services bundled together.
 * Use this type in SharedServices instead of listing each service individually.
 */
export type Media = Documents | PodcastRepo | ScriptVersionRepo;

/**
 * Combined layer for all media services.
 *
 * Provides:
 * - Documents: Document CRUD operations
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
