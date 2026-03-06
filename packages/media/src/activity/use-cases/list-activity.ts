import { getCurrentUser, requireRole, Role } from '@repo/auth/policy';
import {
  createPaginatedResponse,
  type PaginatedResponse,
  type ActivityLogWithUser,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { annotateUseCaseSpan, withUseCaseSpan } from '../../shared';
import { ActivityLogRepo } from '../repos/activity-log-repo';

// =============================================================================
// Types
// =============================================================================

export interface ListActivityInput {
  userId?: string;
  entityType?: string;
  action?: string;
  search?: string;
  limit?: number;
  afterCursor?: string;
}

export type ListActivityResult = PaginatedResponse<ActivityLogWithUser>;

// =============================================================================
// Use Case
// =============================================================================

/**
 * List activity log entries with pagination and filters.
 * Admin-only.
 */
export const listActivity = (input: ListActivityInput) =>
  Effect.gen(function* () {
    yield* requireRole(Role.ADMIN);
    const user = yield* getCurrentUser;
    const repo = yield* ActivityLogRepo;

    const limit = input.limit ?? 25;
    const spanAttributes: Record<string, string | number> = {
      'activity.limit': limit,
      ...(input.userId ? { 'filter.userId': input.userId } : {}),
    };
    if (input.entityType) {
      spanAttributes['activity.entityType'] = input.entityType;
    }
    if (input.action) {
      spanAttributes['activity.action'] = input.action;
    }

    yield* annotateUseCaseSpan({
      userId: user.id,
      collection: 'activity',
      attributes: spanAttributes,
    });

    const rows = yield* repo.list({
      userId: input.userId,
      entityType: input.entityType,
      action: input.action,
      search: input.search,
      limit,
      afterCursor: input.afterCursor,
    });

    return createPaginatedResponse([...rows], limit, (item) =>
      item.createdAt.toISOString(),
    );
  }).pipe(withUseCaseSpan('useCase.listActivity'));
