import {
  createServerRuntime,
  type StorageConfig,
  type ServerRuntime,
  type SharedServices,
} from '@repo/api/server';
import type { AIProvider, VertexAIConfig } from '@repo/ai';
import { Role, type User } from '@repo/auth/policy';
import { createDb } from '@repo/db/client';
import { Queue, JobProcessingError, type Job, type JobType } from '@repo/queue';
import type { JobId } from '@repo/db/schema';
import { Effect, Ref, Schedule } from 'effect';
import { WORKER_DEFAULTS } from '../constants';

/**
 * Base configuration shared by all workers.
 * Either provide a shared runtime, or databaseUrl/geminiApiKey/storageConfig to create a new one.
 */
export interface BaseWorkerConfig {
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Max consecutive errors before exiting */
  maxConsecutiveErrors?: number;
  /** Shared server runtime (preferred - shares DB connection with API) */
  runtime?: ServerRuntime;
  /** Database URL (used only if runtime not provided) */
  databaseUrl?: string;
  /** AI provider to use: 'gemini' or 'vertex' (used only if runtime not provided) */
  aiProvider?: AIProvider;
  /** Google API key for AI services (used only if runtime not provided) */
  geminiApiKey?: string;
  /** Vertex AI config (used only if runtime not provided and aiProvider='vertex') */
  vertexConfig?: VertexAIConfig;
  /** Storage configuration (used only if runtime not provided) */
  storageConfig?: StorageConfig;
  /** Use mock AI services (used only if runtime not provided) */
  useMockAI?: boolean;
}

/**
 * Worker instance returned by createWorker.
 */
export interface Worker {
  /** Start the worker polling loop */
  start: () => Promise<void>;
  /** Process a single job by ID (for testing) */
  processJobById: (jobId: string) => Promise<void>;
  /** The worker's runtime */
  runtime: ServerRuntime;
}

/**
 * Create a User object for job processing.
 */
export const makeJobUser = (userId: string): User => ({
  id: userId,
  email: '', // Not needed for job processing
  name: 'Worker',
  role: Role.USER,
});

/**
 * Create a retry schedule with exponential backoff.
 */
export const createRetrySchedule = (
  pollInterval: number,
  maxConsecutiveErrors: number,
) =>
  Schedule.exponential(pollInterval, 2).pipe(
    Schedule.union(Schedule.spaced(WORKER_DEFAULTS.BACKOFF_CAP_MS)),
    Schedule.intersect(Schedule.recurs(maxConsecutiveErrors - 1)),
  );

/**
 * Wrap an error in JobProcessingError if not already wrapped.
 */
export const wrapJobError = (
  jobId: string,
  error: unknown,
): JobProcessingError =>
  error instanceof JobProcessingError
    ? error
    : new JobProcessingError({
        jobId,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      });

/**
 * Configuration for creating a generic worker.
 */
export interface CreateWorkerOptions<
  TPayload,
  R extends SharedServices = SharedServices,
> {
  /** Worker name for logging */
  name: string;
  /** Job types this worker handles */
  jobTypes: JobType[];
  /** Base configuration */
  config: BaseWorkerConfig;
  /** Process a single job - called with job and returns Effect requiring SharedServices */
  processJob: (
    job: Job<TPayload>,
  ) => Effect.Effect<void, JobProcessingError, R>;
  /** Called after job completion with the finished job */
  onJobComplete?: (job: Job<TPayload>) => void;
}

/**
 * Create a worker with common infrastructure.
 */
export const createWorker = <
  TPayload extends { userId: string },
  R extends SharedServices = SharedServices,
