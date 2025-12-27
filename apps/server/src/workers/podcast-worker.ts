import { GoogleLive } from '@repo/ai/llm';
import { GoogleTTSLive } from '@repo/ai/tts';
import { createStorageLayer, type StorageConfig } from '@repo/api/server';
import { CurrentUserLive, Role } from '@repo/auth-policy';
import { DatabasePolicyLive } from '@repo/auth-policy/providers/database';
import { createDb } from '@repo/db/client';
import { DbLive } from '@repo/effect/db';
import {
  DocumentsLive,
  PodcastRepoLive,
  ScriptVersionRepoLive,
} from '@repo/media';
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
import { MockLLMLive, MockTTSLive } from '@repo/testing/mocks';
import { Effect, Layer, Schedule, ManagedRuntime, Logger } from 'effect';
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
 */
export const createPodcastWorker = (config: PodcastWorkerConfig) => {
  const pollInterval = config.pollInterval ?? WORKER_DEFAULTS.POLL_INTERVAL_MS;
  const maxConsecutiveErrors =
    config.maxConsecutiveErrors ?? WORKER_DEFAULTS.MAX_CONSECUTIVE_ERRORS;

  // Create database connection
  const db = createDb({ databaseUrl: config.databaseUrl });

  // Build base layers for worker (without user-specific context)
  const dbLayer = DbLive(db);
  const queueLayer = QueueLive.pipe(Layer.provide(dbLayer));
  const policyLayer = DatabasePolicyLive.pipe(Layer.provide(dbLayer));
  const storageLayer = createStorageLayer(config.storageConfig, dbLayer);

  // Use mock AI layers for testing, real Google layers for production
  const ttsLayer = config.useMockAI
    ? MockTTSLive
    : GoogleTTSLive({ apiKey: config.geminiApiKey });
  const llmLayer = config.useMockAI
    ? MockLLMLive
    : GoogleLive({ apiKey: config.geminiApiKey });

  if (config.useMockAI) {
    console.log('[Worker] Using mock AI layers for testing');
  }

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

    // Repos only need Db
    const podcastRepoLayer = PodcastRepoLive.pipe(Layer.provide(dbLayer));
    const scriptVersionRepoLayer = ScriptVersionRepoLive.pipe(
      Layer.provide(dbLayer),
    );

    // Combine all layers needed for the handlers
    const allLayers = Layer.mergeAll(
      dbLayer,
      userLayer,
      ttsLayer,
      storageLayer,
      llmLayer,
      documentsLayerWithUser,
      queueLayer,
      policyLayer,
      podcastRepoLayer,
      scriptVersionRepoLayer,
      loggerLayer,
    );

    return ManagedRuntime.make(allLayers);
  };

  /**
   * Process a single job based on its type.
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
        throw new Error(`Unknown job type: ${job.type}`);
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
