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
  type GenerateVoiceoverPayload,
  type Job,
  type JobType,
} from '@repo/queue';
import { Effect, Schedule } from 'effect';
import * as fs from 'fs';
import type {
  EntityChangeEvent,
  JobCompletionEvent,
  VoiceoverJobCompletionEvent,
} from '@repo/api/contracts';
import { WORKER_DEFAULTS } from '../constants';
import { sseManager } from '../sse';
import {
  handleGeneratePodcast,
  handleGenerateScript,
  handleGenerateAudio,
  type HandlerOptions,
} from './handlers';
import { handleGenerateVoiceover } from './voiceover-handlers';

// Type union for all worker payloads
type WorkerPayload =
  | GeneratePodcastPayload
  | GenerateScriptPayload
  | GenerateAudioPayload
  | GenerateVoiceoverPayload;

// Type guards for job type discrimination
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

/**
 * Health check file path for Kubernetes liveness probes.
 * Worker writes timestamp to this file on each poll cycle.
 */
const HEALTH_CHECK_FILE = '/tmp/worker-health';

/**
 * Write health check timestamp for Kubernetes liveness probes.
 * Silently fails if unable to write (e.g., read-only filesystem).
 */
const writeHealthCheck = (): void => {
  try {
    fs.writeFileSync(HEALTH_CHECK_FILE, Date.now().toString());
  } catch {
    // Ignore errors - health check is optional
  }
};

export interface UnifiedWorkerConfig {
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
  /** Enable health check file writing (default: true) */
  enableHealthCheck?: boolean;
}

/**
 * Create and start the unified worker.
 * Polls the queue for all job types and processes them.
 *
 * Uses a single shared ManagedRuntime created at startup.
 * User context is scoped per job via FiberRef (withCurrentUser).
 */
