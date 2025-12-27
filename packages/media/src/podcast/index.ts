/**
 * Podcast Module
 *
 * This module provides podcast creation, script generation, and audio synthesis.
 *
 * Architecture:
 * - Repos (Context.Tag): Database operations with dependency injection
 * - Use Cases (pure functions): Business logic that yields dependencies
 * - Utils: State machine for version transitions
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
  editScript,
  restoreVersion,
  // Generation
  generateScript,
  generateAudio,
  progressTo,
  // Error types
  InvalidAudioGenerationError,
  InvalidProgressionError,
  // Input/Output types
  type CreatePodcastInput,
  type GetPodcastInput,
  type UpdatePodcastInput,
  type UpdatePodcastResult,
  type DeletePodcastInput,
  type ListPodcastsInput,
  type ListPodcastsResult,
  type EditScriptInput,
  type EditScriptResult,
  type RestoreVersionInput,
  type RestoreVersionResult,
  type GenerateScriptInput,
  type GenerateScriptResult,
  type GenerateAudioInput,
  type GenerateAudioResult,
  type ProgressToInput,
  type ProgressToResult,
  type ScriptSegment,
} from './use-cases';

// =============================================================================
// State Machine Utils
// =============================================================================

export {
  calculateSteps,
  isValidTransition,
  determineNewVersionStatus,
  detectEditType,
  canRegenerate,
  isTerminalState,
  isGenerating,
  getStatusDescription,
  STATUS_ORDER,
  GENERATING_STATES,
  FAILED_STATE,
  type GenerationStep,
  type EditType,
} from './utils';

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
