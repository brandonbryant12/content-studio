import { withCurrentUser } from '@repo/auth/policy';
import {
  type GeneratePodcastPayload,
  type GenerateScriptPayload,
  type GenerateAudioPayload,
  type GenerateVoiceoverPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect } from 'effect';
import { ssePublisher } from '@repo/api/server';
import type {
  EntityChangeEvent,
  JobCompletionEvent,
  VoiceoverJobCompletionEvent,
  SSEEvent,
} from '@repo/api/contracts';
import {
  createWorker,
  makeJobUser,
  wrapJobError,
  type BaseWorkerConfig,
  type Worker,
} from './base-worker';
import {
  handleGeneratePodcast,
  handleGenerateScript,
  handleGenerateAudio,
  type HandlerOptions,
} from './handlers';
import { handleGenerateVoiceover } from './voiceover-handlers';

// =============================================================================
// Job Type Definitions
// =============================================================================

type PodcastPayload =
  | GeneratePodcastPayload
  | GenerateScriptPayload
  | GenerateAudioPayload;

type WorkerPayload = PodcastPayload | GenerateVoiceoverPayload;

// All job types this worker handles
const JOB_TYPES: JobType[] = [
  'generate-podcast',
  'generate-script',
  'generate-audio',
  'generate-voiceover',
];

// =============================================================================
// Type Guards
// =============================================================================

const isPodcastPayload = (payload: WorkerPayload): payload is PodcastPayload =>
  'podcastId' in payload;

const isVoiceoverPayload = (
  payload: WorkerPayload,
): payload is GenerateVoiceoverPayload => 'voiceoverId' in payload;

const isGeneratePodcastJob = (
  job: Job<WorkerPayload>,
): job is Job<GeneratePodcastPayload> => job.type === 'generate-podcast';

const isGenerateScriptJob = (
  job: Job<WorkerPayload>,
): job is Job<GenerateScriptPayload> => job.type === 'generate-script';

const isGenerateAudioJob = (
  job: Job<WorkerPayload>,
): job is Job<GenerateAudioPayload> => job.type === 'generate-audio';

const isGenerateVoiceoverJob = (
  job: Job<WorkerPayload>,
): job is Job<GenerateVoiceoverPayload> => job.type === 'generate-voiceover';

// =============================================================================
// Worker Configuration
// =============================================================================

export interface UnifiedWorkerConfig extends BaseWorkerConfig {}

// =============================================================================
// Worker Factory
// =============================================================================

/**
 * Create a unified worker that handles all job types.
 * Can be scaled horizontally by running multiple instances.
 *
 * Handles:
 * - generate-podcast: Full podcast generation (script + audio)
 * - generate-script: Script generation only
 * - generate-audio: Audio generation from existing script
 * - generate-voiceover: TTS audio generation for voiceovers
 */
export const createUnifiedWorker = (config: UnifiedWorkerConfig): Worker => {
  // ===========================================================================
  // SSE Event Emitters
  // ===========================================================================

  const emitEvent = (userId: string, event: SSEEvent) => {
    ssePublisher.publish(userId, event);
  };

  const emitEntityChange = (
    userId: string,
    entityType: 'podcast' | 'voiceover',
    entityId: string,
  ) => {
    const event: EntityChangeEvent = {
      type: 'entity_change',
      entityType,
      changeType: 'update',
      entityId,
      userId,
      timestamp: new Date().toISOString(),
    };
    emitEvent(userId, event);
  };

  // ===========================================================================
  // Job Processor
  // ===========================================================================

  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      const { userId } = job.payload;
      const user = makeJobUser(userId);

      if (isGenerateVoiceoverJob(job)) {
        yield* Effect.logInfo(
          `Processing ${job.type} job ${job.id} for voiceover ${job.payload.voiceoverId}`,
        );
        yield* withCurrentUser(user)(handleGenerateVoiceover(job));
      } else if (isGeneratePodcastJob(job)) {
        yield* Effect.logInfo(
          `Processing ${job.type} job ${job.id} for podcast ${job.payload.podcastId}`,
        );
        const handlerOptions: HandlerOptions = {
          onScriptComplete: (podcastId) => {
            emitEntityChange(userId, 'podcast', podcastId);
            console.log(
              `[UnifiedWorker] Script complete for ${podcastId}, emitted SSE event`,
            );
          },
        };
        yield* withCurrentUser(user)(
          handleGeneratePodcast(job, handlerOptions),
        );
      } else if (isGenerateScriptJob(job)) {
        yield* Effect.logInfo(
          `Processing ${job.type} job ${job.id} for podcast ${job.payload.podcastId}`,
        );
        yield* withCurrentUser(user)(handleGenerateScript(job));
      } else if (isGenerateAudioJob(job)) {
        yield* Effect.logInfo(
          `Processing ${job.type} job ${job.id} for podcast ${job.payload.podcastId}`,
        );
        yield* withCurrentUser(user)(handleGenerateAudio(job));
      }

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
      Effect.catchAll((error: unknown) =>
        Effect.fail(wrapJobError(job.id, error)),
      ),
      Effect.annotateLogs('worker', 'UnifiedWorker'),
    );

  // ===========================================================================
  // Job Completion Handler
  // ===========================================================================

  const onJobComplete = (job: Job<WorkerPayload>) => {
    const { userId } = job.payload;
    const status = job.status === 'completed' ? 'completed' : 'failed';

    if (isVoiceoverPayload(job.payload)) {
      const { voiceoverId } = job.payload;

      // Emit voiceover job completion event
      const completionEvent: VoiceoverJobCompletionEvent = {
        type: 'voiceover_job_completion',
        jobId: job.id,
        jobType: 'generate-voiceover',
        status,
        voiceoverId,
        error: job.error ?? undefined,
      };
      emitEvent(userId, completionEvent);
      emitEntityChange(userId, 'voiceover', voiceoverId);

      console.log(
        `[UnifiedWorker] Emitted SSE events for voiceover job ${job.id} to user ${userId}`,
      );
    } else if (isPodcastPayload(job.payload)) {
      const { podcastId } = job.payload;

      // Emit podcast job completion event
      const completionEvent: JobCompletionEvent = {
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
      emitEvent(userId, completionEvent);
      emitEntityChange(userId, 'podcast', podcastId);

      console.log(
        `[UnifiedWorker] Emitted SSE events for podcast job ${job.id} to user ${userId}`,
      );
    }
  };

  // ===========================================================================
  // Create and Return Worker
  // ===========================================================================

  return createWorker({
    name: 'UnifiedWorker',
    jobTypes: JOB_TYPES,
    config,
    processJob,
    onJobComplete,
  });
};
