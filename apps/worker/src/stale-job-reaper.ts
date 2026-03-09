import { Queue, formatError, type Job } from '@repo/queue';
import { Effect } from 'effect';
import { STALE_JOB_MAX_AGE_MS } from './constants';
import { syncFailedEntityStateForJob } from './entity-failure';
import { emitEntityChange, type PublishEvent } from './events';

const TIMEOUT_MESSAGE = 'Job timed out: worker did not complete in time';

const getStringField = (
  payload: unknown,
  key: 'userId' | 'sourceId' | 'podcastId' | 'voiceoverId' | 'infographicId',
): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
};

const updateEntityForJob = (job: Job, publishEvent: PublishEvent) =>
  Effect.gen(function* () {
    const userId = getStringField(job.payload, 'userId');
    if (!userId) return;

    yield* syncFailedEntityStateForJob(job, TIMEOUT_MESSAGE);

    const sourceId = getStringField(job.payload, 'sourceId');
    if (sourceId) {
      emitEntityChange(publishEvent, userId, 'source', sourceId);
      return;
    }

    const podcastId = getStringField(job.payload, 'podcastId');
    if (podcastId) {
      emitEntityChange(publishEvent, userId, 'podcast', podcastId);
      return;
    }

    const voiceoverId = getStringField(job.payload, 'voiceoverId');
    if (voiceoverId) {
      emitEntityChange(publishEvent, userId, 'voiceover', voiceoverId);
      return;
    }

    const infographicId = getStringField(job.payload, 'infographicId');
    if (infographicId) {
      emitEntityChange(publishEvent, userId, 'infographic', infographicId);
    }
  }).pipe(Effect.catchAll(() => Effect.void));

export const reapStaleJobs = (
  publishEvent: PublishEvent,
  maxAgeMs: number = STALE_JOB_MAX_AGE_MS,
) =>
  Effect.gen(function* () {
    const queue = yield* Queue;
    const staleJobs = yield* queue.failStaleJobs(maxAgeMs);

    if (staleJobs.length === 0) return;

    for (const staleJob of staleJobs) {
      yield* updateEntityForJob(staleJob, publishEvent);
    }

    const summary = staleJobs.map((j) => `${j.id} (${j.type})`).join(', ');

    yield* Effect.logInfo(`Reaped ${staleJobs.length} stale jobs: ${summary}`);
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logError(`Stale job reaper error: ${formatError(error)}`),
    ),
    Effect.annotateLogs('worker', 'StaleJobReaper'),
  );
