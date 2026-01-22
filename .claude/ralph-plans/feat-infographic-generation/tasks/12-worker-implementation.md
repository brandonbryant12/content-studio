# Task 12: Worker Implementation

## Standards Checklist

Before starting implementation, read and understand:
- [ ] `apps/server/src/workers/podcast-worker.ts` - Reference worker
- [ ] `apps/server/src/workers/podcast-handlers.ts` - Reference handlers
- [ ] `apps/server/src/workers/voiceover-worker.ts` - Simpler reference

## Context

Workers poll the queue for pending jobs and process them. Key patterns:
- Single shared runtime created at startup
- User context scoped via FiberRef per job
- Exponential backoff on errors
- SSE events emitted on completion
- Tracing spans for observability

## Key Files

### Create New Files:
- `apps/server/src/workers/infographic-worker.ts`
- `apps/server/src/workers/infographic-handlers.ts`

### Modify Existing Files:
- `apps/server/src/index.ts` or startup script - Add worker startup

## Implementation Notes

### Worker (infographic-worker.ts)

```typescript
// apps/server/src/workers/infographic-worker.ts
import { Effect, Schedule, Layer } from 'effect';
import { type User, Role } from '@repo/auth';
import { withCurrentUser } from '@repo/auth/policy';
import { Queue, type Job, type JobType, JobProcessingError } from '@repo/queue';
import { createDb } from '@repo/db';
import { createServerRuntime, type ServerRuntime } from '../runtime';
import { sseManager } from '../sse';
import type {
  GenerateInfographicPayload,
  GenerateInfographicResult,
} from '@repo/queue/types';
import { handleGenerateInfographic } from './infographic-handlers';
import { WORKER_DEFAULTS } from '../constants';

export interface InfographicWorkerConfig {
  databaseUrl: string;
  geminiApiKey: string;
  storageConfig: StorageConfig;
  pollInterval?: number;
  maxConsecutiveErrors?: number;
  useMockAI?: boolean;
}

type WorkerPayload = GenerateInfographicPayload;

const JOB_TYPES: JobType[] = ['generate-infographic'];

export const createInfographicWorker = (config: InfographicWorkerConfig) => {
  const pollInterval = config.pollInterval ?? WORKER_DEFAULTS.POLL_INTERVAL_MS;
  const maxConsecutiveErrors =
    config.maxConsecutiveErrors ?? WORKER_DEFAULTS.MAX_CONSECUTIVE_ERRORS;

  // Create shared runtime
  const db = createDb({ databaseUrl: config.databaseUrl });
  const runtime: ServerRuntime = createServerRuntime({
    db,
    geminiApiKey: config.geminiApiKey,
    storageConfig: config.storageConfig,
    useMockAI: config.useMockAI,
  });

  // Create user context for job processing
  const makeJobUser = (userId: string): User => ({
    id: userId,
    email: '',
    name: 'InfographicWorker',
    role: Role.USER,
  });

  const processJob = (job: Job<WorkerPayload>) =>
    Effect.gen(function* () {
      yield* Effect.logInfo(`Processing ${job.type} job ${job.id}`);

      const user = makeJobUser(job.payload.userId);

      yield* withCurrentUser(user)(handleGenerateInfographic(job));

      yield* Effect.logInfo(`Job ${job.id} completed`);
    }).pipe(
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

  const pollOnce = Effect.gen(function* () {
    const queue = yield* Queue;

    for (const jobType of JOB_TYPES) {
      const job = yield* queue.processNextJob(jobType, (j) =>
        processJob(j as Job<WorkerPayload>),
      );

      if (job) {
        yield* Effect.logInfo(`Finished processing ${job.type} job ${job.id}`);

        const payload = job.payload as WorkerPayload;
        const { userId, infographicId } = payload;

        // Emit job completion event
        const jobCompletionEvent: JobCompletionEvent = {
          type: 'job_completion',
          jobId: job.id,
          jobType: job.type,
          status: job.status === 'completed' ? 'completed' : 'failed',
          infographicId,
          error: job.error ?? undefined,
        };
        sseManager.emit(userId, jobCompletionEvent);

        // Emit entity change event
        const entityChangeEvent: EntityChangeEvent = {
          type: 'entity_change',
          entityType: 'infographic',
          entityId: infographicId,
          changeType: job.status === 'completed' ? 'updated' : 'updated',
        };
        sseManager.emit(userId, entityChangeEvent);

        return job;
      }
    }

    return null;
  }).pipe(Effect.annotateLogs('worker', 'InfographicWorker'));

  const start = async () => {
    const retrySchedule = Schedule.exponential(pollInterval, 2).pipe(
      Schedule.union(Schedule.spaced(WORKER_DEFAULTS.BACKOFF_CAP_MS)),
      Schedule.intersect(Schedule.recurs(maxConsecutiveErrors - 1)),
    );

    const loop = Effect.gen(function* () {
      yield* Effect.logInfo(
        `Starting infographic worker, polling every ${pollInterval}ms`,
      );

      yield* pollOnce.pipe(
        Effect.tap(() => Effect.sleep(pollInterval)),
        Effect.forever,
      );
    }).pipe(
      Effect.annotateLogs('worker', 'InfographicWorker'),
      Effect.retry({ schedule: retrySchedule }),
    );

    await runtime.runPromise(loop);
  };

  const processJobById = async (jobId: string) => {
    const queue = await runtime.runPromise(Effect.flatMap(Queue, (q) => q.getJob(jobId)));
    await runtime.runPromise(processJob(queue as Job<WorkerPayload>));
  };

  return { start, processJobById, runtime };
};
```

