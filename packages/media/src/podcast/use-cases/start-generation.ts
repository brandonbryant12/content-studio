import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { GeneratePodcastPayload } from '@repo/queue';
import { Queue } from '@repo/queue';
import { PodcastRepo } from '../repos/podcast-repo';

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

export const startGeneration = (input: StartGenerationInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const queue = yield* Queue;

    const podcast = yield* podcastRepo.findById(input.podcastId);

    const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
    if (existingJob) {
      return { jobId: existingJob.id, status: existingJob.status };
    }

    yield* podcastRepo.updateStatus(podcast.id, 'drafting');
    yield* podcastRepo.clearApproval(podcast.id);

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

    return { jobId: job.id, status: job.status };
  }).pipe(
    Effect.withSpan('useCase.startGeneration', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
