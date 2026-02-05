import { ssePublisher } from '@repo/api/server';
import { withCurrentUser } from '@repo/auth/policy';
import {
  type GenerateVoiceoverPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect } from 'effect';
import type {
  EntityChangeEvent,
  VoiceoverJobCompletionEvent,
} from '@repo/api/contracts';
import {
  createWorker,
  makeJobUser,
  wrapJobError,
  type BaseWorkerConfig,
  type Worker,
} from './base-worker';
import { handleGenerateVoiceover } from './voiceover-handlers';

export interface VoiceoverWorkerConfig extends BaseWorkerConfig {}

// Job types this worker handles
const JOB_TYPES: JobType[] = ['generate-voiceover'];

/**
 * Create and start the voiceover generation worker.
 * Polls the queue for generate-voiceover jobs and processes them.
 *
 * Uses a single shared ManagedRuntime created at startup.
 * User context is scoped per job via FiberRef (withCurrentUser).
 */
export const createVoiceoverWorker = (
  config: VoiceoverWorkerConfig,
): Worker => {
  /**
   * Emit SSE event to notify frontend of entity change.
   */
  const emitEntityChange = (userId: string, voiceoverId: string) => {
    const entityChangeEvent: EntityChangeEvent = {
      type: 'entity_change',
      entityType: 'voiceover',
      changeType: 'update',
      entityId: voiceoverId,
      userId,
      timestamp: new Date().toISOString(),
    };
    ssePublisher.publish(userId, entityChangeEvent);
  };

  /**
   * Process a single job.
   * User context is scoped via FiberRef for the duration of the job.
   */
  const processJob = (job: Job<GenerateVoiceoverPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(
        `Processing ${job.type} job ${job.id} for voiceover ${job.payload.voiceoverId}`,
      );

      // Create user context for this job
      const user = makeJobUser(job.payload.userId);

      // Run the handler with user context scoped via FiberRef
      yield* withCurrentUser(user)(handleGenerateVoiceover(job));

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
      // Catch any unexpected errors and wrap as JobProcessingError
      Effect.catchAll((error: unknown) =>
        Effect.fail(wrapJobError(job.id, error)),
      ),
      Effect.annotateLogs('worker', 'VoiceoverWorker'),
    );

  /**
   * Handle job completion - emit SSE events.
   */
  const onJobComplete = (job: Job<GenerateVoiceoverPayload>) => {
    const { userId, voiceoverId } = job.payload;

    // Emit job completion event
    const jobCompletionEvent: VoiceoverJobCompletionEvent = {
      type: 'voiceover_job_completion',
      jobId: job.id,
      jobType: 'generate-voiceover',
      status: job.status === 'completed' ? 'completed' : 'failed',
      voiceoverId,
      error: job.error ?? undefined,
    };
    ssePublisher.publish(userId, jobCompletionEvent);

    // Emit entity change event for the voiceover
    emitEntityChange(userId, voiceoverId);

    console.log(
      `[VoiceoverWorker] Emitted SSE events for job ${job.id} to user ${userId}`,
    );
  };

  return createWorker({
    name: 'VoiceoverWorker',
    jobTypes: JOB_TYPES,
    config,
    processJob,
    onJobComplete,
  });
};
