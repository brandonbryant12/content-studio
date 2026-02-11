import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { logActivity } from './use-cases/log-activity';
import { ActivityLogRepo } from './repos/activity-log-repo';

/**
 * Log an entity activity using the current user from FiberRef.
 * Failures are silently swallowed so logging never breaks the main flow.
 */
export const logEntityActivity = (
  action: string,
  entityType: string,
  entityId?: string | null,
  entityTitle?: string | null,
  metadata?: Record<string, unknown> | null,
) =>
  Effect.gen(function* () {
    const user = yield* getCurrentUser;
    yield* logActivity({
      userId: user.id,
      action,
      entityType,
      entityId,
      entityTitle,
      metadata,
    });
  }).pipe(
    Effect.catchAll(() => Effect.void),
    Effect.withSpan('logEntityActivity', {
      attributes: {
        'activity.action': action,
        'activity.entityType': entityType,
      },
    }),
  );

/**
 * Update the entityTitle on all activity log entries for a given entity.
 * Failures are silently swallowed so syncing never breaks the main flow.
 */
export const syncEntityTitle = (entityId: string, title: string) =>
  Effect.gen(function* () {
    const repo = yield* ActivityLogRepo;
    yield* repo.updateEntityTitle(entityId, title);
  }).pipe(
    Effect.catchAll(() => Effect.void),
    Effect.withSpan('syncEntityTitle', {
      attributes: { 'activity.entityId': entityId },
    }),
  );