>(
  options: CreateWorkerOptions<TPayload, R>,
): Worker => {
  const { name, jobTypes, config, processJob, onJobComplete } = options;
  const pollInterval = config.pollInterval ?? WORKER_DEFAULTS.POLL_INTERVAL_MS;
  const maxConsecutiveErrors =
    config.maxConsecutiveErrors ?? WORKER_DEFAULTS.MAX_CONSECUTIVE_ERRORS;

  // Use shared runtime if provided, otherwise create a new one
  let runtime: ServerRuntime;
  if (config.runtime) {
    runtime = config.runtime;
    console.log(`[${name}] Using shared runtime`);
  } else {
    // Validate required config for creating a new runtime
    const aiProvider = config.aiProvider ?? 'gemini';
    const needsGeminiKey = aiProvider === 'gemini' && !config.useMockAI;
    const needsVertexConfig = aiProvider === 'vertex' && !config.useMockAI;

    if (!config.databaseUrl || !config.storageConfig) {
      throw new Error(
        `[${name}] Either 'runtime' or 'databaseUrl' and 'storageConfig' must be provided`,
      );
    }

    if (needsGeminiKey && !config.geminiApiKey) {
      throw new Error(
        `[${name}] 'geminiApiKey' is required when aiProvider='gemini' and useMockAI=false`,
      );
    }

    if (needsVertexConfig && !config.vertexConfig) {
      throw new Error(
        `[${name}] 'vertexConfig' is required when aiProvider='vertex' and useMockAI=false`,
      );
    }

    // Create database connection and runtime
    const db = createDb({ databaseUrl: config.databaseUrl });
    runtime = createServerRuntime({
      db,
      storageConfig: config.storageConfig,
      useMockAI: config.useMockAI,
      aiProvider,
      geminiApiKey: config.geminiApiKey,
      vertexConfig: config.vertexConfig,
    });

    if (config.useMockAI) {
      console.log(`[${name}] Using mock AI layers for testing`);
    }
  }

  // How many idle polls before logging a summary at INFO level
  const IDLE_SUMMARY_INTERVAL = Math.max(1, Math.round(60_000 / pollInterval));

  /**
   * Poll for and process the next job from any of the supported types.
   */
  const pollOnce = (idleCount: Ref.Ref<number>) =>
    Effect.gen(function* () {
      const queue = yield* Queue;

      // Try each job type until we find one
      for (const jobType of jobTypes) {
        const job = yield* queue.processNextJob(jobType, (j) =>
          processJob(j as Job<TPayload>),
        );

        if (job) {
          // Reset idle counter when a job is processed
          yield* Ref.set(idleCount, 0);
          yield* Effect.logInfo(
            `Finished processing ${job.type} job ${job.id}, status: ${job.status}`,
          );

          // Call completion callback if provided
          onJobComplete?.(job as Job<TPayload>);

          return job;
        }
      }

      // Increment idle counter and log at DEBUG, with a periodic INFO summary
      const count = yield* Ref.updateAndGet(idleCount, (n) => n + 1);
      if (count % IDLE_SUMMARY_INTERVAL === 0) {
        yield* Effect.logInfo(
          `Idle for ${Math.round((count * pollInterval) / 1000)}s, no pending jobs`,
        );
      } else {
        yield* Effect.logDebug('No pending jobs found');
      }

      return null;
    }).pipe(Effect.annotateLogs('worker', name));

  /**
   * Start the worker loop with error handling and backoff.
   */
  const start = async () => {
    const retrySchedule = createRetrySchedule(
      pollInterval,
      maxConsecutiveErrors,
    );

    const loop = Effect.gen(function* () {
      const idleCount = yield* Ref.make(0);

      yield* Effect.logInfo(
        `Starting ${name}, polling every ${pollInterval}ms`,
      );

      // Main polling loop - runs forever on success
      yield* pollOnce(idleCount).pipe(
        Effect.tap(() => Effect.sleep(pollInterval)),
        Effect.forever,
      );
    }).pipe(
      Effect.annotateLogs('worker', name),
      // Retry the entire loop with backoff on infrastructure errors
      Effect.retry({
        schedule: retrySchedule,
        while: (error) => {
          Effect.runSync(
            Effect.logWarning(`${name} error, will retry...`).pipe(
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
      const job = yield* queue.getJob(jobId as JobId);
      return yield* processJob(job as Job<TPayload>);
    });

    await runtime.runPromise(effect);
  };

  return {
    start,
    processJobById,
    runtime,
  };
};
