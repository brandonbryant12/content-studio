import { Context } from 'effect';
import type { DatabaseError } from '@repo/effect/db';
import type { PodcastFull } from './service';
import type {
  PodcastNotFound,
  ScriptNotFound,
  ForbiddenError,
  PolicyError,
  DocumentNotFound,
  DocumentParseError,
  TTSError,
  TTSQuotaExceededError,
  StorageError,
  StorageUploadError,
  StorageNotFoundError,
  LLMError,
  LLMRateLimitError,
} from '@repo/effect/errors';
import type { Effect } from 'effect';

/**
 * Error types that can occur during podcast generation.
 */
export type GenerationError =
  | PodcastNotFound
  | ScriptNotFound
  | DocumentNotFound
  | DocumentParseError
  | LLMError
  | LLMRateLimitError
  | TTSError
  | TTSQuotaExceededError
  | StorageError
  | StorageUploadError
  | StorageNotFoundError
  | DatabaseError
  | PolicyError
  | ForbiddenError;

/**
 * Podcast generator service interface.
 *
 * Handles podcast generation (script + audio) as a separate service from CRUD operations.
 * This allows for type-safe dependency management - the generator explicitly requires
 * LLM, TTS, Storage, and Documents services at the layer level.
 */
export interface PodcastGeneratorService {
  /**
   * Generate a complete podcast: script + audio in one operation.
   *
   * 1. Fetches document content
   * 2. Generates script using LLM (with metadata: title, description, tags)
   * 3. Synthesizes audio using TTS
   * 4. Uploads audio to storage
   * 5. Updates podcast with all generated content
   *
   * Returns the full podcast with script and audio.
   *
   * Note: Dependencies (LLM, TTS, Storage, Documents) are captured at layer construction
   * via Layer.effect, so this method returns Effect<..., ..., never> - no additional
   * context required at call time.
   */
  readonly generate: (
    podcastId: string,
    options?: { promptInstructions?: string },
  ) => Effect.Effect<PodcastFull, GenerationError, never>;

  /**
   * Generate only the script (Phase 1).
   *
   * 1. Fetches document content
   * 2. Generates script using LLM (with metadata: title, description, tags)
   * 3. Updates podcast status to script_ready
   *
   * Use this when you want to preview/edit the script before generating audio.
   * After editing, call generateAudio to complete the podcast.
   */
  readonly generateScript: (
    podcastId: string,
    options?: { promptInstructions?: string },
  ) => Effect.Effect<PodcastFull, GenerationError, never>;

  /**
   * Generate audio from an existing script (Phase 2).
   *
   * 1. Loads existing script
   * 2. Synthesizes audio using TTS
   * 3. Uploads audio to storage
   * 4. Updates podcast status to ready
   *
   * Podcast must be in script_ready status. Call this after generateScript
   * and optionally editing the script.
   */
  readonly generateAudio: (
    podcastId: string,
  ) => Effect.Effect<PodcastFull, GenerationError, never>;
}

/**
 * Podcast generator service tag.
 *
 * Use PodcastGeneratorLive to provide this service. The layer requires:
 * - Db: Database connection
 * - CurrentUser: Authenticated user context
 * - Documents: Document content service
 * - LLM: Language model for script generation
 * - TTS: Text-to-speech for audio synthesis
 * - Storage: File storage for audio upload
 */
export class PodcastGenerator extends Context.Tag(
  '@repo/media/PodcastGenerator',
)<PodcastGenerator, PodcastGeneratorService>() { }
