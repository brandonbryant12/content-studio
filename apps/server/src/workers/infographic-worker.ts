import { ssePublisher } from '@repo/api/server';
import { withCurrentUser } from '@repo/auth/policy';
import {
  type GenerateInfographicPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect } from 'effect';
import type { EntityChangeEvent } from '@repo/api/contracts';
import {
  createWorker,
  makeJobUser,
  wrapJobError,
  type BaseWorkerConfig,
  type Worker,
} from './base-worker';
import { handleGenerateInfographic } from './infographic-handlers';

export interface InfographicWorkerConfig extends BaseWorkerConfig {}

const JOB_TYPES: JobType[] = ['generate-infographic'];

/**
 * Create and start the infographic generation worker.
 * Polls the queue for generate-infographic jobs and processes them.
 */
export const createInfographicWorker = (
  config: InfographicWorkerConfig,
): Worker => {
  const emitEntityChange = (userId: string, infographicId: string) => {
    const entityChangeEvent: EntityChangeEvent = {
      type: 'entity_change',
      entityType: 'infographic',
      changeType: 'update',
      entityId: infographicId,
      userId,
      timestamp: new Date().toISOString(),
    };
    ssePublisher.publish(userId, entityChangeEvent);
  };

  const processJob = (job: Job<GenerateInfographicPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(
        `Processing ${job.type} job ${job.id} for infographic ${job.payload.infographicId}`,
      );

      const user = makeJobUser(job.payload.userId);
      yield* withCurrentUser(user)(handleGenerateInfographic(job));

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
      Effect.catchAll((error: unknown) =>
        Effect.fail(wrapJobError(job.id, error)),
      ),
      Effect.annotateLogs('worker', 'InfographicWorker'),
    );

  const onJobComplete = (job: Job<GenerateInfographicPayload>) => {
    const { userId, infographicId } = job.payload;

    ssePublisher.publish(userId, {
      type: 'infographic_job_completion',
      jobId: job.id,
      jobType: 'generate-infographic',
      status: job.status === 'completed' ? 'completed' : 'failed',
      infographicId,
      error: job.error ?? undefined,
    });

    emitEntityChange(userId, infographicId);
  };

  return createWorker({
    name: 'InfographicWorker',
    jobTypes: JOB_TYPES,
    config,
    processJob,
    onJobComplete,
  });
};
