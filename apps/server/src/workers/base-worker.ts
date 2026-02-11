import {
  createServerRuntime,
  type StorageConfig,
  type ServerRuntime,
  type SharedServices,
} from '@repo/api/server';
import { Role, type User } from '@repo/auth/policy';
import { createDb } from '@repo/db/client';
import { Queue, JobProcessingError, type Job, type JobType } from '@repo/queue';
import { Deferred, Effect, Fiber, Ref, Schedule } from 'effect';
import type { AIProvider, VertexAIConfig } from '@repo/ai';
import type { JobId } from '@repo/db/schema';
import { WORKER_DEFAULTS } from '../constants';

export interface BaseWorkerConfig {
  pollInterval?: number;
  maxConsecutiveErrors?: number;
  runtime?: ServerRuntime;
  databaseUrl?: string;
  aiProvider?: AIProvider;
  geminiApiKey?: string;
  vertexConfig?: VertexAIConfig;
  storageConfig?: StorageConfig;
  useMockAI?: boolean;
}

export interface Worker {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  processJobById: (jobId: string) => Promise<void>;
  runtime: ServerRuntime;
}

export const makeJobUser = (userId: string): User => ({
  id: userId,
  email: '',
  name: 'Worker',
  role: Role.USER,
});

export const createRetrySchedule = (
  pollInterval: number,
  maxConsecutiveErrors: number,
) =>
  Schedule.exponential(pollInterval, 2).pipe(
    Schedule.union(Schedule.spaced(WORKER_DEFAULTS.BACKOFF_CAP_MS)),
    Schedule.intersect(Schedule.recurs(maxConsecutiveErrors - 1)),
  );

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

export interface CreateWorkerOptions<
  TPayload,
  R extends SharedServices = SharedServices,
> {
  name: string;
  jobTypes: JobType[];
  config: BaseWorkerConfig;
  processJob: (
    job: Job<TPayload>,
  ) => Effect.Effect<void, JobProcessingError, R>;
  onJobComplete?: (job: Job<TPayload>) => void;
}

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

  let runtime: ServerRuntime;
  if (config.runtime) {
    runtime = config.runtime;
  } else {
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
      console.warn(`[${name}] Using mock AI layers for testing`);
    }
  }

  const IDLE_SUMMARY_INTERVAL = Math.max(1, Math.round(60_000 / pollInterval));

  let shutdownDeferred: Deferred.Deferred<void> | null = null;
  let loopFiber: Fiber.RuntimeFiber<void, unknown> | null = null;

  const pollOnce = (idleCount: Ref.Ref<number>) =>
    Effect.gen(function* () {
      const queue = yield* Queue;

      for (const jobType of jobTypes) {
        const result = yield* queue
          .processNextJob(jobType, (j) => processJob(j as Job<TPayload>))
          .pipe(
            Effect.catchAll((err) =>
              Effect.logWarning(
                `Error polling ${jobType}: ${err instanceof Error ? err.message : String(err)}`,
              ).pipe(Effect.map(() => null)),
            ),
            Effect.catchAllDefect((defect) =>
              Effect.logWarning(
                `Defect polling ${jobType}: ${defect instanceof Error ? defect.message : String(defect)}`,
              ).pipe(Effect.map(() => null)),
            ),
          );

        if (result) {
          yield* Ref.set(idleCount, 0);
          yield* Effect.logInfo(
            `Finished processing ${result.type} job ${result.id}, status: ${result.status}`,
          );
          onJobComplete?.(result as Job<TPayload>);
          return result;
        }
      }

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

  const start = async () => {
    const retrySchedule = createRetrySchedule(
      pollInterval,
      maxConsecutiveErrors,
    );

    const loop = Effect.gen(function* () {
      const idleCount = yield* Ref.make(0);
      const stopSignal = yield* Deferred.make<void>();
      shutdownDeferred = stopSignal;

      yield* Effect.logInfo(
        `Starting ${name}, polling every ${pollInterval}ms`,
      );

      yield* pollOnce(idleCount).pipe(
        Effect.catchAllDefect((defect) =>
          Effect.logError(
            `${name} caught defect during poll: ${defect instanceof Error ? defect.message : String(defect)}`,
          ),
        ),
        Effect.tap(() =>
          Effect.raceFirst(
            Effect.sleep(pollInterval),
            Deferred.await(stopSignal),
          ),
        ),
        Effect.tap(() =>
          Deferred.isDone(stopSignal).pipe(
            Effect.flatMap((done) =>
              done
                ? Effect.logInfo(`${name} received stop signal, exiting`).pipe(
                    Effect.flatMap(() => Effect.interrupt),
                  )
                : Effect.void,
            ),
          ),
        ),
        Effect.forever,
      );
    }).pipe(
      Effect.annotateLogs('worker', name),
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

    const fiber = await runtime
      .runPromise(
        Effect.forkDaemon(loop).pipe(
          Effect.tap((f) =>
            Effect.sync(() => {
              loopFiber = f;
            }),
          ),
        ),
      )
      .catch((err) => {
        console.error(`[${name}] Failed to fork poll loop:`, err);
        throw err;
      });

    await runtime.runPromise(Fiber.join(fiber)).catch(() => {
      // Interruption is expected during shutdown
    });
  };

  const stop = async () => {
    if (shutdownDeferred) {
      await runtime.runPromise(
        Deferred.complete(shutdownDeferred, Effect.void),
      );
    }
    if (loopFiber) {
      await runtime.runPromise(Fiber.interrupt(loopFiber)).catch(() => {
        // Expected — interruption resolves with Exit.interrupt
      });
    }
  };

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
    stop,
    processJobById,
    runtime,
  };
};
