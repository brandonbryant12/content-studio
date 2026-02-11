import { Effect, Schema } from 'effect';
import type { JobId, JobStatus, ScriptSegment } from '@repo/db/schema';
import type { GenerateAudioPayload } from '@repo/queue';
import { Queue } from '@repo/queue';
import { PodcastRepo } from '../repos/podcast-repo';
import { saveChanges } from './save-changes';

// =============================================================================
// Types
// =============================================================================

export interface SaveAndQueueAudioInput {
  podcastId: string;
  segments?: ScriptSegment[];
  hostVoice?: string;
  hostVoiceName?: string;
  coHostVoice?: string;
  coHostVoiceName?: string;
}

export interface SaveAndQueueAudioResult {
  jobId: JobId;
  status: JobStatus;
}

/**
 * Error when no changes were provided to save.
 */
export class NoChangesToSaveError extends Schema.TaggedError<NoChangesToSaveError>()(
  'NoChangesToSaveError',
  {
    podcastId: Schema.String,
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'NO_CHANGES' as const;
  static readonly httpMessage = 'No changes to save';
  static readonly logLevel = 'silent' as const;

  static getData(e: NoChangesToSaveError) {
    return { podcastId: e.podcastId };
  }
}

// =============================================================================
// Use Case
// =============================================================================

export const saveAndQueueAudio = (input: SaveAndQueueAudioInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const queue = yield* Queue;

    const podcast = yield* podcastRepo.findById(input.podcastId);

    const result = yield* saveChanges({
      podcastId: input.podcastId,
      segments: input.segments,
      hostVoice: input.hostVoice,
      hostVoiceName: input.hostVoiceName,
      coHostVoice: input.coHostVoice,
      coHostVoiceName: input.coHostVoiceName,
    });

    if (!result.hasChanges) {
      return yield* Effect.fail(
        new NoChangesToSaveError({ podcastId: input.podcastId }),
      );
    }

    const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
    if (existingJob) {
      return { jobId: existingJob.id, status: existingJob.status };
    }

    const payload: GenerateAudioPayload = {
      podcastId: podcast.id,
      userId: podcast.createdBy,
    };

    const job = yield* queue.enqueue(
      'generate-audio',
      payload,
      podcast.createdBy,
    );

    return { jobId: job.id, status: job.status };
  }).pipe(
    Effect.withSpan('useCase.saveAndQueueAudio', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );
