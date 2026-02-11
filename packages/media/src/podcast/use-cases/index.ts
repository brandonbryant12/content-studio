/**
 * Podcast Use Cases
 *
 * Pure functions that implement business logic for podcast operations.
 * Each use case yields its dependencies from context using Effect.gen.
 * Error types are inferred by Effect - no explicit error type exports.
 */

// =============================================================================
// CRUD Operations
// =============================================================================

export { createPodcast, type CreatePodcastInput } from './create-podcast';

export { getPodcast, type GetPodcastInput } from './get-podcast';

export { updatePodcast, type UpdatePodcastInput } from './update-podcast';

export { deletePodcast, type DeletePodcastInput } from './delete-podcast';

export {
  listPodcasts,
  type ListPodcastsInput,
  type ListPodcastsResult,
} from './list-podcasts';

// =============================================================================
// Script Operations
// =============================================================================

export {
  saveChanges,
  type SaveChangesInput,
  type SaveChangesResult,
  InvalidSaveError,
} from './save-changes';

// =============================================================================
// Generation Operations
// =============================================================================

export {
  generateScript,
  type GenerateScriptInput,
  type GenerateScriptResult,
} from './generate-script';

export {
  generateAudio,
  type GenerateAudioInput,
  type GenerateAudioResult,
  InvalidAudioGenerationError,
} from './generate-audio';

export {
  startGeneration,
  type StartGenerationInput,
  type StartGenerationResult,
} from './start-generation';

export {
  saveAndQueueAudio,
  type SaveAndQueueAudioInput,
  type SaveAndQueueAudioResult,
  NoChangesToSaveError,
} from './save-and-queue-audio';

export { getJob, type GetJobInput, type GetJobResult } from './get-job';

// =============================================================================
// Approval Operations
// =============================================================================

export { approvePodcast, type ApprovePodcastInput } from './approve-podcast';

export { revokeApproval, type RevokeApprovalInput } from './revoke-approval';
