import { getCurrentUser } from '@repo/auth/policy';
import { Queue } from '@repo/queue';
import { Effect, Schema } from 'effect';
import type {
  JobId,
  JobStatus,
  PersonaId,
  ScriptSegment,
} from '@repo/db/schema';
import type { GenerateAudioPayload } from '@repo/queue';
import {
  annotateUseCaseSpan,
  enqueueJob,
  withCompensatingAction,
  withUseCaseSpan,
} from '../../shared';
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
  hostPersonaId?: PersonaId | null;
  coHostPersonaId?: PersonaId | null;
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
    const user = yield* getCurrentUser;
    const queue = yield* Queue;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.podcastId,
      attributes: { 'podcast.id': input.podcastId },
    });
    const result = yield* saveChanges({
      podcastId: input.podcastId,
      segments: input.segments,
      hostVoice: input.hostVoice,
      hostVoiceName: input.hostVoiceName,
      coHostVoice: input.coHostVoice,
      coHostVoiceName: input.coHostVoiceName,
      hostPersonaId: input.hostPersonaId,
      coHostPersonaId: input.coHostPersonaId,
    });

    if (!result.hasChanges) {
      return yield* Effect.fail(
        new NoChangesToSaveError({ podcastId: input.podcastId }),
      );
    }

    const { podcast } = result;

    const existingJob = yield* queue.findPendingJobForPodcast(podcast.id);
    if (existingJob) {
      return { jobId: existingJob.id, status: existingJob.status };
    }

    const payload: GenerateAudioPayload = {
      podcastId: podcast.id,
      userId: podcast.createdBy,
    };

    const job = yield* withCompensatingAction(
      enqueueJob({
        type: 'generate-audio',
        payload,
        userId: podcast.createdBy,
      }),
      () => Effect.void,
    );

    return { jobId: job.id, status: job.status };
  }).pipe(withUseCaseSpan('useCase.saveAndQueueAudio'));
