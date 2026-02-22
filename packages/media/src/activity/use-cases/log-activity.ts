import { Effect } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import { ActivityLogRepo } from '../repos/activity-log-repo';

// =============================================================================
// Types
// =============================================================================

export interface LogActivityInput {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: Record<string, JsonValue> | null;
}

// =============================================================================
// Use Case
// =============================================================================

export const logActivity = (input: LogActivityInput) =>
  Effect.gen(function* () {
    const repo = yield* ActivityLogRepo;
    return yield* repo.insert(input);
  }).pipe(
    Effect.withSpan('useCase.logActivity', {
      attributes: {
        'activity.action': input.action,
        'activity.entityType': input.entityType,
      },
    }),
  );
