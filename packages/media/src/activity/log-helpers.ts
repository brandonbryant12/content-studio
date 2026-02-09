import { Effect } from 'effect';
import { getCurrentUser } from '@repo/auth/policy';
import { logActivity } from './use-cases/log-activity';

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
