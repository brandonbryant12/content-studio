/**
 * Podcast Module
 *
 * This module provides podcast creation, script generation, and audio synthesis.
 *
 * Architecture:
 * - Repos (Context.Tag): Database operations with dependency injection
 * - Use Cases (pure functions): Business logic that yields dependencies
 */

// =============================================================================
// Repositories (Context.Tag pattern)
// =============================================================================

export {
  PodcastRepo,
  PodcastRepoLive,
  type PodcastRepoService,
  type PodcastWithDocuments,
  type ListOptions,
  type UpdateScriptOptions,
  type UpdateAudioOptions,
  CollaboratorRepo,
  CollaboratorRepoLive,
  type CollaboratorRepoService,
  type AddCollaboratorInput as AddCollaboratorRepoInput,
} from './repos';

// =============================================================================
// Use Cases (pure functions)
// =============================================================================

export {
  // CRUD
  createPodcast,
  getPodcast,
  updatePodcast,
  deletePodcast,
  listPodcasts,
  // Script operations
  saveChanges,
  // Generation
  generateScript,
  generateAudio,
  // Job orchestration
  startGeneration,
  saveAndQueueAudio,
  getJob,
  // Error classes (not error type unions)
  InvalidAudioGenerationError,
  InvalidSaveError,
  NoChangesToSaveError,
  // Collaboration
  addCollaborator,
  removeCollaborator,
  approvePodcast,
  revokeApproval,
  claimPendingInvites,
  // Input/Output types - error types inferred by Effect
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
  type AddCollaboratorInput,
  type AddCollaboratorResult,
  type RemoveCollaboratorInput,
  type ApprovePodcastInput,
  type ApprovePodcastResult,
  type RevokeApprovalInput,
  type RevokeApprovalResult,
  type ClaimPendingInvitesInput,
  type ClaimPendingInvitesResult,
} from './use-cases';

// =============================================================================
// Prompts
// =============================================================================

export { buildSystemPrompt, buildUserPrompt } from './prompts';

// =============================================================================
// Re-export DB types for convenience
// =============================================================================

export type {
  Podcast,
  PodcastFormat,
  CreatePodcast,
  UpdatePodcast,
  Document,
  VersionStatus,
  ScriptSegment,
} from '@repo/db/schema';
