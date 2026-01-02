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
  type PodcastFull,
  type ListOptions,
} from './repos';

export {
  ScriptVersionRepo,
  ScriptVersionRepoLive,
  type ScriptVersionRepoService,
  type VersionStatus,
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
  getActiveScript,
  editScript,
  saveChanges,
  // Generation
  generateScript,
  generateAudio,
  progressTo,
  // Job orchestration
  startGeneration,
  saveAndQueueAudio,
  getJob,
  // Error classes (not error type unions)
  InvalidAudioGenerationError,
  InvalidProgressionError,
  InvalidSaveError,
  NoChangesToSaveError,
  // Input/Output types - error types inferred by Effect
  type CreatePodcastInput,
  type GetPodcastInput,
  type GetActiveScriptInput,
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
  type StartGenerationInput,
  type StartGenerationResult,
  type SaveAndQueueAudioInput,
  type SaveAndQueueAudioResult,
  type GetJobInput,
  type GetJobResult,
  type ScriptSegment,
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
  PodcastScript,
  PodcastFormat,
  CreatePodcast,
  UpdatePodcast,
  Document,
} from '@repo/db/schema';
