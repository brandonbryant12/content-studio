import { Effect } from 'effect';
import { ActivityLogRepo } from '../repos/activity-log-repo';
import type { ActivityLog } from '@repo/db/schema';

// =============================================================================
// Types
// =============================================================================

export interface LogActivityInput {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: Record<string, unknown> | null;
}

// =============================================================================
// Use Case
// =============================================================================

/**
 * Log an activity event.
 *
 * This is an internal use case called by handlers and workers.
 * No auth check needed — the caller provides the userId.
 */
export const logActivity = (input: LogActivityInput) =>
  Effect.gen(function* () {
    const repo = yield* ActivityLogRepo;

    const record: ActivityLog = yield* repo.insert({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityTitle: input.entityTitle,
      metadata: input.metadata,
    });

    return record;
  }).pipe(
    Effect.withSpan('useCase.logActivity', {
      attributes: {
        'activity.action': input.action,
        'activity.entityType': input.entityType,
      },
    }),
  );
