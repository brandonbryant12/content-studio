import { ssePublisher } from '@repo/api/server';
import { withCurrentUser } from '@repo/auth/policy';
import { JobStatus } from '@repo/db/schema';
import {
  type GeneratePodcastPayload,
  type GenerateScriptPayload,
  type GenerateAudioPayload,
  type GenerateVoiceoverPayload,
  type GenerateInfographicPayload,
  type ProcessUrlPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect } from 'effect';
import type {
  EntityChangeEvent,
  JobCompletionEvent,
  VoiceoverJobCompletionEvent,
  InfographicJobCompletionEvent,
  DocumentJobCompletionEvent,
} from '@repo/api/contracts';
import {
  createWorker,
  makeJobUser,
  wrapJobError,
  type BaseWorkerConfig,
  type Worker,
} from './base-worker';
import { handleProcessUrl } from './document-handlers';
import {
  handleGeneratePodcast,
  handleGenerateScript,
  handleGenerateAudio,
} from './handlers';
import { handleGenerateInfographic } from './infographic-handlers';
import { handleGenerateVoiceover } from './voiceover-handlers';

type WorkerPayload =
  | GeneratePodcastPayload
  | GenerateScriptPayload
  | GenerateAudioPayload
  | GenerateVoiceoverPayload
  | GenerateInfographicPayload
  | ProcessUrlPayload;

const JOB_TYPES: JobType[] = [
  'generate-podcast',
  'generate-script',
  'generate-audio',
  'generate-voiceover',
  'generate-infographic',
  'process-url',
];

function emitEntityChange(
  userId: string,
  entityType: 'podcast' | 'voiceover' | 'infographic' | 'document',
  entityId: string,
): void {
  const event: EntityChangeEvent = {
    type: 'entity_change',
    entityType,
    changeType: 'update',
    entityId,
    userId,
    timestamp: new Date().toISOString(),
  };
  ssePublisher.publish(userId, event);
}

export function createUnifiedWorker(config: BaseWorkerConfig): Worker {
  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      const { userId } = job.payload;
      const user = makeJobUser(userId);

      yield* Effect.logInfo(`Processing ${job.type} job ${job.id}`);

      const run = withCurrentUser(user);

      switch (job.type) {
        case 'process-url':
          yield* run(handleProcessUrl(job as Job<ProcessUrlPayload>));
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
          yield* run(
            handleGeneratePodcast(job as Job<GeneratePodcastPayload>, {
              onScriptComplete: (podcastId) =>
                emitEntityChange(userId, 'podcast', podcastId),
            }),
          );
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
      Effect.catchAll((error: unknown) =>
        Effect.fail(wrapJobError(job.id, error)),
      ),
      Effect.catchAllDefect((defect) =>
        Effect.fail(
          wrapJobError(
            job.id,
            defect instanceof Error ? defect : new Error(String(defect)),
          ),
        ),
      ),
      Effect.annotateLogs('worker', 'UnifiedWorker'),
    );

  const onJobComplete = (job: Job<WorkerPayload>) => {
    const { userId } = job.payload;
    const status =
      job.status === JobStatus.COMPLETED
        ? JobStatus.COMPLETED
        : JobStatus.FAILED;

    if ('documentId' in job.payload) {
      const { documentId } = job.payload as ProcessUrlPayload;
      const event: DocumentJobCompletionEvent = {
        type: 'document_job_completion',
        jobId: job.id,
        jobType: 'process-url',
        status,
        documentId,
        error: job.error ?? undefined,
      };
      ssePublisher.publish(userId, event);
      emitEntityChange(userId, 'document', documentId);
    } else if ('infographicId' in job.payload) {
      const { infographicId } = job.payload as GenerateInfographicPayload;
      const event: InfographicJobCompletionEvent = {
        type: 'infographic_job_completion',
        jobId: job.id,
        jobType: 'generate-infographic',
        status,
        infographicId,
        error: job.error ?? undefined,
      };
      ssePublisher.publish(userId, event);
      emitEntityChange(userId, 'infographic', infographicId);
    } else if ('voiceoverId' in job.payload) {
      const { voiceoverId } = job.payload as GenerateVoiceoverPayload;
      const event: VoiceoverJobCompletionEvent = {
        type: 'voiceover_job_completion',
        jobId: job.id,
        jobType: 'generate-voiceover',
        status,
        voiceoverId,
        error: job.error ?? undefined,
      };
      ssePublisher.publish(userId, event);
      emitEntityChange(userId, 'voiceover', voiceoverId);
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
        error: job.error ?? undefined,
      };
      ssePublisher.publish(userId, event);
      emitEntityChange(userId, 'podcast', podcastId);
    }
  };

  return createWorker({
    name: 'UnifiedWorker',
    jobTypes: JOB_TYPES,
    config,
    processJob,
    onJobComplete,
  });
}
