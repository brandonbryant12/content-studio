import { CurrentUserLive, Role } from '@repo/auth-policy';
import { DatabasePolicyLive } from '@repo/auth-policy/providers/database';
import { createDb } from '@repo/db/client';
import { DocumentsLive } from '@repo/documents';
import { DbLive } from '@repo/effect/db';
import { OpenAILive } from '@repo/llm';
import { PodcastsLive, PodcastGeneratorLive } from '@repo/podcast';
import { Queue, QueueLive, type GeneratePodcastPayload, type Job } from '@repo/queue';
import { DatabaseStorageLive } from '@repo/storage';
import { GoogleTTSLive } from '@repo/tts';
import { Effect, Layer, Schedule, ManagedRuntime } from 'effect';
import { handleGeneratePodcast } from './handlers';

export interface PodcastWorkerConfig {
  /** Database URL */
  databaseUrl: string;
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Google API key for TTS (optional, uses GEMINI_API_KEY env var if not provided) */
  googleApiKey?: string;
  /** OpenAI API key (optional, uses OPENAI_API_KEY env var if not provided) */
  openaiApiKey?: string;
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
  const ttsLayer = GoogleTTSLive({ apiKey: config.googleApiKey });
  const storageLayer = DatabaseStorageLive;
  const llmLayer = OpenAILive({ apiKey: config.openaiApiKey });
  // Runtime for queue polling (doesn't need user context or documents)
  const workerLayers = Layer.mergeAll(dbLayer, queueLayer, ttsLayer, storageLayer, policyLayer, llmLayer);
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

      try {
        // Run the handler with the job-specific runtime
        const result = yield* Effect.promise(() =>
          jobRuntime.runPromise(handleGeneratePodcast(job)),
        );

        yield* Effect.logInfo(`Job ${job.id} completed`);
        return result;
      } finally {
        // Clean up the job runtime
        yield* Effect.promise(() => jobRuntime.dispose());
      }
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
