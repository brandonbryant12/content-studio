import { Effect, Schema } from 'effect';
import type { JobId, JobStatus, ScriptSegment } from '@repo/db/schema';
import type { GenerateAudioPayload } from '@repo/queue';
import { Queue } from '@repo/queue';
import { PodcastRepo } from '../repos/podcast-repo';
import { saveChanges, InvalidSaveError } from './save-changes';

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

/**
 * Save changes to a podcast and queue audio regeneration.
 *
 * This use case combines saveChanges with job queueing:
 * 1. Calls saveChanges to update script/voice settings
 * 2. Checks for existing pending/processing job (idempotency)
 * 3. Enqueues audio regeneration job if changes were made
 *
 * @example
 * const result = yield* saveAndQueueAudio({
 *   podcastId: 'podcast-123',
 *   segments: [{ speaker: 'Host', line: 'Updated line', index: 0 }],
 * });
 * // result.jobId, result.status
 */
export const saveAndQueueAudio = (input: SaveAndQueueAudioInput) =>
  Effect.gen(function* () {
    const podcastRepo = yield* PodcastRepo;
    const queue = yield* Queue;

    // 1. Verify podcast exists (for authorization)
    const podcast = yield* podcastRepo.findById(input.podcastId);

    // 2. Call saveChanges use case
    const result = yield* saveChanges({
      podcastId: input.podcastId,
      segments: input.segments,
      hostVoice: input.hostVoice,
      hostVoiceName: input.hostVoiceName,
      coHostVoice: input.coHostVoice,
      coHostVoiceName: input.coHostVoiceName,
    });

    if (!result.hasChanges) {
      return yield* Effect.fail(new NoChangesToSaveError({ podcastId: input.podcastId }));
    }

    // 3. Check for existing pending/processing job (idempotency)
    const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
    if (existingJob) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
      };
    }

    // 4. Enqueue audio regeneration job (now uses podcastId directly)
    const payload: GenerateAudioPayload = {
      podcastId: podcast.id,
      userId: podcast.createdBy,
    };

    const job = yield* queue.enqueue(
      'generate-audio',
      payload,
      podcast.createdBy,
    );

    return {
      jobId: job.id,
      status: job.status,
    };
  }).pipe(
    Effect.withSpan('useCase.saveAndQueueAudio', {
      attributes: { 'podcast.id': input.podcastId },
    }),
  );

// Re-export InvalidSaveError for convenience
export { InvalidSaveError };
