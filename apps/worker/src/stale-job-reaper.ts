import {
  DocumentStatus,
  VersionStatus,
  VoiceoverStatus,
  InfographicStatus,
} from '@repo/db/schema';
import {
  DocumentRepo,
  PodcastRepo,
  VoiceoverRepo,
  InfographicRepo,
} from '@repo/media';
import { Queue, formatError, type Job } from '@repo/queue';
import { Effect } from 'effect';
import { STALE_JOB_MAX_AGE_MS } from './constants';
import { emitEntityChange, type PublishEvent } from './events';

const TIMEOUT_MESSAGE = 'Job timed out: worker did not complete in time';

const updateEntityForJob = (job: Job, publishEvent: PublishEvent) =>
  Effect.gen(function* () {
    const payload = job.payload as Record<string, string>;
    const userId = payload.userId;
    if (!userId) return;

    if (payload.documentId) {
      const repo = yield* DocumentRepo;
      yield* repo.updateStatus(
        payload.documentId,
        DocumentStatus.FAILED,
        TIMEOUT_MESSAGE,
      );
      emitEntityChange(publishEvent, userId, 'document', payload.documentId);
    } else if (payload.podcastId) {
      const repo = yield* PodcastRepo;
      yield* repo.updateStatus(
        payload.podcastId,
        VersionStatus.FAILED,
        TIMEOUT_MESSAGE,
      );
      emitEntityChange(publishEvent, userId, 'podcast', payload.podcastId);
    } else if (payload.voiceoverId) {
      const repo = yield* VoiceoverRepo;
      yield* repo.updateStatus(
        payload.voiceoverId,
        VoiceoverStatus.FAILED,
        TIMEOUT_MESSAGE,
      );
      emitEntityChange(publishEvent, userId, 'voiceover', payload.voiceoverId);
    } else if (payload.infographicId) {
      const repo = yield* InfographicRepo;
      yield* repo.update(payload.infographicId, {
        status: InfographicStatus.FAILED,
        errorMessage: TIMEOUT_MESSAGE,
      });
      emitEntityChange(
        publishEvent,
        userId,
        'infographic',
        payload.infographicId,
      );
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
