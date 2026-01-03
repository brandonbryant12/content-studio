import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { GeneratePodcastPayload } from '@repo/queue';
import { Queue } from '@repo/queue';
import { PodcastRepo } from '../repos/podcast-repo';
import { CollaboratorRepo } from '../repos/collaborator-repo';

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
 * 3. Updates podcast status to drafting
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
    const collaboratorRepo = yield* CollaboratorRepo;
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

    // 3. Update podcast status to drafting
    yield* podcastRepo.updateStatus(podcast.id, 'drafting');

    // 4. Clear all approvals since content will change
    yield* podcastRepo.clearApprovals(podcast.id);
    yield* collaboratorRepo.clearAllApprovals(podcast.id);

    // 5. Enqueue the combined generation job
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