### Handlers (infographic-handlers.ts)

```typescript
// apps/server/src/workers/infographic-handlers.ts
import { Effect } from 'effect';
import type { Job } from '@repo/queue';
import { JobProcessingError } from '@repo/queue';
import { generateInfographic } from '@repo/media/infographic';
import type {
  GenerateInfographicPayload,
  GenerateInfographicResult,
} from '@repo/queue/types';

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const handleGenerateInfographic = (
  job: Job<GenerateInfographicPayload>,
) =>
  Effect.gen(function* () {
    const { infographicId } = job.payload;

    const result = yield* generateInfographic({ infographicId });

    return {
      infographicId: result.infographicId,
      imageUrl: result.imageUrl,
    } satisfies GenerateInfographicResult;
  }).pipe(
    Effect.catchAll((error) => {
      const errorMessage = formatError(error);
      return Effect.fail(
        new JobProcessingError({
          jobId: job.id,
          message: `Failed to generate infographic: ${errorMessage}`,
          cause: error,
        }),
      );
    }),
    Effect.withSpan('worker.handleGenerateInfographic', {
      attributes: {
        'job.id': job.id,
        'job.type': job.type,
        'infographic.id': job.payload.infographicId,
      },
    }),
  );
```

### SSE Event Types

Add to SSE types if needed:

```typescript
interface JobCompletionEvent {
  type: 'job_completion';
  jobId: string;
  jobType: string;
  status: 'completed' | 'failed';
  infographicId?: string;
  error?: string;
}

interface EntityChangeEvent {
  type: 'entity_change';
  entityType: 'infographic' | 'podcast' | 'voiceover';
  entityId: string;
  changeType: 'created' | 'updated' | 'deleted';
}
```

### Startup Integration

Add worker to server startup or create separate process:

```typescript
// In apps/server/src/workers/index.ts or separate entry point
import { createInfographicWorker } from './infographic-worker';

export const startInfographicWorker = () => {
  const worker = createInfographicWorker({
    databaseUrl: process.env.DATABASE_URL!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    storageConfig: {
      // ... storage config
    },
  });

  worker.start().catch((error) => {
    console.error('Infographic worker failed:', error);
    process.exit(1);
  });
};
```

## Verification Log

<!-- Agent writes verification results here -->
