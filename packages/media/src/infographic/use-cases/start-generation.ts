import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { Queue, type GenerateInfographicPayload } from '@repo/queue';
import type { JobId, JobStatus } from '@repo/db/schema';
import { InfographicRepo } from '../repos/infographic-repo';
import { SelectionRepo } from '../repos/selection-repo';
import {
  InfographicNotFound,
  NotInfographicOwner,
  InvalidInfographicGeneration,
} from '../../errors';

// =============================================================================
// Types
// =============================================================================

export interface StartGenerationInput {
  infographicId: string;
  feedbackInstructions?: string;
}

export interface StartGenerationResult {
  jobId: JobId;
  status: JobStatus;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Start infographic generation by enqueuing a generation job.
 *
 * This use case:
 * 1. Verifies infographic exists and user has access
 * 2. Validates infographic has selections
 * 3. Checks for existing pending/processing job (idempotency)
 * 4. Updates feedback instructions if provided (for regeneration)
 * 5. Clears existing image and resets status
 * 6. Enqueues the generation job
 *
 * @example
 * const result = yield* startGeneration({
 *   infographicId: 'inf_123',
 *   feedbackInstructions: 'Make the colors more vibrant',
 * });
 * // result.jobId, result.status
 */
export const startGeneration = (input: StartGenerationInput) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const infographicRepo = yield* InfographicRepo;
    const selectionRepo = yield* SelectionRepo;
    const queue = yield* Queue;

    // 1. Verify infographic exists
    const infographic = yield* infographicRepo
      .findById(input.infographicId)
      .pipe(
        Effect.catchTag('InfographicNotFound', () =>
          Effect.fail(new InfographicNotFound({ id: input.infographicId })),
        ),
      );

    // 2. Verify ownership
    if (infographic.createdBy !== user.id) {
      return yield* Effect.fail(
        new NotInfographicOwner({
          infographicId: input.infographicId,
          userId: user.id,
        }),
      );
    }

    // 3. Validate has selections
    const selectionCount = yield* selectionRepo.count(input.infographicId);

    if (selectionCount === 0) {
      return yield* Effect.fail(
        new InvalidInfographicGeneration({
          infographicId: input.infographicId,
          reason: 'No content selected. Add text selections before generating.',
        }),
      );
    }

    // 4. Check for existing pending/processing job (idempotency)
    const existingJob = yield* queue.findPendingJobForInfographic(
      infographic.id,
    );

    if (existingJob) {
      return {
        jobId: existingJob.id,
        status: existingJob.status,
      };
    }

    // 5. Update feedback instructions if provided (for regeneration)
    if (input.feedbackInstructions !== undefined) {
      yield* infographicRepo.update(infographic.id, {
        feedbackInstructions: input.feedbackInstructions,
      });
    }

    // 6. Clear existing image and reset to drafting
    yield* infographicRepo.clearImage(infographic.id);
    yield* infographicRepo.updateStatus(infographic.id, 'drafting');

    // 7. Enqueue job
    const payload: GenerateInfographicPayload = {
      infographicId: infographic.id,
      userId: user.id,
    };

    const job = yield* queue.enqueue('generate-infographic', payload, user.id);

    return {
      jobId: job.id,
      status: job.status,
    };
  }).pipe(
    Effect.withSpan('useCase.startInfographicGeneration', {
      attributes: { 'infographic.id': input.infographicId },
    }),
  );
