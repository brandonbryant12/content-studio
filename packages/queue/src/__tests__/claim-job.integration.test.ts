import { eq } from '@repo/db';
import { job, JobStatus, JobType, user } from '@repo/db/schema';
import {
  createTestContext,
  createTestUser,
  resetAllFactories,
  type TestContext,
  type TestUser,
} from '@repo/testing';
import { Effect, Layer } from 'effect';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JobProcessingError } from '../errors';
import { STALE_JOB_MAX_AGE_MS } from '../job-timeouts';
import { QueueLive } from '../repository';
import { Queue } from '../service';

const insertTestUser = async (
  ctx: TestContext,
  testUser: TestUser,
): Promise<void> => {
  await ctx.db.insert(user).values({
    ...testUser,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

describe('Queue atomic job claim (integration)', () => {
  let ctx: TestContext;
  let queueLayer: Layer.Layer<Queue>;
  let testUser: TestUser;

  const runEffect = <A, E>(effect: Effect.Effect<A, E, Queue>) =>
    Effect.runPromise(effect.pipe(Effect.provide(queueLayer)));

  beforeEach(async () => {
    resetAllFactories();
    ctx = await createTestContext();
    queueLayer = QueueLive.pipe(Layer.provide(ctx.dbLayer));
    testUser = createTestUser();
    await insertTestUser(ctx, testUser);
  });

  afterEach(async () => {
    await ctx.rollback();
  });

  it('claims and processes a single pending job', async () => {
    const enqueued = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.enqueue(JobType.GENERATE_VOICEOVER, { test: true }, testUser.id),
      ),
    );

    expect(enqueued.status).toBe(JobStatus.PENDING);

    const result = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.processNextJob(JobType.GENERATE_VOICEOVER, (claimedJob) =>
          Effect.succeed({ processed: claimedJob.id }),
        ),
      ),
    );

    expect(result).not.toBeNull();
    expect(result!.status).toBe(JobStatus.COMPLETED);
  });

  it('returns null when no pending jobs exist', async () => {
    const result = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.processNextJob(JobType.GENERATE_VOICEOVER, () =>
          Effect.succeed({ done: true }),
        ),
      ),
    );

    expect(result).toBeNull();
  });

  it('marks job as FAILED when handler throws JobProcessingError', async () => {
    await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.enqueue(JobType.GENERATE_VOICEOVER, { fail: true }, testUser.id),
      ),
    );

    const result = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.processNextJob(JobType.GENERATE_VOICEOVER, (claimedJob) =>
          Effect.fail(
            new JobProcessingError({
              jobId: claimedJob.id,
              message: 'intentional test failure',
            }),
          ),
        ),
      ),
    );

    expect(result).not.toBeNull();
    expect(result!.status).toBe(JobStatus.FAILED);
    expect(result!.error).toBe('intentional test failure');
  });

  it('processes jobs in FIFO order', async () => {
    const first = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.enqueue(JobType.GENERATE_VOICEOVER, { order: 1 }, testUser.id),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.enqueue(JobType.GENERATE_VOICEOVER, { order: 2 }, testUser.id),
      ),
    );

    const processed = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.processNextJob(JobType.GENERATE_VOICEOVER, (claimedJob) =>
          Effect.succeed({ id: claimedJob.id }),
        ),
      ),
    );

    expect(processed!.id).toBe(first.id);
  });

  it('concurrent claims do not process the same job twice', async () => {
    await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.enqueue(
          JobType.GENERATE_VOICEOVER,
          { concurrent: true },
          testUser.id,
        ),
      ),
    );

    const [result1, result2] = await Promise.all([
      runEffect(
        Effect.flatMap(Queue, (q) =>
          q.processNextJob(JobType.GENERATE_VOICEOVER, (claimedJob) =>
            Effect.succeed({ worker: 'A', jobId: claimedJob.id }),
          ),
        ),
      ),
      runEffect(
        Effect.flatMap(Queue, (q) =>
          q.processNextJob(JobType.GENERATE_VOICEOVER, (claimedJob) =>
            Effect.succeed({ worker: 'B', jobId: claimedJob.id }),
          ),
        ),
      ),
    ]);

    const claimed = [result1, result2].filter((result) => result !== null);
    const missed = [result1, result2].filter((result) => result === null);

    expect(claimed).toHaveLength(1);
    expect(missed).toHaveLength(1);
    expect(claimed[0]!.status).toBe(JobStatus.COMPLETED);
  });

  it('preserves a stale failure when a handler completion arrives late', async () => {
    const enqueued = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.enqueue(
          JobType.PROCESS_RESEARCH,
          { sourceId: 'source-1', query: 'late result', userId: testUser.id },
          testUser.id,
        ),
      ),
    );

    await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.updateJobStatus(enqueued.id, JobStatus.PROCESSING),
      ),
    );

    await ctx.db
      .update(job)
      .set({
        updatedAt: new Date(Date.now() - STALE_JOB_MAX_AGE_MS - 1_000),
      })
      .where(eq(job.id, enqueued.id));

    const staleJobs = await runEffect(
      Effect.flatMap(Queue, (q) => q.failStaleJobs(STALE_JOB_MAX_AGE_MS)),
    );

    expect(staleJobs).toHaveLength(1);
    expect(staleJobs[0]?.status).toBe(JobStatus.FAILED);

    const lateCompletion = await runEffect(
      Effect.flatMap(Queue, (q) =>
        q.updateJobStatus(enqueued.id, JobStatus.COMPLETED, {
          deliveredLate: true,
        }),
      ),
    );

    expect(lateCompletion.status).toBe(JobStatus.FAILED);
    expect(lateCompletion.error).toContain('timed out');
    expect(lateCompletion.result).toBeNull();

    const reloaded = await runEffect(
      Effect.flatMap(Queue, (q) => q.getJob(enqueued.id)),
    );

    expect(reloaded.status).toBe(JobStatus.FAILED);
    expect(reloaded.result).toBeNull();
  });
});
