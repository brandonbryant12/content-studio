import { getCurrentUser } from '@repo/auth/policy';
import { Queue } from '@repo/queue';
import { Effect } from 'effect';
import { VersionStatus, type JobId, type JobStatus } from '@repo/db/schema';
import type { GeneratePodcastPayload } from '@repo/queue';
import {
  annotateUseCaseSpan,
  enqueueJob,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
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
    const user = yield* getCurrentUser;
    const podcastRepo = yield* PodcastRepo;
    const queue = yield* Queue;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    const podcast = yield* podcastRepo.findByIdForUser(
      input.podcastId,
      user.id,
    );

    const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
    if (existingJob) {
      return { jobId: existingJob.id, status: existingJob.status };
    }

    const previousStatus = podcast.status;

    const payload: GeneratePodcastPayload = {
      podcastId: podcast.id,
      userId: podcast.createdBy,
      promptInstructions: input.promptInstructions,
    };

    const job = yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        yield* podcastRepo.updateStatus(podcast.id, VersionStatus.DRAFTING);
        yield* podcastRepo.clearApproval(podcast.id);
        return yield* enqueueJob({
          type: 'generate-podcast',
          payload,
          userId: podcast.createdBy,
        });
      }),
      () => podcastRepo.updateStatus(podcast.id, previousStatus),
    );

    return { jobId: job.id, status: job.status };
  }).pipe(withUseCaseSpan('useCase.startGeneration'));
