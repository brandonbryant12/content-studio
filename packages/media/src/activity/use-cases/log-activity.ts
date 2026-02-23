import { getCurrentUser } from '@repo/auth/policy';
import { Effect } from 'effect';
import type { JsonValue } from '@repo/db/schema';
import { annotateUseCaseSpan } from '../../shared';
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
    const user = yield* getCurrentUser;
    const resourceId = input.entityId ?? input.userId;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId,
    });
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
