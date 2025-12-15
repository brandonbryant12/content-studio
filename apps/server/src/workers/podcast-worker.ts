import { CurrentUserLive, Role } from '@repo/auth-policy';
import { DatabasePolicyLive } from '@repo/auth-policy/providers/database';
import { createDb } from '@repo/db/client';
import { DocumentsLive } from '@repo/documents';
import { DbLive } from '@repo/effect/db';
import { GoogleLive } from '@repo/llm';
import { PodcastsLive, PodcastGeneratorLive } from '@repo/podcast';
import {
  Queue,
  QueueLive,
  JobProcessingError,
  type GeneratePodcastPayload,
  type Job,
} from '@repo/queue';
import {
  DatabaseStorageLive,
  FilesystemStorageLive,
  S3StorageLive,
} from '@repo/storage';
import type { StorageConfig } from '@repo/api/server';
import { GoogleTTSLive } from '@repo/tts';
import { Effect, Layer, Schedule, ManagedRuntime, Logger } from 'effect';
import { handleGeneratePodcast } from './handlers';

export interface PodcastWorkerConfig {
  /** Database URL */
  databaseUrl: string;
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Google API key for LLM and TTS - required */
  geminiApiKey: string;
  /** Storage configuration */
  storageConfig: StorageConfig;
  /** Max consecutive errors before exiting (default: 10) */
  maxConsecutiveErrors?: number;
}

/**
 * Create and start the podcast generation worker.
 * Polls the queue for generate-podcast jobs and processes them.
 */
export const createPodcastWorker = (config: PodcastWorkerConfig) => {
  const pollInterval = config.pollInterval ?? 5000;
  const maxConsecutiveErrors = config.maxConsecutiveErrors ?? 10;

  // Create database connection
  const db = createDb({ databaseUrl: config.databaseUrl });

  // Build base layers for worker (without user-specific context)
  const dbLayer = DbLive(db);
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const ttsLayer = GoogleTTSLive({ apiKey: config.geminiApiKey });

  // Select storage provider based on config
  const storageLayer =
    config.storageConfig.provider === 'filesystem'
      ? FilesystemStorageLive({
          basePath: config.storageConfig.basePath,
          baseUrl: config.storageConfig.baseUrl,
        })
      : config.storageConfig.provider === 's3'
        ? S3StorageLive({
            bucket: config.storageConfig.bucket,
            region: config.storageConfig.region,
            accessKeyId: config.storageConfig.accessKeyId,
            secretAccessKey: config.storageConfig.secretAccessKey,
            endpoint: config.storageConfig.endpoint,
          })
        : DatabaseStorageLive.pipe(Layer.provide(dbLayer));

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
   * Process a single job.
   */
  const processJob = (job: Job<GeneratePodcastPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(
        `Processing job ${job.id} for podcast ${job.payload.podcastId}`,
      );

      // Create a dedicated runtime for this job with user context
      const jobRuntime = makeJobRuntime(job.payload.userId);

      // Run the handler with the job-specific runtime
      // Use tryPromise to properly convert rejections into Effect failures
      const result = yield* Effect.tryPromise({
        try: () => jobRuntime.runPromise(handleGeneratePodcast(job)),
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

  /**
   * Poll for and process the next job.
   */
  const pollOnce = Effect.gen(function* () {
    const queue = yield* Queue;

    const job = yield* queue.processNextJob('generate-podcast', (j) =>
      processJob(j as Job<GeneratePodcastPayload>),
    );

    if (job) {
      yield* Effect.logInfo(
        `Finished processing job ${job.id}, status: ${job.status}`,
      );
    } else {
      yield* Effect.logInfo('No pending jobs found');
    }

    return job;
  }).pipe(Effect.annotateLogs('worker', 'PodcastWorker'));

  /**
   * Start the worker loop with error handling and backoff.
   */
  const start = async () => {
    // Retry schedule: exponential backoff starting at pollInterval, capped at 60s, max retries
    const retrySchedule = Schedule.exponential(pollInterval, 2).pipe(
      Schedule.union(Schedule.spaced(60000)), // Use min of exponential or 60s (caps the backoff)
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
      return yield* processJob(job as Job<GeneratePodcastPayload>);
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
