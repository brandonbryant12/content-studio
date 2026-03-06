import type { RouterOutput } from '@repo/api/client';

export type Period = '24h' | '7d' | '30d';
export type AIUsagePeriod = '7d' | '30d' | '90d' | 'all';

export type ActivityStats = RouterOutput['admin']['activity']['stats'];
export type AdminUserSearchResult = RouterOutput['admin']['users']['search'];
export type AdminUserSearchItem = AdminUserSearchResult[number];
export type AdminUserDetail = RouterOutput['admin']['users']['get'];
export type AdminUserEntitiesResult =
  RouterOutput['admin']['users']['entities'];
export type AdminUserEntity = AdminUserEntitiesResult['entities'][number];
export type AdminUserEntityType = AdminUserEntity['entityType'];
export const DEFAULT_ADMIN_USER_ENTITY_LIMIT = 12;
export const ADMIN_USER_ENTITY_TYPES = [
  'source',
  'podcast',
  'voiceover',
  'persona',
  'infographic',
] as const satisfies readonly AdminUserEntityType[];
export type AdminUserEntityTypeFilter = AdminUserEntityType | 'all';

/** A single activity log entry as returned by the API. */
export interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  userName?: string | null;
}

export interface StatBreakdown {
  readonly field: string;
  readonly count: number;
}

export interface TopUser {
  readonly userId: string;
  readonly userName: string;
  readonly count: number;
}
