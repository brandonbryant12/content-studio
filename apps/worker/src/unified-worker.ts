import { withAIUsageScope } from '@repo/ai';
import { withCurrentUser } from '@repo/auth/policy';
import { JobStatus } from '@repo/db/schema';
import {
  formatError,
  type GenerateAudioPayload,
  type GenerateInfographicPayload,
  type GeneratePodcastPayload,
  type GenerateScriptPayload,
  type GenerateVoiceoverPayload,
  type Job,
  type JobType,
  type ProcessResearchPayload,
  type ProcessUrlPayload,
} from '@repo/queue';
import { Effect } from 'effect';
import type {
  SourceJobCompletionEvent,
  InfographicJobCompletionEvent,
  JobCompletionEvent,
  VoiceoverJobCompletionEvent,
} from '@repo/api/contracts';
import {
  createWorker,
  makeJobUser,
  wrapJobError,
  type BaseWorkerConfig,
  type Worker,
} from './base-worker';
import {
  DEFAULT_PER_TYPE_CONCURRENCY,
  STALE_CHECK_INTERVAL_MS,
} from './constants';
import { emitEntityChange, type PublishEvent } from './events';
import {
  createGeneratePodcastHandler,
  handleGenerateAudio,
  handleGenerateScript,
} from './handlers/handlers';
import { handleGenerateInfographic } from './handlers/infographic-handlers';
import { handleProcessResearch } from './handlers/research-handlers';
import { handleProcessUrl } from './handlers/source-handlers';
import { handleGenerateVoiceover } from './handlers/voiceover-handlers';
import { syncFailedEntityStateForJob } from './entity-failure';
import { recoverOrphanedResearch } from './research-recovery';
import { reapStaleJobs } from './stale-job-reaper';

export interface UnifiedWorkerConfig extends BaseWorkerConfig {
  publishEvent?: PublishEvent;
}

type WorkerPayload =
  | GeneratePodcastPayload
  | GenerateScriptPayload
  | GenerateAudioPayload
  | GenerateVoiceoverPayload
  | GenerateInfographicPayload
  | ProcessUrlPayload
  | ProcessResearchPayload;

const JOB_TYPES: JobType[] = [
  'generate-podcast',
  'generate-script',
  'generate-audio',
  'generate-voiceover',
  'generate-infographic',
  'process-url',
  'process-research',
];

const noop = (): void => undefined;

/**
 * Log an error/defect with stack trace, then re-fail as a JobProcessingError.
 */
const logAndReFail = (job: Job, label: string, error: unknown) =>
  Effect.logError(
    `Job ${job.id} (${job.type}) ${label}: ${formatError(error)}`,
  ).pipe(
    Effect.annotateLogs(
      'stack',
      error instanceof Error && error.stack ? error.stack : '',
    ),
    Effect.flatMap(() => Effect.fail(wrapJobError(job.id, error))),
  );

