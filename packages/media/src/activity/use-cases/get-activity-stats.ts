import { requireRole, Role } from '@repo/auth/policy';
import { Effect } from 'effect';
import { ActivityLogRepo } from '../repos/activity-log-repo';

// =============================================================================
// Types
// =============================================================================

export interface GetActivityStatsInput {
  period: '24h' | '7d' | '30d';
}

export interface ActivityStats {
  total: number;
  byEntityType: readonly { field: string; count: number }[];
  byAction: readonly { field: string; count: number }[];
  topUsers: readonly { userId: string; userName: string; count: number }[];
}

// =============================================================================
// Helpers
// =============================================================================

const periodToDate = (period: '24h' | '7d' | '30d'): Date => {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

// =============================================================================
// Use Case
// =============================================================================

/**
 * Get activity statistics for the admin dashboard.
 * Admin-only.
 */
export const getActivityStats = (input: GetActivityStatsInput) =>
  Effect.gen(function* () {
    yield* requireRole(Role.ADMIN);
    const repo = yield* ActivityLogRepo;

    const since = periodToDate(input.period);

    const [total, byEntityType, byAction, topUsers] = yield* Effect.all(
      [
        repo.countTotal(since),
        repo.countByEntityType(since),
        repo.countByAction(since),
        repo.countByUser(since, 10),
      ],
      { concurrency: 'unbounded' },
    );

    return { total, byEntityType, byAction, topUsers } satisfies ActivityStats;
  }).pipe(
    Effect.withSpan('useCase.getActivityStats', {
      attributes: { 'activity.period': input.period },
    }),
  );
