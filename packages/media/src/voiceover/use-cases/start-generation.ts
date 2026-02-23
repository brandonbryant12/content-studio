import { getCurrentUser } from '@repo/auth/policy';
import { Queue } from '@repo/queue';
import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { GenerateVoiceoverPayload } from '@repo/queue';
import { InvalidVoiceoverAudioGeneration } from '../../errors';
import {
  annotateUseCaseSpan,
  enqueueJob,
  withTransactionalStateAndEnqueue,
  withUseCaseSpan,
} from '../../shared';
import { VoiceoverRepo } from '../repos/voiceover-repo';

// =============================================================================
// Types
// =============================================================================

export interface StartVoiceoverGenerationInput {
  voiceoverId: string;
}

export interface StartVoiceoverGenerationResult {
  jobId: JobId;
  status: JobStatus;
}

// =============================================================================
// Use Case
// =============================================================================

export const startVoiceoverGeneration = (
  input: StartVoiceoverGenerationInput,
) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const voiceoverRepo = yield* VoiceoverRepo;
    const queue = yield* Queue;

    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.voiceoverId,
      attributes: { 'voiceover.id': input.voiceoverId },
    });
    const voiceover = yield* voiceoverRepo.findByIdForUser(
      input.voiceoverId,
      user.id,
    );

    const text = voiceover.text.trim();
    if (!text) {
      return yield* Effect.fail(
        new InvalidVoiceoverAudioGeneration({
          voiceoverId: input.voiceoverId,
          reason: 'Voiceover has no text to generate audio from.',
        }),
      );
    }

    const existingJob = yield* queue.findPendingJobForVoiceover(voiceover.id);
    if (existingJob) {
      return { jobId: existingJob.id, status: existingJob.status };
    }

    const previousStatus = voiceover.status;

    const payload: GenerateVoiceoverPayload = {
      voiceoverId: voiceover.id,
      userId: voiceover.createdBy,
    };

    const job = yield* withTransactionalStateAndEnqueue(
      Effect.gen(function* () {
        yield* voiceoverRepo.updateStatus(voiceover.id, 'generating_audio');
        yield* voiceoverRepo.clearApproval(voiceover.id);
        return yield* enqueueJob({
          type: 'generate-voiceover',
          payload,
          userId: voiceover.createdBy,
        });
      }),
      () => voiceoverRepo.updateStatus(voiceover.id, previousStatus),
    );

    return { jobId: job.id, status: job.status };
  }).pipe(withUseCaseSpan('useCase.startVoiceoverGeneration'));
