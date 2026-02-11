import { Layer } from 'effect';
import type { Db } from '@repo/db/effect';
import type { Storage } from '@repo/storage';

// Re-export media errors from package errors
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
  // Voiceover errors
  VoiceoverNotFound,
  VoiceoverError,
  NotVoiceoverOwner,
  InvalidVoiceoverAudioGeneration,
  // Project/Media errors
  ProjectNotFound,
  MediaNotFound,
  // Infographic errors
  InfographicNotFound,
  NotInfographicOwner,
  InfographicError,
  // Error union
  type MediaError,
} from './errors';

// Activity module
export {
  ActivityLogNotFound,
  ActivityLogRepo,
  ActivityLogRepoLive,
  logActivity,
  listActivity,
  getActivityStats,
  logEntityActivity,
  syncEntityTitle,
  type ActivityLogRepoService,
  type LogActivityInput,
  type ListActivityInput,
  type ListActivityResult,
  type GetActivityStatsInput,
  type ActivityStats,
} from './activity';

// Document module - Repository
export {
  DocumentRepo,
  DocumentRepoLive,
  type DocumentRepoService,
  type ListOptions as DocumentListOptions,
} from './document';

// Document module - Use cases (error types inferred by Effect)
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
  type GetDocumentInput,
  type GetDocumentContentInput,
  type GetDocumentContentResult,
  type CreateDocumentInput,
  type UploadDocumentInput,
  type UpdateDocumentInput,
  type DeleteDocumentInput,
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
  type PodcastRepoService,
  type PodcastWithDocuments,
  type ListOptions,
  type UpdateScriptOptions,
  type UpdateAudioOptions,
} from './podcast';

// Voiceover module - Repos
export {
  VoiceoverRepo,
  VoiceoverRepoLive,
  type VoiceoverRepoService,
  type VoiceoverListOptions,
  type VoiceoverUpdateAudioOptions,
} from './voiceover';

// Voiceover module - Types
export type {
  Voiceover,
  VoiceoverStatus,
  CreateVoiceover,
  UpdateVoiceover,
  VoiceoverOutput,
  VoiceoverListItemOutput,
} from './voiceover';

// Infographic module - Repos
export {
  InfographicRepo,
  InfographicRepoLive,
  type InfographicRepoService,
  type InfographicListOptions,
} from './infographic';

// Infographic module - Use Cases
export {
  createInfographic,
  getInfographic,
  listInfographics,
  updateInfographic,
  deleteInfographic,
  generateInfographic,
  getInfographicVersions,
  getInfographicJob,
  approveInfographic,
  revokeInfographicApproval,
  type CreateInfographicInput,
  type GetInfographicInput,
  type ListInfographicsInput,
  type UpdateInfographicInput,
  type DeleteInfographicInput,
  type GenerateInfographicInput,
  type GetInfographicVersionsInput,
  type GetInfographicJobInput,
  type ApproveInfographicInput,
  type RevokeInfographicApprovalInput,
} from './infographic';

// Infographic module - Types
export type {
  Infographic,
  InfographicType,
  InfographicStyle,
  InfographicFormat,
  InfographicStatusType,
  InfographicOutput,
  InfographicVersion,
  InfographicVersionOutput,
} from './infographic';

// Import for combined layer
import { DocumentRepo, DocumentRepoLive } from './document';
import { PodcastRepo, PodcastRepoLive } from './podcast';
import { VoiceoverRepo, VoiceoverRepoLive } from './voiceover';
import { InfographicRepo, InfographicRepoLive } from './infographic';
import { ActivityLogRepo, ActivityLogRepoLive } from './activity';

// =============================================================================
// Combined Media Layer
// =============================================================================

/**
 * All media services bundled together.
 * Use this type in SharedServices instead of listing each service individually.
 *
 * IMPORTANT: When adding a new repo, add it here AND to MediaLive below.
 * Otherwise, use cases that depend on the repo will fail at runtime.
 */
export type Media =
  | DocumentRepo
  | PodcastRepo
  | VoiceoverRepo
  | InfographicRepo
  | ActivityLogRepo;

/**
 * Combined layer for all media services.
 *
 * Provides:
 * - DocumentRepo: Document repository operations
 * - PodcastRepo: Podcast repository operations
 * - VoiceoverRepo: Voiceover repository operations
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
export const MediaLive: Layer.Layer<Media, never, Db | Storage> =
  Layer.mergeAll(
    DocumentRepoLive,
    PodcastRepoLive,
    VoiceoverRepoLive,
    InfographicRepoLive,
    ActivityLogRepoLive,
  );

// Podcast module - Use Cases (error types inferred by Effect)
export {
  createPodcast,
  getPodcast,
  updatePodcast,
  deletePodcast,
  listPodcasts,
  saveChanges,
  generateScript,
  generateAudio,
  startGeneration,
  saveAndQueueAudio,
  getJob,
  // Approval
  approvePodcast,
  revokeApproval,
  // Errors
  InvalidAudioGenerationError,
  InvalidSaveError,
  NoChangesToSaveError,
  type CreatePodcastInput,
  type GetPodcastInput,
  type UpdatePodcastInput,
  type DeletePodcastInput,
  type ListPodcastsInput,
  type ListPodcastsResult,
  type SaveChangesInput,
  type SaveChangesResult,
  type GenerateScriptInput,
  type GenerateScriptResult,
  type GenerateAudioInput,
  type GenerateAudioResult,
  type StartGenerationInput,
  type StartGenerationResult,
  type SaveAndQueueAudioInput,
  type SaveAndQueueAudioResult,
  type GetJobInput,
  type GetJobResult,
  type ApprovePodcastInput,
  type RevokeApprovalInput,
} from './podcast';

// Podcast module - Types
export {
  type Podcast,
  type PodcastFormat,
  type CreatePodcast,
  type UpdatePodcast,
  type VersionStatus,
  type ScriptSegment,
} from './podcast';

// Voiceover module - Use Cases
export {
  createVoiceover,
  getVoiceover,
  listVoiceovers,
  updateVoiceover,
  deleteVoiceover,
  generateVoiceoverAudio,
  startVoiceoverGeneration,
  getVoiceoverJob,
  // Approval
  approveVoiceover,
  revokeVoiceoverApproval,
  // Types
  type CreateVoiceoverInput,
  type GetVoiceoverInput,
  type ListVoiceoversInput,
  type ListVoiceoversResult,
  type UpdateVoiceoverInput,
  type DeleteVoiceoverInput,
  type GenerateVoiceoverAudioInput,
  type GenerateVoiceoverAudioResult,
  type StartVoiceoverGenerationInput,
  type StartVoiceoverGenerationResult,
  type GetVoiceoverJobInput,
  type GetVoiceoverJobResult,
  type ApproveVoiceoverInput,
  type RevokeVoiceoverApprovalInput,
} from './voiceover';
