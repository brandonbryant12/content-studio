import { CurrentUserLive, Role } from '@repo/auth-policy';
import { DatabasePolicyLive } from '@repo/auth-policy/providers/database';
import { createDb } from '@repo/db/client';
import { DocumentsLive } from '@repo/documents';
import { DbLive } from '@repo/effect/db';
import { GoogleLive } from '@repo/llm';
import { PodcastsLive, PodcastGeneratorLive } from '@repo/podcast';
import { Queue, QueueLive, JobProcessingError, type GeneratePodcastPayload, type Job } from '@repo/queue';
import { DatabaseStorageLive } from '@repo/storage';
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
}

/**
 * Create and start the podcast generation worker.
 * Polls the queue for generate-podcast jobs and processes them.
 */
export const createPodcastWorker = (config: PodcastWorkerConfig) => {
  const pollInterval = config.pollInterval ?? 5000;

  // Create database connection
  const db = createDb({ databaseUrl: config.databaseUrl });

  // Build base layers for worker (without user-specific context)
  const dbLayer = DbLive(db);
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const ttsLayer = GoogleTTSLive({ apiKey: config.geminiApiKey });
  // DatabaseStorageLive requires Db for persistent storage
  const storageLayer = DatabaseStorageLive.pipe(Layer.provide(dbLayer));
  const llmLayer = GoogleLive({ apiKey: config.geminiApiKey });
  // Runtime for queue polling (doesn't need user context or documents)
  // Include pretty logger so Effect.logInfo etc. output to console
  const loggerLayer = Logger.pretty;
  const workerLayers = Layer.mergeAll(dbLayer, queueLayer, ttsLayer, storageLayer, policyLayer, llmLayer, loggerLayer);
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
      Layer.provide(Layer.mergeAll(dbLayer, userLayer, documentsLayerWithUser, llmLayer, ttsLayer, storageLayer)),
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
      yield* Effect.logInfo(`Processing job ${job.id} for podcast ${job.payload.podcastId}`);

      // Create a dedicated runtime for this job with user context
      const jobRuntime = makeJobRuntime(job.payload.userId);

      // Run the handler with the job-specific runtime
      // Use tryPromise to properly convert rejections into Effect failures
      const result = yield* Effect.tryPromise({
        try: () => jobRuntime.runPromise(handleGeneratePodcast(job)),
        catch: (error) => new JobProcessingError({
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
      yield* Effect.logInfo(`Finished processing job ${job.id}, status: ${job.status}`);
    } else {
      yield* Effect.logInfo('No pending jobs found');
    }

    return job;
  }).pipe(Effect.annotateLogs('worker', 'PodcastWorker'));

  /**
   * Start the worker loop.
   */
  const start = async () => {
    const loop = Effect.gen(function* () {
      yield* Effect.logInfo(`Starting worker, polling every ${pollInterval}ms`);

      yield* pollOnce.pipe(
        Effect.catchAll((error) =>
          Effect.logError('Error processing job').pipe(
            Effect.annotateLogs('error', String(error)),
            Effect.map(() => null),
          ),
        ),
        Effect.repeat(Schedule.spaced(pollInterval)),
      );
    }).pipe(Effect.annotateLogs('worker', 'PodcastWorker'));

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
