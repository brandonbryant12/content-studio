import { withCurrentUser, type User } from '@repo/auth/policy';
import { logEntityActivity, syncEntityTitle } from '@repo/media';
import { Effect } from 'effect';
import type { ServerRuntime } from '../runtime';

/**
 * Fire-and-forget activity logging helper for router handlers.
 * Runs the log effect outside the main request pipeline so it never
 * blocks or fails the response.
 */
export const logActivity = (
  runtime: ServerRuntime,
  user: User | null,
  action: string,
  entityType: string,
  entityId?: string,
  entityTitle?: string,
) => {
  if (!user) return;
  runtime
    .runPromise(
      withCurrentUser(user)(
        logEntityActivity(action, entityType, entityId, entityTitle),
      ),
    )
    .catch((err) => {
      console.warn(
        '[ACTIVITY_LOG]',
        err instanceof Error ? err.message : String(err),
      );
    });
};

/**
 * Create an Effect.tap callback that fires activity logging without adding
 * service requirements to the pipeline. Schedules logging as a separate
 * runtime.runPromise call so it doesn't block or affect the response.
 *
 * Usage: `effect.pipe(tapLogActivity(runtime, user, 'created', 'document'))`
 */
export const tapLogActivity =
  (
    runtime: ServerRuntime,
    user: User | null,
    action: string,
    entityType: string,
    entityId?: string,
  ) =>
  <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    self.pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          const obj =
            result && typeof result === 'object'
              ? (result as Record<string, unknown>)
              : {};
          const id = entityId ?? ('id' in obj ? String(obj.id) : undefined);
          const title = 'title' in obj ? String(obj.title) : undefined;
          logActivity(runtime, user, action, entityType, id, title);
        }),
      ),
    );

/**
 * Fire-and-forget title sync for update handlers.
 * Keeps activity log entityTitle current when an entity's title changes.
 *
 * Usage: `effect.pipe(tapSyncTitle(runtime, user))`
 */
export const tapSyncTitle =
  (runtime: ServerRuntime, user: User | null) =>
  <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    self.pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          if (!user) return;
          const obj =
            result && typeof result === 'object'
              ? (result as Record<string, unknown>)
              : {};
          const id = 'id' in obj ? String(obj.id) : undefined;
          const title = 'title' in obj ? String(obj.title) : undefined;
          if (!id || !title) return;
          runtime
            .runPromise(withCurrentUser(user)(syncEntityTitle(id, title)))
            .catch((err) => {
              console.warn(
                '[TITLE_SYNC]',
                err instanceof Error ? err.message : String(err),
              );
            });
        }),
      ),
    );
