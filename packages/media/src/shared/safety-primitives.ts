import { getCurrentUser, Role } from '@repo/auth/policy';
import { Db } from '@repo/db/effect';
import { Queue, JobNotFoundError } from '@repo/queue';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import type { DatabaseInstance } from '@repo/db/client';
import type { JobId } from '@repo/db/schema';
import type { JobType } from '@repo/queue';
import { calculateWordCount } from './text-utils';

/**
 * Run an effect with a compensating action if it fails.
 * The compensation itself is best-effort and must not mask the original error.
 */
export const withCompensatingAction = <A, E, R, RC>(
  effect: Effect.Effect<A, E, R>,
  compensate: (error: E) => Effect.Effect<unknown, unknown, RC>,
): Effect.Effect<A, E, R | RC> =>
  effect.pipe(
    Effect.catchAll((error) =>
      compensate(error).pipe(
        Effect.catchAll(() => Effect.void),
        Effect.zipRight(Effect.fail(error)),
      ),
    ),
  );

const supportsTransactions = (
  db: DatabaseInstance,
): db is DatabaseInstance & {
  transaction: DatabaseInstance['transaction'];
} => typeof db.transaction === 'function';

/**
 * Run state changes and enqueue in one database transaction when available.
 * Falls back to compensating action mode in mocked/non-transactional test setups.
 */
export const withTransactionalStateAndEnqueue = <A, E, R, RC>(
  effect: Effect.Effect<A, E, R>,
  compensate: (error: E) => Effect.Effect<unknown, unknown, RC>,
): Effect.Effect<A, E, R | RC | Db> =>
  Effect.gen(function* () {
    const { db } = yield* Db;
    if (!supportsTransactions(db)) {
      return yield* withCompensatingAction(effect, compensate);
    }

    const context = yield* Effect.context<R | Db>();
    return yield* Effect.tryPromise({
      try: () =>
        db.transaction((tx) =>
          Effect.runPromise(
            effect.pipe(
              Effect.provide(context),
              Effect.provideService(Db, {
                db: tx as unknown as DatabaseInstance,
              }),
            ),
          ),
        ),
      catch: (cause) => cause as E,
    });
  });

/**
 * Convert unknown errors to a useful string for user-visible failure fields.
 */
export const formatUnknownError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
};

/**
 * Fetch a job while enforcing owner-or-admin access.
 * Non-owner access is returned as "not found" to avoid existence leaks.
 */
export const getOwnedJobOrNotFound = (jobId: JobId) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    const queue = yield* Queue;
    const job = yield* queue.getJob(jobId);

    if (user.role !== Role.ADMIN && job.createdBy !== user.id) {
      return yield* Effect.fail(new JobNotFoundError({ jobId }));
    }

    return job;
  });

export interface EnqueueJobInput {
  type: JobType;
  payload: unknown;
  userId: string;
}

/**
 * Enqueue through a single primitive so use-cases don't call queue.enqueue directly.
 */
export const enqueueJob = (input: EnqueueJobInput) =>
  Effect.gen(function* () {
    const queue = yield* Queue;
    return yield* queue.enqueue(input.type, input.payload, input.userId);
  });

export interface ReplaceTextContentSafelyInput<A, E, R> {
  previousContentKey: string;
  content: string;
  persist: (input: {
    contentKey: string;
    wordCount: number;
  }) => Effect.Effect<A, E, R>;
}

/**
 * Replace text content in storage without data-loss windows:
 * 1) upload new bytes
 * 2) persist pointer in DB
 * 3) best-effort cleanup old bytes
 * On DB failure, delete the newly uploaded key.
 */
export const replaceTextContentSafely = <A, E, R>(
  input: ReplaceTextContentSafelyInput<A, E, R>,
) =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    const contentBuffer = Buffer.from(input.content, 'utf-8');
    const newContentKey = `documents/${crypto.randomUUID()}.txt`;

    yield* storage.upload(newContentKey, contentBuffer, 'text/plain');

    const persisted = yield* input
      .persist({
        contentKey: newContentKey,
        wordCount: calculateWordCount(input.content),
      })
      .pipe(
        Effect.catchAll((error) =>
          storage.delete(newContentKey).pipe(
            Effect.ignore,
            Effect.zipRight(Effect.fail(error)),
          ),
        ),
      );

    yield* storage.delete(input.previousContentKey).pipe(Effect.ignore);

    return persisted;
  });
