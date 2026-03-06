import { type Db, type DatabaseError } from '@repo/db/effect';
import {
  type AIUsageEvent,
  type AIUsageEventModality,
  type DbUser,
} from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { AdminUserNotFound } from '../../errors';
import type { Effect } from 'effect';
import { adminReadMethods } from './admin-repo.reads';

export interface SearchUsersOptions {
  readonly query?: string;
  readonly limit: number;
}

export type AdminUserEntityType =
  | 'source'
  | 'podcast'
  | 'voiceover'
  | 'persona'
  | 'infographic';

export interface ListUserEntitiesOptions {
  readonly userId: string;
  readonly query?: string;
  readonly entityType?: AdminUserEntityType;
  readonly limit: number;
  readonly offset: number;
}

export interface CountUserEntitiesOptions {
  readonly userId: string;
  readonly query?: string;
  readonly entityType?: AdminUserEntityType;
}

export interface AdminUserEntityRecord {
  readonly entityType: AdminUserEntityType;
  readonly entityId: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly status: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ListUserAIUsageEventsOptions {
  readonly userId: string;
  readonly since?: Date;
  readonly limit: number;
}

export interface AIUsageByModality {
  readonly modality: AIUsageEventModality;
  readonly count: number;
  readonly estimatedCostUsdMicros: number;
  readonly pricedEventCount: number;
}

export interface AIUsageByProvider {
  readonly provider: string;
  readonly count: number;
  readonly estimatedCostUsdMicros: number;
  readonly pricedEventCount: number;
}

export interface AIUsageTimelinePoint {
  readonly day: string;
  readonly count: number;
  readonly estimatedCostUsdMicros: number;
  readonly pricedEventCount: number;
}

export interface UserAIUsageSummary {
  readonly totalEvents: number;
  readonly totalEstimatedCostUsdMicros: number;
  readonly pricedEventCount: number;
  readonly byModality: readonly AIUsageByModality[];
  readonly byProvider: readonly AIUsageByProvider[];
  readonly timeline: readonly AIUsageTimelinePoint[];
}

export interface AdminRepoService {
  readonly searchUsers: (
    options: SearchUsersOptions,
  ) => Effect.Effect<readonly DbUser[], DatabaseError, Db>;

  readonly listUserEntities: (
    options: ListUserEntitiesOptions,
  ) => Effect.Effect<readonly AdminUserEntityRecord[], DatabaseError, Db>;

  readonly countUserEntities: (
    options: CountUserEntitiesOptions,
  ) => Effect.Effect<number, DatabaseError, Db>;

  readonly findUserById: (
    userId: string,
  ) => Effect.Effect<DbUser, AdminUserNotFound | DatabaseError, Db>;

  readonly listUserAIUsageEvents: (
    options: ListUserAIUsageEventsOptions,
  ) => Effect.Effect<readonly AIUsageEvent[], DatabaseError, Db>;

  readonly getUserAIUsageSummary: (
    userId: string,
    since?: Date,
  ) => Effect.Effect<UserAIUsageSummary, DatabaseError, Db>;
}

export class AdminRepo extends Context.Tag('@repo/media/AdminRepo')<
  AdminRepo,
  AdminRepoService
>() {}

const make: AdminRepoService = {
  ...adminReadMethods,
};

export const AdminRepoLive: Layer.Layer<AdminRepo> = Layer.succeed(
  AdminRepo,
  make,
);
