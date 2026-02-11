import { eq, and, asc, inArray, sql } from '@repo/db';
import { Db } from '@repo/db/effect';
import type { DatabaseInstance } from '@repo/db/client';
import {
  job,
  type JobId,
  JobStatus,
  JobType as JobTypeConst,
} from '@repo/db/schema';
import { Effect, Layer } from 'effect';
import type { Job, JobType, JobStatus as JobStatusType } from './types';
import { QueueError, JobNotFoundError, JobProcessingError } from './errors';
import { Queue, type QueueService } from './service';

const makeQueueService = Effect.gen(function* () {
  const { db } = yield* Db;

  const runQuery = <A>(
    name: string,
    fn: () => Promise<A>,
    errorMessage: string,
  ): Effect.Effect<A, QueueError> =>
    Effect.tryPromise({
      try: fn,
      catch: (cause) =>
        new QueueError({
          message: `${errorMessage}: ${cause instanceof Error ? cause.message : String(cause)}`,
          cause,
        }),
    }).pipe(
      Effect.withSpan(`queue.${name}`, {
        attributes: { 'queue.system': 'database' },
      }),
    );

  const enqueue: QueueService['enqueue'] = (type, payload, userId) =>
    runQuery(
      'enqueue',
      async () => {
        const [row] = await db
          .insert(job)
          .values({
            type,
            payload: payload as Record<string, unknown>,
            createdBy: userId,
          })
          .returning();

        if (!row) {
          throw new Error('Failed to insert job');
        }

        return mapRowToJob(row);
      },
      'Failed to enqueue job',
    ).pipe(Effect.tap((j) => Effect.annotateCurrentSpan('queue.job.id', j.id)));

  const getJob: QueueService['getJob'] = (jobId) =>
    runQuery(
      'getJob',
      async () => {
        const [row] = await db
          .select()
          .from(job)
          .where(eq(job.id, jobId))
          .limit(1);
        return row;
      },
      'Failed to get job',
    ).pipe(
      Effect.tap(() => Effect.annotateCurrentSpan('queue.job.id', jobId)),
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(mapRowToJob(row))
          : Effect.fail(new JobNotFoundError({ jobId })),
      ),
    );

  const getJobsByUser: QueueService['getJobsByUser'] = (userId, type) =>
    runQuery(
      'getJobsByUser',
      async () => {
        const conditions = [eq(job.createdBy, userId)];
        if (type) {
          conditions.push(eq(job.type, type));
        }

        const rows = await db
          .select()
          .from(job)
          .where(and(...conditions))
          .orderBy(asc(job.createdAt));

        return rows.map(mapRowToJob);
      },
      'Failed to get jobs',
    ).pipe(
      Effect.tap(() => Effect.annotateCurrentSpan('queue.user.id', userId)),
    );

  const updateJobStatus: QueueService['updateJobStatus'] = (
    jobId,
    status,
    result,
    error,
  ) =>
    runQuery(
      'updateJobStatus',
      async () => {
        const updates: Record<string, unknown> = {
          status,
          updatedAt: new Date(),
        };

        if (status === JobStatus.PROCESSING) {
          updates.startedAt = new Date();
        }
        if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
          updates.completedAt = new Date();
        }
        if (result !== undefined) {
          updates.result = result as Record<string, unknown>;
        }
        if (error !== undefined) {
          updates.error = error;
        }

        const [row] = await db
          .update(job)
          .set(updates)
          .where(eq(job.id, jobId))
          .returning();

        return row;
      },
      'Failed to update job',
    ).pipe(
      Effect.tap(() => Effect.annotateCurrentSpan('queue.job.id', jobId)),
      Effect.tap(() => Effect.annotateCurrentSpan('queue.job.status', status)),
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(mapRowToJob(row))
          : Effect.fail(new JobNotFoundError({ jobId })),
      ),
    );

  const executeHandler = <R>(
    jobData: Job,
    handler: (job: Job) => Effect.Effect<unknown, JobProcessingError, R>,
  ) =>
    updateJobStatus(jobData.id, JobStatus.PROCESSING).pipe(
      Effect.flatMap((updatedJob) =>
        handler(updatedJob).pipe(
          Effect.flatMap((result) =>
            updateJobStatus(updatedJob.id, JobStatus.COMPLETED, result),
          ),
          Effect.catchAll((err) =>
            updateJobStatus(
              updatedJob.id,
              JobStatus.FAILED,
              undefined,
              err instanceof JobProcessingError ? err.message : String(err),
            ),
          ),
          Effect.catchAllDefect((defect) =>
            updateJobStatus(
              updatedJob.id,
              JobStatus.FAILED,
              undefined,
              `Unexpected defect: ${defect instanceof Error ? defect.message : String(defect)}`,
            ),
          ),
        ),
      ),
    );

  const claimNextJob = (type: JobType): Effect.Effect<Job | null, QueueError> =>
    runQuery(
      'claimNextJob',
      async () => {
        const result = await (db as DatabaseInstance).execute(sql`
          UPDATE ${job}
          SET "status" = ${JobStatus.PROCESSING},
              "startedAt" = NOW(),
              "updatedAt" = NOW()
          WHERE ${job.id} = (
            SELECT ${job.id} FROM ${job}
            WHERE ${job.type} = ${type}
              AND ${job.status} = ${JobStatus.PENDING}
            ORDER BY ${job.createdAt} ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          )
          RETURNING *
        `);

        const row = result.rows[0];
        return row ? mapRowToJob(row as typeof job.$inferSelect) : null;
      },
      'Failed to claim next job',
    ).pipe(
      Effect.tap(() => Effect.annotateCurrentSpan('queue.job.type', type)),
    );

  const processNextJob: QueueService['processNextJob'] = (type, handler) =>
    claimNextJob(type).pipe(
      Effect.flatMap((claimed) => {
        if (!claimed) return Effect.succeed(null);
        return handler(claimed).pipe(
          Effect.flatMap((result) =>
            updateJobStatus(claimed.id, JobStatus.COMPLETED, result),
          ),
          Effect.catchAll((err) =>
            updateJobStatus(
              claimed.id,
              JobStatus.FAILED,
              undefined,
              err instanceof JobProcessingError ? err.message : String(err),
            ),
          ),
          Effect.catchAllDefect((defect) =>
            updateJobStatus(
              claimed.id,
              JobStatus.FAILED,
              undefined,
              `Unexpected defect: ${defect instanceof Error ? defect.message : String(defect)}`,
            ),
          ),
        );
      }),
    );

  const processJobById: QueueService['processJobById'] = (jobId, handler) =>
    getJob(jobId).pipe(
      Effect.flatMap((jobData) => {
        if (jobData.status !== JobStatus.PENDING)
          return Effect.succeed(jobData);
        return executeHandler(jobData, handler);
      }),
    );

  const findPendingJobForPodcast: QueueService['findPendingJobForPodcast'] = (
    podcastId,
  ) =>
    runQuery(
      'findPendingJobForPodcast',
      async () => {
        const [row] = await db
          .select()
          .from(job)
          .where(
            and(
              eq(job.type, JobTypeConst.GENERATE_PODCAST),
              inArray(job.status, [JobStatus.PENDING, JobStatus.PROCESSING]),
              sql`${job.payload}->>'podcastId' = ${podcastId}`,
            ),
          )
          .limit(1);

        return row ? mapRowToJob(row) : null;
      },
      'Failed to find pending job for podcast',
    ).pipe(
      Effect.tap(() => Effect.annotateCurrentSpan('podcast.id', podcastId)),
    );

  const findPendingJobForVoiceover: QueueService['findPendingJobForVoiceover'] =
    (voiceoverId) =>
      runQuery(
        'findPendingJobForVoiceover',
        async () => {
          const [row] = await db
            .select()
            .from(job)
            .where(
              and(
                eq(job.type, JobTypeConst.GENERATE_VOICEOVER),
                inArray(job.status, [JobStatus.PENDING, JobStatus.PROCESSING]),
                sql`${job.payload}->>'voiceoverId' = ${voiceoverId}`,
              ),
            )
            .limit(1);

          return row ? mapRowToJob(row) : null;
        },
        'Failed to find pending job for voiceover',
      ).pipe(
        Effect.tap(() =>
          Effect.annotateCurrentSpan('voiceover.id', voiceoverId),
        ),
      );

  const deleteJob: QueueService['deleteJob'] = (jobId) =>
    runQuery(
      'deleteJob',
      async () => {
        const result = await db
          .delete(job)
          .where(eq(job.id, jobId))
          .returning({ id: job.id });

        return result.length > 0;
      },
      'Failed to delete job',
    ).pipe(
      Effect.tap(() => Effect.annotateCurrentSpan('queue.job.id', jobId)),
      Effect.flatMap((deleted) =>
        deleted ? Effect.void : Effect.fail(new JobNotFoundError({ jobId })),
      ),
    );

  return {
    enqueue,
    getJob,
    getJobsByUser,
    updateJobStatus,
    processNextJob,
    processJobById,
    findPendingJobForPodcast,
    findPendingJobForVoiceover,
    deleteJob,
  } satisfies QueueService;
});

export const QueueLive: Layer.Layer<Queue, never, Db> = Layer.effect(
  Queue,
  makeQueueService,
);

function mapRowToJob(row: {
  id: JobId;
  type: string;
  status: JobStatusType;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): Job {
  return {
    ...row,
    type: row.type as JobType,
    payload: row.payload ?? {},
  };
}
