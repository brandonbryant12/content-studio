/**
 * Podcast Use Cases
 *
 * Pure functions that implement business logic for podcast operations.
 * Each use case yields its dependencies from context using Effect.gen.
 */

// =============================================================================
// CRUD Operations
// =============================================================================

export { createPodcast, type CreatePodcastInput, type CreatePodcastError } from './create-podcast';

export { getPodcast, type GetPodcastInput, type GetPodcastError } from './get-podcast';

export {
  updatePodcast,
  type UpdatePodcastInput,
  type UpdatePodcastError,
} from './update-podcast';

export { deletePodcast, type DeletePodcastInput, type DeletePodcastError } from './delete-podcast';

export {
  listPodcasts,
  type ListPodcastsInput,
  type ListPodcastsResult,
  type ListPodcastsError,
} from './list-podcasts';

// =============================================================================
// Script Operations
// =============================================================================

export {
  getActiveScript,
  type GetActiveScriptInput,
  type GetActiveScriptError,
} from './get-active-script';

export {
  editScript,
  type EditScriptInput,
  type EditScriptResult,
  type EditScriptError,
  type ScriptSegment,
} from './edit-script';

export {
  saveChanges,
  type SaveChangesInput,
  type SaveChangesResult,
  type SaveChangesError,
  InvalidSaveError,
} from './save-changes';

// =============================================================================
// Generation Operations
// =============================================================================

export {
  generateScript,
  type GenerateScriptInput,
  type GenerateScriptResult,
  type GenerateScriptError,
} from './generate-script';

export {
  generateAudio,
  type GenerateAudioInput,
  type GenerateAudioResult,
  type GenerateAudioError,
  InvalidAudioGenerationError,
} from './generate-audio';

export {
  progressTo,
  type ProgressToInput,
  type ProgressToResult,
  type ProgressToError,
  InvalidProgressionError,
} from './progress-to';
