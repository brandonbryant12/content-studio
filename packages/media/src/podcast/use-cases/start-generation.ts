import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { GeneratePodcastPayload } from '@repo/queue';
import { Queue } from '@repo/queue';
import { PodcastRepo } from '../repos/podcast-repo';
import { ScriptVersionRepo } from '../repos/script-version-repo';

// =============================================================================
// Types
// =============================================================================

export interface StartGenerationInput {
  podcastId: string;
  promptInstructions?: string;
}

export interface StartGenerationResult {
  jobId: JobId;
  status: JobStatus;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Start podcast generation by enqueuing a generation job.
 *
 * This use case:
 * 1. Verifies podcast exists and user has access
 * 2. Checks for existing pending/processing job (idempotency)
 * 3. Updates or creates a drafting version
 * 4. Enqueues the combined generation job
 *
 * @example
 * const result = yield* startGeneration({
 *   podcastId: 'podcast-123',
 *   promptInstructions: 'Make it more casual',
 * });
 * // result.jobId, result.status
 */
export const startGeneration = (input: StartGenerationInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const scriptVersionRepo = yield* ScriptVersionRepo;
    const queue = yield* Queue;

    // 1. Verify podcast exists and user has access
    const podcast = yield* podcastRepo.findById(input.podcastId);

    // 2. Check for existing pending/processing job (idempotency)
    const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
    if (existingJob) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
      };
    }

    // 3. Get active version and update its status, or create a new drafting version
    const activeVersion = yield* scriptVersionRepo.findActiveByPodcastId(
      podcast.id,
    );
    if (activeVersion) {
      yield* scriptVersionRepo.updateStatus(activeVersion.id, 'drafting');
    } else {
      // Create a new drafting version for brand new podcasts
      // This ensures isSetupMode() returns false after generate is called
      yield* scriptVersionRepo.insert({
        podcastId: podcast.id,
        createdBy: podcast.createdBy,
        status: 'drafting',
        segments: null,
      });
    }

    // 4. Enqueue the combined generation job
    const payload: GeneratePodcastPayload = {
      podcastId: podcast.id,
      userId: podcast.createdBy,
      promptInstructions: input.promptInstructions,
    };

    const job = yield* queue.enqueue(
      'generate-podcast',
      payload,
      podcast.createdBy,
    );

    return {
      jobId: job.id,
      status: job.status,
    };
  }).pipe(
    Effect.withSpan('useCase.startGeneration', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
