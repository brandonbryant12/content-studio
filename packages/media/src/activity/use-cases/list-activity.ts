import { requireRole, Role } from '@repo/auth/policy';
import {
  createPaginatedResponse,
  type PaginatedResponse,
  type ActivityLogWithUser,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { annotateUseCaseSpan } from '../../shared';
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
    const user = yield* requireRole(Role.ADMIN);
    const repo = yield* ActivityLogRepo;

    const limit = input.limit ?? 25;
    yield* annotateUseCaseSpan({
      userId: user.id,
      resourceId: input.userId ?? 'list',
      attributes: {
        'activity.limit': input.limit ?? 25,
        ...(input.entityType
          ? { 'activity.entityType': input.entityType }
          : {}),
      },
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
  }).pipe(Effect.withSpan('useCase.listActivity'));
