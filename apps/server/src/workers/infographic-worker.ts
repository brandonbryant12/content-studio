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
  type GenerateInfographicPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect, Schedule } from 'effect';
import type {
  EntityChangeEvent,
  InfographicJobCompletionEvent,
} from '@repo/api/contracts';
import { WORKER_DEFAULTS } from '../constants';
import { sseManager } from '../sse';
import { handleGenerateInfographic } from './infographic-handlers';

export interface InfographicWorkerConfig {
  /** Database URL */
  databaseUrl: string;
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Google API key for image generation - required unless useMockAI is true */
  geminiApiKey: string;
  /** Storage configuration */
  storageConfig: StorageConfig;
  /** Max consecutive errors before exiting */
  maxConsecutiveErrors?: number;
  /** Use mock AI services instead of real ones (for testing) */
  useMockAI?: boolean;
}

/**
 * Create and start the infographic generation worker.
 * Polls the queue for generate-infographic jobs and processes them.
 *
 * Uses a single shared ManagedRuntime created at startup.
 * User context is scoped per job via FiberRef (withCurrentUser).
 */
export const createInfographicWorker = (config: InfographicWorkerConfig) => {
  const pollInterval = config.pollInterval ?? WORKER_DEFAULTS.POLL_INTERVAL_MS;
  const maxConsecutiveErrors =
    config.maxConsecutiveErrors ?? WORKER_DEFAULTS.MAX_CONSECUTIVE_ERRORS;

  // Create database connection
  const db = createDb({ databaseUrl: config.databaseUrl });

  // Create single shared runtime at worker startup
  // All layers (Db, Queue, Image, Storage, InfographicRepo, etc.) are built once
  const runtime: ServerRuntime = createServerRuntime({
    db,
    geminiApiKey: config.geminiApiKey,
    storageConfig: config.storageConfig,
    useMockAI: config.useMockAI,
  });

  if (config.useMockAI) {
    console.log('[InfographicWorker] Using mock AI layers for testing');
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
   * Emit SSE event to notify frontend of entity change.
   */
  const emitEntityChange = (userId: string, infographicId: string) => {
    const entityChangeEvent: EntityChangeEvent = {
      type: 'entity_change',
      entityType: 'infographic',
      changeType: 'update',
      entityId: infographicId,
      userId,
      timestamp: new Date().toISOString(),
    };
    sseManager.emit(userId, entityChangeEvent);
  };

  /**
   * Process a single job.
   * User context is scoped via FiberRef for the duration of the job.
   */
  const processJob = (job: Job<GenerateInfographicPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(
        `Processing ${job.type} job ${job.id} for infographic ${job.payload.infographicId}`,
      );

      // Create user context for this job
      const user = makeJobUser(job.payload.userId);

      // Run the handler with user context scoped via FiberRef
      yield* withCurrentUser(user)(handleGenerateInfographic(job));

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
      // Catch any unexpected errors and wrap as JobProcessingError
      Effect.catchAll((error: unknown) =>
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
      Effect.annotateLogs('worker', 'InfographicWorker'),
    );

  // Job types this worker handles
  const JOB_TYPES: JobType[] = ['generate-infographic'];

  /**
   * Poll for and process the next infographic job.
   */
  const pollOnce = Effect.gen(function* () {
    const queue = yield* Queue;

    // Try each job type until we find one
    for (const jobType of JOB_TYPES) {
      const job = yield* queue.processNextJob(jobType, (j) =>
        processJob(j as Job<GenerateInfographicPayload>),
      );

      if (job) {
        yield* Effect.logInfo(
          `Finished processing ${job.type} job ${job.id}, status: ${job.status}`,
        );

        // Emit SSE events for job completion
        const payload = job.payload as GenerateInfographicPayload;
        const { userId, infographicId } = payload;

        // Emit job completion event
        const jobCompletionEvent: InfographicJobCompletionEvent = {
          type: 'infographic_job_completion',
          jobId: job.id,
          jobType: 'generate-infographic',
          status: job.status === 'completed' ? 'completed' : 'failed',
          infographicId,
          error: job.error ?? undefined,
        };
        sseManager.emit(userId, jobCompletionEvent);

        // Emit entity change event for the infographic
        emitEntityChange(userId, infographicId);

        yield* Effect.logInfo(
          `Emitted SSE events for job ${job.id} to user ${userId}`,
        );

        return job;
      }
    }

    yield* Effect.logInfo('No pending infographic jobs found');
    return null;
  }).pipe(Effect.annotateLogs('worker', 'InfographicWorker'));

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
      yield* Effect.logInfo(
        `Starting infographic worker, polling every ${pollInterval}ms`,
      );

      // Main polling loop - runs forever on success
      yield* pollOnce.pipe(
        Effect.tap(() => Effect.sleep(pollInterval)),
        Effect.forever,
      );
    }).pipe(
      Effect.annotateLogs('worker', 'InfographicWorker'),
      // Retry the entire loop with backoff on infrastructure errors
      Effect.retry({
        schedule: retrySchedule,
        while: (error) => {
          Effect.runSync(
            Effect.logWarning(`Infographic worker error, will retry...`).pipe(
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
      return yield* processJob(job as Job<GenerateInfographicPayload>);
    });

    return runtime.runPromise(effect);
  };

  return {
    start,
    processJobById,
    runtime,
  };
};
