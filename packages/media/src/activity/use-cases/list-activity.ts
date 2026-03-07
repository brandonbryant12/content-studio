import { Role } from '@repo/auth/policy';
import {
  createPaginatedResponse,
  type PaginatedResponse,
  type ActivityLogWithUser,
} from '@repo/db/schema';
import { Effect } from 'effect';
import { defineRoleUseCase } from '../../shared';
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
export const listActivity = defineRoleUseCase<ListActivityInput>()({
  name: 'useCase.listActivity',
  role: Role.ADMIN,
  span: ({ input }) => {
    const limit = input.limit ?? 25;
    const attributes: Record<string, string | number> = {
      'activity.limit': limit,
      ...(input.userId ? { 'filter.userId': input.userId } : {}),
    };
    if (input.entityType) {
      attributes['activity.entityType'] = input.entityType;
    }
    if (input.action) {
      attributes['activity.action'] = input.action;
    }

    return {
      collection: 'activity',
      attributes,
    };
  },
  run: ({ input }) =>
    Effect.gen(function* () {
      const repo = yield* ActivityLogRepo;
      const limit = input.limit ?? 25;

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
    }),
});
