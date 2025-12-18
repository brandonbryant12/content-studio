import { CurrentUserLive, Role } from '@repo/auth-policy';
import { DatabasePolicyLive } from '@repo/auth-policy/providers/database';
import { createDb } from '@repo/db/client';
import { DbLive } from '@repo/effect/db';
import { GoogleLive } from '@repo/ai/llm';
import { GoogleTTSLive } from '@repo/ai/tts';
import { DocumentsLive, PodcastsLive, PodcastGeneratorLive } from '@repo/media';
import {
  Queue,
  QueueLive,
  JobProcessingError,
  type GeneratePodcastPayload,
  type GenerateScriptPayload,
  type GenerateAudioPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { createStorageLayer, type StorageConfig } from '@repo/api/server';
import { Effect, Layer, Schedule, ManagedRuntime, Logger } from 'effect';
import { WORKER_DEFAULTS } from '../constants';
import { handleGeneratePodcast, handleGenerateScript, handleGenerateAudio } from './handlers';

// Type guards for job type discrimination
type WorkerPayload = GeneratePodcastPayload | GenerateScriptPayload | GenerateAudioPayload;

const isGeneratePodcastJob = (job: Job<WorkerPayload>): job is Job<GeneratePodcastPayload> =>
  job.type === 'generate-podcast';

const isGenerateScriptJob = (job: Job<WorkerPayload>): job is Job<GenerateScriptPayload> =>
  job.type === 'generate-script';

const isGenerateAudioJob = (job: Job<WorkerPayload>): job is Job<GenerateAudioPayload> =>
  job.type === 'generate-audio';

export interface PodcastWorkerConfig {
  /** Database URL */
  databaseUrl: string;
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Google API key for LLM and TTS - required */
  geminiApiKey: string;
  /** Storage configuration */
  storageConfig: StorageConfig;
  /** Max consecutive errors before exiting */
  maxConsecutiveErrors?: number;
}

/**
 * Create and start the podcast generation worker.
 * Polls the queue for generate-podcast jobs and processes them.
 */
export const createPodcastWorker = (config: PodcastWorkerConfig) => {
  const pollInterval = config.pollInterval ?? WORKER_DEFAULTS.POLL_INTERVAL_MS;
  const maxConsecutiveErrors = config.maxConsecutiveErrors ?? WORKER_DEFAULTS.MAX_CONSECUTIVE_ERRORS;

  // Create database connection
  const db = createDb({ databaseUrl: config.databaseUrl });

  // Build base layers for worker (without user-specific context)
  const dbLayer = DbLive(db);
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const ttsLayer = GoogleTTSLive({ apiKey: config.geminiApiKey });
  const storageLayer = createStorageLayer(config.storageConfig, dbLayer);
  const llmLayer = GoogleLive({ apiKey: config.geminiApiKey });
  // Runtime for queue polling (doesn't need user context or documents)
  // Include pretty logger so Effect.logInfo etc. output to console
  const loggerLayer = Logger.pretty;
  const workerLayers = Layer.mergeAll(
    dbLayer,
    queueLayer,
    ttsLayer,
    storageLayer,
    policyLayer,
    llmLayer,
    loggerLayer,
  );
  const runtime = ManagedRuntime.make(workerLayers);

  /**
   * Build full layer stack for job processing with job-specific user context.
   * Returns a complete, self-contained layer.
   */
  const makeJobRuntime = (userId: string) => {
    const userLayer = CurrentUserLive({
      id: userId,
      email: '', // Not needed for job processing
      name: 'Worker',
      role: Role.USER,
    });

    // DocumentsLive requires Db, CurrentUser, Storage
    const documentsLayerWithUser = DocumentsLive.pipe(
      Layer.provide(Layer.mergeAll(dbLayer, userLayer, storageLayer)),
    );

    // PodcastsLive requires Db, CurrentUser (CRUD only)
    const podcastsLayer = PodcastsLive.pipe(
      Layer.provide(Layer.mergeAll(dbLayer, userLayer)),
    );

    // PodcastGeneratorLive uses Layer.effect - requires all deps at layer construction
    // This ensures compile-time verification that all dependencies are provided
    const generatorLayer = PodcastGeneratorLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          dbLayer,
          userLayer,
          documentsLayerWithUser,
          llmLayer,
          ttsLayer,
          storageLayer,
        ),
      ),
    );

    // Combine all layers needed for the handler
    const allLayers = Layer.mergeAll(
      dbLayer,
      userLayer,
      ttsLayer,
      storageLayer,
      llmLayer,
      documentsLayerWithUser,
      queueLayer,
      podcastsLayer,
      generatorLayer,
    );

    return ManagedRuntime.make(allLayers);
  };

  /**
   * Process a single job based on its type.
   */
  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(
        `Processing ${job.type} job ${job.id} for podcast ${job.payload.podcastId}`,
      );

      // Create a dedicated runtime for this job with user context
      const jobRuntime = makeJobRuntime(job.payload.userId);

      // Run the appropriate handler based on job type using type guards
      const runHandler = async (): Promise<unknown> => {
        if (isGeneratePodcastJob(job)) {
          return jobRuntime.runPromise(handleGeneratePodcast(job));
        }
        if (isGenerateScriptJob(job)) {
          return jobRuntime.runPromise(handleGenerateScript(job));
        }
        if (isGenerateAudioJob(job)) {
          return jobRuntime.runPromise(handleGenerateAudio(job));
        }
        // Exhaustive check - this should never be reached
        const _exhaustiveCheck: never = job;
        throw new Error(`Unknown job type: ${(_exhaustiveCheck as Job<WorkerPayload>).type}`);
      };

      // Run the handler with the job-specific runtime
      // Use tryPromise to properly convert rejections into Effect failures
      const result = yield* Effect.tryPromise({
        try: runHandler,
        catch: (error) =>
          new JobProcessingError({
            jobId: job.id,
            message: error instanceof Error ? error.message : String(error),
            cause: error,
          }),
      }).pipe(
        // Always clean up the job runtime, whether success or failure
        Effect.ensuring(Effect.promise(() => jobRuntime.dispose())),
      );

      yield* Effect.logInfo(`Job ${job.id} completed`);
      return result;
    }).pipe(Effect.annotateLogs('worker', 'PodcastWorker'));

  // Job types this worker handles
  const JOB_TYPES: JobType[] = ['generate-podcast', 'generate-script', 'generate-audio'];

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
      const job = yield* queue.getJob(jobId);
      return yield* processJob(job as Job<WorkerPayload>);
    });

    // Use the worker runtime which has queue access
    return runtime.runPromise(effect);
  };

  return {
    start,
    processJobById,
    runtime,
  };
};
