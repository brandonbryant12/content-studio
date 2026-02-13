import type {
  DocumentJobCompletionEvent,
  InfographicJobCompletionEvent,
  JobCompletionEvent,
  SSEEvent,
  VoiceoverJobCompletionEvent,
} from '@repo/api/contracts';
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
import {
  createWorker,
  makeJobUser,
  wrapJobError,
  type BaseWorkerConfig,
  type Worker,
} from './base-worker';
import { STALE_CHECK_EVERY_N_POLLS } from './constants';
import { emitEntityChange, type PublishEvent } from './events';
import { handleProcessUrl } from './handlers/document-handlers';
import {
  handleGenerateAudio,
  handleGeneratePodcast,
  handleGenerateScript,
} from './handlers/handlers';
import { handleGenerateInfographic } from './handlers/infographic-handlers';
import { handleProcessResearch } from './handlers/research-handlers';
import { handleGenerateVoiceover } from './handlers/voiceover-handlers';
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

  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      const { userId } = job.payload;
      const run = withCurrentUser(makeJobUser(userId));

      yield* Effect.logInfo(`Processing ${job.type} job ${job.id}`);

      switch (job.type) {
        case 'process-url':
          yield* run(handleProcessUrl(job as Job<ProcessUrlPayload>));
          break;
        case 'process-research':
          yield* run(handleProcessResearch(job as Job<ProcessResearchPayload>));
          break;
        case 'generate-infographic':
          yield* run(
            handleGenerateInfographic(job as Job<GenerateInfographicPayload>),
          );
          break;
        case 'generate-voiceover':
          yield* run(
            handleGenerateVoiceover(job as Job<GenerateVoiceoverPayload>),
          );
          break;
        case 'generate-podcast':
          yield* run(handleGeneratePodcast(job as Job<GeneratePodcastPayload>));
          break;
        case 'generate-script':
          yield* run(handleGenerateScript(job as Job<GenerateScriptPayload>));
          break;
        case 'generate-audio':
          yield* run(handleGenerateAudio(job as Job<GenerateAudioPayload>));
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

    if ('documentId' in job.payload) {
      const { documentId } = job.payload as
        | ProcessUrlPayload
        | ProcessResearchPayload;
      const event: DocumentJobCompletionEvent = {
        type: 'document_job_completion',
        jobId: job.id,
        jobType: job.type as 'process-url' | 'process-research',
        status,
        documentId,
        error,
      };
      publishEvent(userId, event);
      emitEntityChange(publishEvent, userId, 'document', documentId);
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

  const onPollCycle = (pollCount: number) =>
    pollCount % STALE_CHECK_EVERY_N_POLLS === 0
      ? reapStaleJobs(publishEvent)
      : Effect.void;

  return createWorker({
    name: 'UnifiedWorker',
    jobTypes: JOB_TYPES,
    config,
    processJob,
    onJobComplete,
    onPollCycle,
    onStart,
  });
}
