import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { GenerateVoiceoverPayload } from '@repo/queue';
import { Queue } from '@repo/queue';
import { VoiceoverRepo } from '../repos/voiceover-repo';
import { VoiceoverCollaboratorRepo } from '../repos/voiceover-collaborator-repo';
import {
  InvalidVoiceoverAudioGeneration,
  NotVoiceoverOwner,
} from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface StartVoiceoverGenerationInput {
  voiceoverId: string;
  userId: string;
}

export interface StartVoiceoverGenerationResult {
  jobId: JobId;
  status: JobStatus;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Start voiceover generation by enqueuing a generation job.
 *
 * This use case:
 * 1. Verifies voiceover exists
 * 2. Validates text is not empty
 * 3. Checks for existing pending/processing job (idempotency)
 * 4. Clears all approvals (regeneration requires new approvals)
 * 5. Enqueues the generation job
 *
 * @example
 * const result = yield* startVoiceoverGeneration({
 *   voiceoverId: 'voc_xxx',
 * });
 * // result.jobId, result.status
 */
export const startVoiceoverGeneration = (
  input: StartVoiceoverGenerationInput,
) =>
  Effect.gen(function* () {
    const voiceoverRepo = yield* VoiceoverRepo;
    const collaboratorRepo = yield* VoiceoverCollaboratorRepo;
    const queue = yield* Queue;

    // 1. Verify voiceover exists
    const voiceover = yield* voiceoverRepo.findById(input.voiceoverId);

    // Verify user is the owner
    if (voiceover.createdBy !== input.userId) {
      return yield* Effect.fail(
        new NotVoiceoverOwner({
          voiceoverId: input.voiceoverId,
          userId: input.userId,
        }),
      );
    }

    // 2. Validate text is not empty
    const text = voiceover.text.trim();
    if (!text) {
      return yield* Effect.fail(
        new InvalidVoiceoverAudioGeneration({
          voiceoverId: input.voiceoverId,
          reason: 'Voiceover has no text to generate audio from.',
        }),
      );
    }

    // 3. Check for existing pending/processing job (idempotency)
    const existingJob = yield* queue.findPendingJobForVoiceover(voiceover.id);
    if (existingJob) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
      };
    }

    // 4. Update status to generating_audio and clear approvals
    yield* voiceoverRepo.updateStatus(voiceover.id, 'generating_audio');
    yield* voiceoverRepo.clearApprovals(voiceover.id);
    yield* collaboratorRepo.clearAllApprovals(voiceover.id);

    // 5. Enqueue the generation job
    const payload: GenerateVoiceoverPayload = {
      voiceoverId: voiceover.id,
      userId: voiceover.createdBy,
    };

    const job = yield* queue.enqueue(
      'generate-voiceover',
      payload,
      voiceover.createdBy,
    );

    return {
      jobId: job.id,
      status: job.status,
    };
  }).pipe(
    Effect.withSpan('useCase.startVoiceoverGeneration', {
      attributes: { 'voiceover.id': input.voiceoverId },
    }),
  );
