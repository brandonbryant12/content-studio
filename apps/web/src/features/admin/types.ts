import type { RouterOutput } from '@repo/api/client';

export type Period = '24h' | '7d' | '30d';

export type ActivityStats = RouterOutput['admin']['stats'];

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
