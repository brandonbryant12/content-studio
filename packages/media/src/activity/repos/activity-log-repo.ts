import { type Db, type DatabaseError } from '@repo/db/effect';
import { type ActivityLog, type ActivityLogWithUser } from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { Effect} from 'effect';
import { activityLogReadMethods } from './activity-log-repo.reads';
import { activityLogWriteMethods } from './activity-log-repo.writes';

// =============================================================================
// Input Types
// =============================================================================

export interface InsertActivityLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListActivityLogOptions {
  userId?: string;
  entityType?: string;
  action?: string;
  search?: string;
  limit: number;
  afterCursor?: string;
}

export interface ActivityCountByField {
  field: string;
  count: number;
}

export interface ActivityCountByUser {
  userId: string;
  userName: string;
  count: number;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface ActivityLogRepoService {
  readonly insert: (
    data: InsertActivityLogInput,
  ) => Effect.Effect<ActivityLog, DatabaseError, Db>;

  readonly list: (
    options: ListActivityLogOptions,
  ) => Effect.Effect<readonly ActivityLogWithUser[], DatabaseError, Db>;

  readonly countByEntityType: (
    since: Date,
  ) => Effect.Effect<readonly ActivityCountByField[], DatabaseError, Db>;

  readonly countByAction: (
    since: Date,
  ) => Effect.Effect<readonly ActivityCountByField[], DatabaseError, Db>;

  readonly countByUser: (
    since: Date,
    limit?: number,
  ) => Effect.Effect<readonly ActivityCountByUser[], DatabaseError, Db>;

  readonly countTotal: (
    since: Date,
  ) => Effect.Effect<number, DatabaseError, Db>;

  readonly updateEntityTitle: (
    entityId: string,
    title: string,
  ) => Effect.Effect<void, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class ActivityLogRepo extends Context.Tag('@repo/media/ActivityLogRepo')<
  ActivityLogRepo,
  ActivityLogRepoService
>() {}

const make: ActivityLogRepoService = {
  ...activityLogReadMethods,
  ...activityLogWriteMethods,
};

// =============================================================================
// Layer
// =============================================================================

export const ActivityLogRepoLive: Layer.Layer<ActivityLogRepo> = Layer.succeed(
  ActivityLogRepo,
  make,
);