export function createUnifiedWorker(config: UnifiedWorkerConfig): Worker {
  const publishEvent = config.publishEvent ?? noop;
  const handleGeneratePodcast = createGeneratePodcastHandler(publishEvent);
  let lastStaleSweepAt = 0;

  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      const { userId } = job.payload;
      const run = withCurrentUser(makeJobUser(userId));
      const runWithScope = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        effect.pipe(
          withAIUsageScope({
            userId,
            jobId: job.id,
          }),
        );

      yield* Effect.logInfo(`Processing ${job.type} job ${job.id}`);

      switch (job.type) {
        case 'process-url':
          yield* run(
            runWithScope(handleProcessUrl(job as Job<ProcessUrlPayload>)),
          );
          break;
        case 'process-research':
          yield* run(
            runWithScope(
              handleProcessResearch(job as Job<ProcessResearchPayload>),
            ),
          );
          break;
        case 'generate-infographic':
          yield* run(
            runWithScope(
              handleGenerateInfographic(job as Job<GenerateInfographicPayload>),
            ),
          );
          break;
        case 'generate-voiceover':
          yield* run(
            runWithScope(
              handleGenerateVoiceover(job as Job<GenerateVoiceoverPayload>),
            ),
          );
          break;
        case 'generate-podcast':
          yield* run(
            runWithScope(
              handleGeneratePodcast(job as Job<GeneratePodcastPayload>),
            ),
          );
          break;
        case 'generate-script':
          yield* run(
            runWithScope(
              handleGenerateScript(job as Job<GenerateScriptPayload>),
            ),
          );
          break;
        case 'generate-audio':
          yield* run(
            runWithScope(handleGenerateAudio(job as Job<GenerateAudioPayload>)),
          );
          break;
      }

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
      Effect.catchAll((error: unknown) => logAndReFail(job, 'error', error)),
      Effect.catchAllDefect((defect) => logAndReFail(job, 'defect', defect)),
      Effect.annotateLogs('worker', 'UnifiedWorker'),
    );

  const onJobComplete = (job: Job<WorkerPayload>): void => {
    const { userId } = job.payload;
    const status = job.status === JobStatus.COMPLETED ? 'completed' : 'failed';
    const error = job.error ?? undefined;

    if ('sourceId' in job.payload) {
      const { sourceId } = job.payload as
        | ProcessUrlPayload
        | ProcessResearchPayload;
      const event: SourceJobCompletionEvent = {
        type: 'source_job_completion',
        jobId: job.id,
        jobType: job.type as 'process-url' | 'process-research',
        status,
        sourceId,
        error,
      };
      publishEvent(userId, event);
      emitEntityChange(publishEvent, userId, 'source', sourceId);
    } else if ('infographicId' in job.payload) {
      const { infographicId } = job.payload as GenerateInfographicPayload;
      const event: InfographicJobCompletionEvent = {
        type: 'infographic_job_completion',
        jobId: job.id,
        jobType: 'generate-infographic',
        status,
        infographicId,
        error,
      };
      publishEvent(userId, event);
      emitEntityChange(publishEvent, userId, 'infographic', infographicId);
    } else if ('voiceoverId' in job.payload) {
      const { voiceoverId } = job.payload as GenerateVoiceoverPayload;
      const event: VoiceoverJobCompletionEvent = {
        type: 'voiceover_job_completion',
        jobId: job.id,
        jobType: 'generate-voiceover',
        status,
        voiceoverId,
        error,
      };
      publishEvent(userId, event);
      emitEntityChange(publishEvent, userId, 'voiceover', voiceoverId);
    } else if ('podcastId' in job.payload) {
      const { podcastId } = job.payload as GeneratePodcastPayload;
      const event: JobCompletionEvent = {
        type: 'job_completion',
        jobId: job.id,
        jobType: job.type as
          | 'generate-podcast'
          | 'generate-script'
          | 'generate-audio',
        status,
        podcastId,
        error,
      };
      publishEvent(userId, event);
      emitEntityChange(publishEvent, userId, 'podcast', podcastId);
    }
  };

  const onStart = () =>
    reapStaleJobs(publishEvent).pipe(
      Effect.flatMap(() => recoverOrphanedResearch(publishEvent)),
    );

  const onJobFailure = (job: Job<WorkerPayload>, errorMessage: string) =>
    syncFailedEntityStateForJob(job, errorMessage).pipe(
      Effect.catchAll((error) =>
        Effect.logError(
          `Failed to sync entity failure state for ${job.type} job ${job.id}: ${formatError(error)}`,
        ),
      ),
      Effect.annotateLogs('worker', 'UnifiedWorker'),
    );

  const onPollCycle = (_pollCount: number) =>
    Effect.gen(function* () {
      const now = Date.now();
      if (now - lastStaleSweepAt < STALE_CHECK_INTERVAL_MS) {
        return;
      }

      lastStaleSweepAt = now;
      yield* reapStaleJobs(publishEvent);
    });

  return createWorker({
    name: 'UnifiedWorker',
    jobTypes: JOB_TYPES,
    config: {
      ...config,
      perTypeConcurrency: {
        ...DEFAULT_PER_TYPE_CONCURRENCY,
        ...config.perTypeConcurrency,
      },
    },
    processJob,
    onJobFailure,
    onJobComplete,
    onPollCycle,
    onStart,
  });
}
