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
  NotVoiceoverCollaborator,
  VoiceoverCollaboratorAlreadyExists,
  VoiceoverCollaboratorNotFound,
  CannotAddOwnerAsVoiceoverCollaborator,
  InvalidVoiceoverAudioGeneration,
  // Project/Media errors
  ProjectNotFound,
  MediaNotFound,
  // Persona errors
  PersonaNotFound,
  // Audience segment errors
  AudienceSegmentNotFound,
  // Error union
  type MediaError,
} from './errors';

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
  CollaboratorRepo,
  CollaboratorRepoLive,
  type PodcastRepoService,
  type CollaboratorRepoService,
  type PodcastWithDocuments,
  type ListOptions,
  type UpdateScriptOptions,
  type UpdateAudioOptions,
} from './podcast';

// Voiceover module - Repos
export {
  VoiceoverRepo,
  VoiceoverRepoLive,
  VoiceoverCollaboratorRepo,
  VoiceoverCollaboratorRepoLive,
  type VoiceoverRepoService,
  type VoiceoverCollaboratorRepoService,
  type VoiceoverListOptions,
  type VoiceoverUpdateAudioOptions,
  type RepoAddVoiceoverCollaboratorInput,
  type VoiceoverUserLookupInfo,
} from './voiceover';

// Voiceover module - Types
export type {
  Voiceover,
  VoiceoverStatus,
  CreateVoiceover,
  UpdateVoiceover,
  VoiceoverOutput,
  VoiceoverListItemOutput,
  VoiceoverCollaborator,
  VoiceoverCollaboratorOutput,
  VoiceoverCollaboratorWithUser,
  VoiceoverCollaboratorWithUserOutput,
} from './voiceover';

// Persona module - Repos and Use Cases
export {
  PersonaRepo,
  PersonaRepoLive,
  type PersonaRepoService,
  type PersonaListOptions,
  createPersona,
  getPersona,
  listPersonas,
  updatePersona,
  deletePersona,
  type CreatePersonaInput,
  type GetPersonaInput,
  type ListPersonasInput,
  type UpdatePersonaInput,
  type DeletePersonaInput,
} from './persona';

// Audience module - Repos and Use Cases
export {
  AudienceSegmentRepo,
  AudienceSegmentRepoLive,
  type AudienceSegmentRepoService,
  type AudienceSegmentListOptions,
  createAudienceSegment,
  getAudienceSegment,
  listAudienceSegments,
  updateAudienceSegment,
  deleteAudienceSegment,
  type CreateAudienceSegmentInput,
  type GetAudienceSegmentInput,
  type ListAudienceSegmentsInput,
  type UpdateAudienceSegmentInput,
  type DeleteAudienceSegmentInput,
} from './audience';

// Import for combined layer
import { DocumentRepo, DocumentRepoLive } from './document';
import {
  PodcastRepo,
  PodcastRepoLive,
  CollaboratorRepo,
  CollaboratorRepoLive,
} from './podcast';
import {
  VoiceoverRepo,
  VoiceoverRepoLive,
  VoiceoverCollaboratorRepo,
  VoiceoverCollaboratorRepoLive,
} from './voiceover';
import { PersonaRepo, PersonaRepoLive } from './persona';
import { AudienceSegmentRepo, AudienceSegmentRepoLive } from './audience';

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
  | CollaboratorRepo
  | VoiceoverRepo
  | VoiceoverCollaboratorRepo
  | PersonaRepo
  | AudienceSegmentRepo;

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
    CollaboratorRepoLive,
    VoiceoverRepoLive,
    VoiceoverCollaboratorRepoLive,
    PersonaRepoLive,
    AudienceSegmentRepoLive,
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
  // Collaboration
  listCollaborators,
  addCollaborator,
  removeCollaborator,
  approvePodcast,
  revokeApproval,
  claimPendingInvites,
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
  // Collaboration types
  type ListCollaboratorsInput,
  type ListCollaboratorsResult,
  type AddCollaboratorInput,
  type AddCollaboratorResult,
  type RemoveCollaboratorInput,
  type ApprovePodcastInput,
  type ApprovePodcastResult,
  type RevokeApprovalInput,
  type RevokeApprovalResult,
  type ClaimPendingInvitesInput,
  type ClaimPendingInvitesResult,
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
  // Collaboration
  addVoiceoverCollaborator,
  removeVoiceoverCollaborator,
  listVoiceoverCollaborators,
  approveVoiceover,
  revokeVoiceoverApproval,
  claimVoiceoverPendingInvites,
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
  // Collaboration types
  type AddVoiceoverCollaboratorInput,
  type AddVoiceoverCollaboratorResult,
  type RemoveVoiceoverCollaboratorInput,
  type ListVoiceoverCollaboratorsInput,
  type ListVoiceoverCollaboratorsResult,
  type ApproveVoiceoverInput,
  type ApproveVoiceoverResult,
  type RevokeVoiceoverApprovalInput,
  type RevokeVoiceoverApprovalResult,
  type ClaimVoiceoverPendingInvitesInput,
  type ClaimVoiceoverPendingInvitesResult,
} from './voiceover';
