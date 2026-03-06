import {
  annotateAIUsageScope,
  inferAIUsageResourceType,
  withAIUsageScope,
} from '@repo/ai';
import { getCurrentUser, Role } from '@repo/auth/policy';
import { Db } from '@repo/db/effect';
import { Queue, JobNotFoundError } from '@repo/queue';
import { Storage } from '@repo/storage';
import { Effect } from 'effect';
import type { DatabaseInstance } from '@repo/db/client';
import type { JobId } from '@repo/db/schema';
import type { JobType } from '@repo/queue';
import { calculateWordCount } from './text-utils';

export const withUseCaseSpan =
  (name: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    withAIUsageScope({ operation: name })(Effect.withSpan(name)(effect));

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
  singleConnection?: boolean,
): db is DatabaseInstance & {
  transaction: DatabaseInstance['transaction'];
} =>
  typeof db.transaction === 'function' &&
  // Single-connection drivers (e.g. PGlite) deadlock when db.transaction()
  // locks the connection and other code (e.g. queue service) uses a
  // separately captured db reference inside the callback.
  !singleConnection;

/**
 * Run state changes and enqueue in one database transaction when available.
 * Falls back to compensating action mode in mocked/non-transactional test setups
 * and single-connection drivers (PGlite).
 */
export const withTransactionalStateAndEnqueue = <A, E, R, RC>(
  effect: Effect.Effect<A, E, R>,
  compensate: (error: E) => Effect.Effect<unknown, unknown, RC>,
): Effect.Effect<A, E, R | RC | Db> =>
  Effect.gen(function* () {
    const { db, singleConnection } = yield* Db;
    if (!supportsTransactions(db, singleConnection)) {
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

export type UseCaseSpanAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

export type UseCaseSpanResourceInput =
  | {
      resourceId: string;
      collection?: never;
    }
  | {
      collection: string;
      resourceId?: never;
    };

type UseCaseSpanBaseInput = UseCaseSpanResourceInput & {
  attributes?: UseCaseSpanAttributes;
};

type UseCaseSpanWithExplicitUser = UseCaseSpanBaseInput & {
  userId: string;
  useRequestContextUser?: false | undefined;
};

type UseCaseSpanWithRequestContextUser = UseCaseSpanBaseInput & {
  useRequestContextUser: true;
  userId?: never;
};

export type UseCaseSpanInput =
  | UseCaseSpanWithExplicitUser
  | UseCaseSpanWithRequestContextUser;

const normalizeSpanAttributes = (
  attributes: UseCaseSpanAttributes,
): Record<string, string | number | boolean | null> =>
  Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;

/**
 * Attach required attributes to use-case spans.
 */
export const annotateUseCaseSpan = (input: UseCaseSpanInput) =>
  Effect.gen(function* () {
    const userId =
      'userId' in input ? input.userId : (yield* getCurrentUser).id;
    const resourceType = inferAIUsageResourceType(input.attributes);
    const resourceAttributes =
      'resourceId' in input
        ? { 'resource.id': input.resourceId }
        : {
            'resource.kind': 'collection',
            'resource.name': input.collection,
          };

    const attributes = normalizeSpanAttributes({
      'user.id': userId,
      ...resourceAttributes,
      ...input.attributes,
    });

    yield* Effect.annotateCurrentSpan(attributes);
    yield* annotateAIUsageScope({
      userId,
      resourceId: 'resourceId' in input ? input.resourceId : undefined,
      resourceType,
    });
  });

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
    const newContentKey = `sources/${crypto.randomUUID()}.txt`;

    yield* storage.upload(newContentKey, contentBuffer, 'text/plain');

    const persisted = yield* input
      .persist({
        contentKey: newContentKey,
        wordCount: calculateWordCount(input.content),
      })
      .pipe(
        Effect.catchAll((error) =>
          storage
            .delete(newContentKey)
            .pipe(Effect.ignore, Effect.zipRight(Effect.fail(error))),
        ),
      );

    yield* storage.delete(input.previousContentKey).pipe(Effect.ignore);

    return persisted;
  });