export const createUnifiedWorker = (config: UnifiedWorkerConfig) => {
  const pollInterval = config.pollInterval ?? WORKER_DEFAULTS.POLL_INTERVAL_MS;
  const maxConsecutiveErrors =
    config.maxConsecutiveErrors ?? WORKER_DEFAULTS.MAX_CONSECUTIVE_ERRORS;
  const enableHealthCheck = config.enableHealthCheck ?? true;

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
    console.log('[UnifiedWorker] Using mock AI layers for testing');
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
   * Emit SSE event to notify frontend of podcast entity change.
   * Fire-and-forget: SSE notifications are not critical path.
   */
  const emitPodcastEntityChange = (userId: string, podcastId: string) => {
    const entityChangeEvent: EntityChangeEvent = {
      type: 'entity_change',
      entityType: 'podcast',
      changeType: 'update',
      entityId: podcastId,
      userId,
      timestamp: new Date().toISOString(),
    };
    sseManager.emit(userId, entityChangeEvent).catch((err) => {
      console.error('[UnifiedWorker] Failed to emit SSE event:', err);
    });
  };

  /**
   * Emit SSE event to notify frontend of voiceover entity change.
   * Fire-and-forget: SSE notifications are not critical path.
   */
  const emitVoiceoverEntityChange = (userId: string, voiceoverId: string) => {
    const entityChangeEvent: EntityChangeEvent = {
      type: 'entity_change',
      entityType: 'voiceover',
      changeType: 'update',
      entityId: voiceoverId,
      userId,
      timestamp: new Date().toISOString(),
    };
    sseManager.emit(userId, entityChangeEvent).catch((err) => {
      console.error('[UnifiedWorker] Failed to emit SSE event:', err);
    });
  };

  /**
   * Process a single job based on its type.
   * User context is scoped via FiberRef for the duration of the job.
   */
  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Processing ${job.type} job ${job.id}`);

      // Create user context for this job
      const user = makeJobUser(job.payload.userId);
      const { userId } = job.payload;

      // Handler options with progress callbacks for podcast jobs
      const handlerOptions: HandlerOptions = {
        onScriptComplete: (podcastId) => {
          // Emit SSE event so frontend can fetch the script while audio generates
          emitPodcastEntityChange(userId, podcastId);
          console.log(
            `[UnifiedWorker] Script complete for ${podcastId}, emitted SSE event`,
          );
        },
      };

      // Run the appropriate handler with user context scoped via FiberRef
      if (isGeneratePodcastJob(job)) {
        yield* withCurrentUser(user)(
          handleGeneratePodcast(job, handlerOptions),
        );
      } else if (isGenerateScriptJob(job)) {
        yield* withCurrentUser(user)(handleGenerateScript(job));
      } else if (isGenerateAudioJob(job)) {
        yield* withCurrentUser(user)(handleGenerateAudio(job));
      } else if (isGenerateVoiceoverJob(job)) {
        yield* withCurrentUser(user)(handleGenerateVoiceover(job));
      }

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
      Effect.annotateLogs('worker', 'UnifiedWorker'),
    );

  // All job types this worker handles
  const JOB_TYPES: JobType[] = [
    'generate-podcast',
    'generate-script',
    'generate-audio',
    'generate-voiceover',
  ];

  /**
   * Poll for and process the next job from any of the supported types.
   */
  const pollOnce = Effect.gen(function* () {
    const queue = yield* Queue;

    // Write health check file at the start of each poll
    if (enableHealthCheck) {
      writeHealthCheck();
    }

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

        // Handle podcast-related jobs
        if (
          job.type === 'generate-podcast' ||
          job.type === 'generate-script' ||
          job.type === 'generate-audio'
        ) {
          const podcastPayload = payload as
            | GeneratePodcastPayload
            | GenerateScriptPayload
            | GenerateAudioPayload;
          const podcastId = podcastPayload.podcastId;

          // Emit job completion event (fire-and-forget)
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
          sseManager.emit(userId, jobCompletionEvent).catch((err) => {
            console.error('[UnifiedWorker] Failed to emit SSE event:', err);
          });

          // Emit entity change event for the podcast
          emitPodcastEntityChange(userId, podcastId);
        }

        // Handle voiceover jobs
        if (job.type === 'generate-voiceover') {
          const voiceoverPayload = payload as GenerateVoiceoverPayload;
          const { voiceoverId } = voiceoverPayload;

          // Emit job completion event (fire-and-forget)
          const jobCompletionEvent: VoiceoverJobCompletionEvent = {
            type: 'voiceover_job_completion',
            jobId: job.id,
            jobType: 'generate-voiceover',
            status: job.status === 'completed' ? 'completed' : 'failed',
            voiceoverId,
            error: job.error ?? undefined,
          };
          sseManager.emit(userId, jobCompletionEvent).catch((err) => {
            console.error('[UnifiedWorker] Failed to emit SSE event:', err);
          });

          // Emit entity change event for the voiceover
          emitVoiceoverEntityChange(userId, voiceoverId);
        }

        yield* Effect.logInfo(
          `Emitted SSE events for job ${job.id} to user ${userId}`,
        );

        return job;
      }
    }

    yield* Effect.logInfo('No pending jobs found');
    return null;
  }).pipe(Effect.annotateLogs('worker', 'UnifiedWorker'));

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
        `Starting unified worker, polling every ${pollInterval}ms`,
      );
      yield* Effect.logInfo(`Handling job types: ${JOB_TYPES.join(', ')}`);

      // Main polling loop - runs forever on success
      yield* pollOnce.pipe(
        Effect.tap(() => Effect.sleep(pollInterval)),
        Effect.forever,
      );
    }).pipe(
      Effect.annotateLogs('worker', 'UnifiedWorker'),
      // Retry the entire loop with backoff on infrastructure errors
      Effect.retry({
        schedule: retrySchedule,
        while: (error) => {
          Effect.runSync(
            Effect.logWarning(`Unified worker error, will retry...`).pipe(
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
