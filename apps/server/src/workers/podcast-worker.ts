import { ssePublisher } from '@repo/api/server';
import { withCurrentUser } from '@repo/auth/policy';
import {
  JobProcessingError,
  type GeneratePodcastPayload,
  type GenerateScriptPayload,
  type GenerateAudioPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect } from 'effect';
import type {
  EntityChangeEvent,
  JobCompletionEvent,
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

// Type guards for job type discrimination
type WorkerPayload =
  | GeneratePodcastPayload
  | GenerateScriptPayload
  | GenerateAudioPayload;

const isGeneratePodcastJob = (
  job: Job<WorkerPayload>,
): job is Job<GeneratePodcastPayload> => job.type === 'generate-podcast';

const isGenerateScriptJob = (
  job: Job<WorkerPayload>,
): job is Job<GenerateScriptPayload> => job.type === 'generate-script';

/**
 * Extract podcast ID from any job payload type.
 */
const getPodcastIdFromPayload = (payload: WorkerPayload): string => {
  return payload.podcastId;
};

export interface PodcastWorkerConfig extends BaseWorkerConfig {}

// Job types this worker handles
const JOB_TYPES: JobType[] = [
  'generate-podcast',
  'generate-script',
  'generate-audio',
];

/**
 * Create and start the podcast generation worker.
 * Polls the queue for generate-podcast jobs and processes them.
 *
 * Uses a single shared ManagedRuntime created at startup.
 * User context is scoped per job via FiberRef (withCurrentUser).
 */
export const createPodcastWorker = (config: PodcastWorkerConfig): Worker => {
  /**
   * Emit SSE event to notify frontend of entity change.
   */
  const emitEntityChange = (userId: string, podcastId: string) => {
    const entityChangeEvent: EntityChangeEvent = {
      type: 'entity_change',
      entityType: 'podcast',
      changeType: 'update',
      entityId: podcastId,
      userId,
      timestamp: new Date().toISOString(),
    };
    ssePublisher.publish(userId, entityChangeEvent);
  };

  /**
   * Process a single job based on its type.
   * User context is scoped via FiberRef for the duration of the job.
   */
  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(
        `Processing ${job.type} job ${job.id} for podcast ${job.payload.podcastId}`,
      );

      // Create user context for this job
      const user = makeJobUser(job.payload.userId);
      const { userId } = job.payload;

      // Handler options with progress callbacks
      const handlerOptions: HandlerOptions = {
        onScriptComplete: (podcastId) => {
          // Emit SSE event so frontend can fetch the script while audio generates
          emitEntityChange(userId, podcastId);
          console.log(
            `[Worker] Script complete for ${podcastId}, emitted SSE event`,
          );
        },
      };

      // Run the appropriate handler with user context scoped via FiberRef
      // Each handler returns a different result type, so we type as unknown
      if (isGeneratePodcastJob(job)) {
        yield* withCurrentUser(user)(
          handleGeneratePodcast(job, handlerOptions),
        );
      } else if (isGenerateScriptJob(job)) {
        yield* withCurrentUser(user)(handleGenerateScript(job));
      } else {
        // Must be generate-audio job - type guards are exhaustive
        yield* withCurrentUser(user)(handleGenerateAudio(job));
      }

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
      // Catch any unexpected errors and wrap as JobProcessingError
      Effect.catchAll((error: unknown) =>
        Effect.fail(wrapJobError(job.id, error)),
      ),
      Effect.annotateLogs('worker', 'PodcastWorker'),
    );

  /**
   * Handle job completion - emit SSE events.
   */
  const onJobComplete = (job: Job<WorkerPayload>) => {
    const payload = job.payload;
    const { userId } = payload;
    const podcastId = getPodcastIdFromPayload(payload);

    // Emit job completion event
    const jobCompletionEvent: JobCompletionEvent = {
      type: 'job_completion',
      jobId: job.id,
      jobType: job.type as
        | 'generate-podcast'
        | 'generate-script'
        | 'generate-audio',
      status: job.status === 'completed' ? 'completed' : 'failed',
      podcastId,
      error: job.error ?? undefined,
    };
    ssePublisher.publish(userId, jobCompletionEvent);

    // Emit entity change event for the podcast
    emitEntityChange(userId, podcastId);

    console.log(
      `[PodcastWorker] Emitted SSE events for job ${job.id} to user ${userId}`,
    );
  };

  return createWorker({
    name: 'PodcastWorker',
    jobTypes: JOB_TYPES,
    config,
    processJob,
    onJobComplete,
  });
};
