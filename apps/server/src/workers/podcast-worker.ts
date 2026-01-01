import {
  createServerRuntime,
  type StorageConfig,
  type ServerRuntime,
} from '@repo/api/server';
import { withCurrentUser, Role, type User } from '@repo/auth/policy';
import { createDb } from '@repo/db/client';
import {
  Queue,
  JobProcessingError,
  type GeneratePodcastPayload,
  type GenerateScriptPayload,
  type GenerateAudioPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect, Schedule } from 'effect';
import type {
  EntityChangeEvent,
  JobCompletionEvent,
} from '@repo/api/contracts';
import { WORKER_DEFAULTS } from '../constants';
import { sseManager } from '../sse';
import {
  handleGeneratePodcast,
  handleGenerateScript,
  handleGenerateAudio,
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

const isGenerateAudioJob = (
  job: Job<WorkerPayload>,
): job is Job<GenerateAudioPayload> => job.type === 'generate-audio';

/**
 * Extract podcast ID from any job payload type.
 */
const getPodcastIdFromPayload = (payload: WorkerPayload): string | undefined => {
  if ('podcastId' in payload) {
    return payload.podcastId;
  }
  // GenerateAudioPayload has versionId, not podcastId
  // For SSE events, we may not have the podcastId directly
  return undefined;
};

export interface PodcastWorkerConfig {
  /** Database URL */
  databaseUrl: string;
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Google API key for LLM and TTS - required unless useMockAI is true */
  geminiApiKey: string;
  /** Storage configuration */
  storageConfig: StorageConfig;
  /** Max consecutive errors before exiting */
  maxConsecutiveErrors?: number;
  /** Use mock AI services instead of real ones (for testing) */
  useMockAI?: boolean;
}

/**
 * Create and start the podcast generation worker.
 * Polls the queue for generate-podcast jobs and processes them.
 *
 * Uses a single shared ManagedRuntime created at startup.
 * User context is scoped per job via FiberRef (withCurrentUser).
 */
export const createPodcastWorker = (config: PodcastWorkerConfig) => {
  const pollInterval = config.pollInterval ?? WORKER_DEFAULTS.POLL_INTERVAL_MS;
  const maxConsecutiveErrors =
    config.maxConsecutiveErrors ?? WORKER_DEFAULTS.MAX_CONSECUTIVE_ERRORS;

  // Create database connection
  const db = createDb({ databaseUrl: config.databaseUrl });

  // Create single shared runtime at worker startup
  // All layers (Db, Queue, TTS, LLM, Storage, Documents, etc.) are built once
  const runtime: ServerRuntime = createServerRuntime({
    db,
    geminiApiKey: config.geminiApiKey,
    storageConfig: config.storageConfig,
    useMockAI: config.useMockAI,
  });

  if (config.useMockAI) {
    console.log('[Worker] Using mock AI layers for testing');
  }

  /**
   * Create a User object for job processing.
   */
  const makeJobUser = (userId: string): User => ({
    id: userId,
    email: '', // Not needed for job processing
    name: 'Worker',
    role: Role.USER,
  });

  /**
   * Process a single job based on its type.
   * User context is scoped via FiberRef for the duration of the job.
   */
  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      const jobDescription =
        'podcastId' in job.payload
          ? `podcast ${job.payload.podcastId}`
          : `version ${job.payload.versionId}`;
      yield* Effect.logInfo(
        `Processing ${job.type} job ${job.id} for ${jobDescription}`,
      );

      // Create user context for this job
      const user = makeJobUser(job.payload.userId);

      // Run the appropriate handler with user context scoped via FiberRef
      // Each handler returns a different result type, so we type as unknown
      if (isGeneratePodcastJob(job)) {
        yield* withCurrentUser(user)(handleGeneratePodcast(job));
      } else if (isGenerateScriptJob(job)) {
        yield* withCurrentUser(user)(handleGenerateScript(job));
      } else if (isGenerateAudioJob(job)) {
        yield* withCurrentUser(user)(handleGenerateAudio(job));
      } else {
        yield* Effect.fail(
          new JobProcessingError({
            jobId: job.id,
            message: `Unknown job type: ${job.type}`,
          }),
        );
      }

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
      // Catch any unexpected errors and wrap as JobProcessingError
      Effect.catchAll((error) =>
        Effect.fail(
          error instanceof JobProcessingError
            ? error
            : new JobProcessingError({
                jobId: job.id,
                message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
                cause: error,
              }),
        ),
      ),
      Effect.annotateLogs('worker', 'PodcastWorker'),
    );

  // Job types this worker handles
  const JOB_TYPES: JobType[] = [
    'generate-podcast',
    'generate-script',
    'generate-audio',
  ];

  /**
   * Poll for and process the next job from any of the supported types.
   */
  const pollOnce = Effect.gen(function* () {
    const queue = yield* Queue;

    // Try each job type until we find one
    for (const jobType of JOB_TYPES) {
      const job = yield* queue.processNextJob(jobType, (j) =>
        processJob(j as Job<WorkerPayload>),
      );

      if (job) {
        yield* Effect.logInfo(
          `Finished processing ${job.type} job ${job.id}, status: ${job.status}`,
        );

        // Emit SSE events for job completion
        const payload = job.payload as WorkerPayload;
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
          podcastId: podcastId ?? '', // May be empty for audio-only jobs
          error: job.error ?? undefined,
        };
        sseManager.emit(userId, jobCompletionEvent);

        // Emit entity change event for the podcast (if we have podcast ID)
        if (podcastId) {
          const entityChangeEvent: EntityChangeEvent = {
            type: 'entity_change',
            entityType: 'podcast',
            changeType: 'update',
            entityId: podcastId,
            userId,
            timestamp: new Date().toISOString(),
          };
          sseManager.emit(userId, entityChangeEvent);
        }

        yield* Effect.logInfo(
          `Emitted SSE events for job ${job.id} to user ${userId}`,
        );

        return job;
      }
    }

    yield* Effect.logInfo('No pending jobs found');
    return null;
  }).pipe(Effect.annotateLogs('worker', 'PodcastWorker'));

  /**
   * Start the worker loop with error handling and backoff.
   */
  const start = async () => {
    // Retry schedule: exponential backoff starting at pollInterval, capped at BACKOFF_CAP_MS, max retries
    const retrySchedule = Schedule.exponential(pollInterval, 2).pipe(
      Schedule.union(Schedule.spaced(WORKER_DEFAULTS.BACKOFF_CAP_MS)),
      Schedule.intersect(Schedule.recurs(maxConsecutiveErrors - 1)),
    );

    const loop = Effect.gen(function* () {
      yield* Effect.logInfo(`Starting worker, polling every ${pollInterval}ms`);

      // Main polling loop - runs forever on success
      yield* pollOnce.pipe(
        Effect.tap(() => Effect.sleep(pollInterval)),
        Effect.forever,
      );
    }).pipe(
      Effect.annotateLogs('worker', 'PodcastWorker'),
      // Retry the entire loop with backoff on infrastructure errors
      Effect.retry({
        schedule: retrySchedule,
        while: (error) => {
          Effect.runSync(
            Effect.logWarning(`Worker error, will retry...`).pipe(
              Effect.annotateLogs('error', String(error)),
            ),
          );
          return true;
        },
      }),
      Effect.tapError((error) =>
        Effect.logError(
          `Too many consecutive errors (${maxConsecutiveErrors}), shutting down`,
        ).pipe(Effect.annotateLogs('error', String(error))),
      ),
    );

    await runtime.runPromise(loop);
  };

  /**
   * Process a single job by ID (for testing).
   */
  const processJobById = async (jobId: string) => {
    const effect = Effect.gen(function* () {
      const queue = yield* Queue;
      // Cast to JobId - the queue.getJob will validate and fail if invalid
      const job = yield* queue.getJob(jobId as import('@repo/db/schema').JobId);
      return yield* processJob(job as Job<WorkerPayload>);
    });

    return runtime.runPromise(effect);
  };

  return {
    start,
    processJobById,
    runtime,
  };
};
