import { Effect, FiberRef, Option } from 'effect';
import { UnauthorizedError } from '../errors';
import type { User } from './types';

export type { User } from './types';

/**
 * FiberRef holding the current user context.
 * - Option.none() = unauthenticated request
 * - Option.some(user) = authenticated request with user
 *
 * This is set per-request via Effect.locally in handlers/workers.
 */
export const CurrentUserRef: FiberRef.FiberRef<Option.Option<User>> =
  FiberRef.unsafeMake<Option.Option<User>>(Option.none());

/**
 * Get the current user. Fails with UnauthorizedError if not authenticated.
 * Use this in protected routes/services that require authentication.
 *
 * @example
 * ```typescript
 * const user = yield* getCurrentUser;
 * ```
 */
export const getCurrentUser: Effect.Effect<User, UnauthorizedError> = Effect.gen(
  function* () {
    const maybeUser = yield* FiberRef.get(CurrentUserRef);
    return yield* Option.match(maybeUser, {
      onNone: () =>
        Effect.fail(
          new UnauthorizedError({ message: 'Authentication required' }),
        ),
      onSome: (user) => Effect.succeed(user),
    });
  },
);

/**
 * Get the current user as Option. Never fails.
 * Use this in public routes that may optionally have authentication.
 *
 * @example
 * ```typescript
 * const maybeUser = yield* getMaybeCurrentUser;
 * if (Option.isSome(maybeUser)) {
 *   // User is authenticated
 * }
 * ```
 */
export const getMaybeCurrentUser: Effect.Effect<Option.Option<User>> =
  FiberRef.get(CurrentUserRef);

/**
 * Run an effect with a specific user context.
 * Uses Effect.locally to scope the user to the effect's fiber tree.
 *
 * @example
 * ```typescript
 * // In request handler
 * yield* withCurrentUser(sessionUser)(myEffect);
 *
 * // In worker
 * yield* withCurrentUser({ id: job.userId, ... })(processJob);
 * ```
 */
export const withCurrentUser =
  (user: User) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.locally(CurrentUserRef, Option.some(user))(effect);
