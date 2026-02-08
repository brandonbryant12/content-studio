import { Effect } from 'effect';
import type { JobId, JobStatus } from '@repo/db/schema';
import type { GenerateInfographicPayload } from '@repo/queue';
import { Queue } from '@repo/queue';
import { requireOwnership } from '@repo/auth/policy';
import { InfographicRepo } from '../repos';

// =============================================================================
// Types
// =============================================================================

export interface GenerateInfographicInput {
  id: string;
}

export interface GenerateInfographicResult {
  jobId: JobId;
  status: JobStatus;
}

// =============================================================================
// Use Case
// =============================================================================

export const generateInfographic = (input: GenerateInfographicInput) =>
  Effect.gen(function* () {
    const repo = yield* InfographicRepo;
    const queue = yield* Queue;

    const existing = yield* repo.findById(input.id);
    yield* requireOwnership(existing.createdBy);

    // Update status to generating
    yield* repo.update(input.id, {
      status: 'generating',
      errorMessage: null,
    });

    // Enqueue job
    const payload: GenerateInfographicPayload = {
      infographicId: input.id,
      userId: existing.createdBy,
    };

    const job = yield* queue.enqueue(
      'generate-infographic',
      payload,
      existing.createdBy,
    );

    return {
      jobId: job.id,
      status: job.status,
    };
  }).pipe(
    Effect.withSpan('useCase.generateInfographic', {
      attributes: { 'infographic.id': input.id },
    }),
  );
