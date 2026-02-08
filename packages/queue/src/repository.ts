import { eq, and, asc, inArray, sql } from '@repo/db';
import { job, type JobId } from '@repo/db/schema';
import { Db } from '@repo/db/effect';
import { Effect, Layer } from 'effect';
import type { Job, JobType, JobStatus } from './types';
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

        if (status === 'processing') {
          updates.startedAt = new Date();
        }

        if (status === 'completed' || status === 'failed') {
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

  const processNextJob: QueueService['processNextJob'] = (type, handler) =>
    runQuery(
      'processNextJob',
      async () => {
        const [row] = await db
          .select()
          .from(job)
          .where(and(eq(job.type, type), eq(job.status, 'pending')))
          .orderBy(asc(job.createdAt))
          .limit(1);

        return row;
      },
      'Failed to fetch next job',
    ).pipe(
      Effect.tap(() => Effect.annotateCurrentSpan('queue.job.type', type)),
      Effect.flatMap((row) => {
        if (!row) {
          return Effect.succeed(null);
        }

        const jobData = mapRowToJob(row);

        return updateJobStatus(jobData.id, 'processing').pipe(
          Effect.flatMap((updatedJob) =>
            handler(updatedJob).pipe(
              Effect.flatMap((result) =>
                updateJobStatus(updatedJob.id, 'completed', result),
              ),
              Effect.catchAll((err) =>
                updateJobStatus(
                  updatedJob.id,
                  'failed',
                  undefined,
                  err instanceof JobProcessingError ? err.message : String(err),
                ),
              ),
              Effect.catchAllDefect((defect) =>
                updateJobStatus(
                  updatedJob.id,
                  'failed',
                  undefined,
                  `Unexpected defect: ${defect instanceof Error ? defect.message : String(defect)}`,
                ),
              ),
            ),
          ),
        );
      }),
    );

  const processJobById: QueueService['processJobById'] = (jobId, handler) =>
    getJob(jobId).pipe(
      Effect.flatMap((jobData) => {
        // Only process if job is still pending
        if (jobData.status !== 'pending') {
          return Effect.succeed(jobData);
        }

        return updateJobStatus(jobData.id, 'processing').pipe(
          Effect.flatMap((updatedJob) =>
            handler(updatedJob).pipe(
              Effect.flatMap((result) =>
                updateJobStatus(updatedJob.id, 'completed', result),
              ),
              Effect.catchAll((err) =>
                updateJobStatus(
                  updatedJob.id,
                  'failed',
                  undefined,
                  err instanceof JobProcessingError ? err.message : String(err),
                ),
              ),
              Effect.catchAllDefect((defect) =>
                updateJobStatus(
                  updatedJob.id,
                  'failed',
                  undefined,
                  `Unexpected defect: ${defect instanceof Error ? defect.message : String(defect)}`,
                ),
              ),
            ),
          ),
        );
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
              eq(job.type, 'generate-podcast'),
              inArray(job.status, ['pending', 'processing']),
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
                eq(job.type, 'generate-voiceover'),
                inArray(job.status, ['pending', 'processing']),
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
  status: 'pending' | 'processing' | 'completed' | 'failed';
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
    id: row.id,
    type: row.type as JobType,
    status: row.status as JobStatus,
    payload: row.payload ?? {},
    result: row.result,
    error: row.error,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}
