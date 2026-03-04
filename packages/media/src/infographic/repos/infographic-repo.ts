import { type Db, type DatabaseError } from '@repo/db/effect';
import {
  type Infographic,
  type InfographicVersion,
  type InfographicId,
  type InfographicStatusType,
  type SourceId,
  type StyleProperty,
} from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { InfographicNotFound } from '../../errors';
import type { Effect } from 'effect';
import { infographicReadMethods } from './infographic-repo.reads';
import { infographicWriteMethods } from './infographic-repo.writes';

// =============================================================================
// Types
// =============================================================================

export interface InsertInfographic {
  id: InfographicId;
  title: string;
  prompt?: string;
  styleProperties?: StyleProperty[];
  format: Infographic['format'];
  sourceId?: SourceId;
  status?: InfographicStatusType;
  createdBy: string;
}

export interface UpdateInfographic {
  title?: string;
  prompt?: string;
  styleProperties?: StyleProperty[];
  format?: Infographic['format'];
  imageStorageKey?: string | null;
  thumbnailStorageKey?: string | null;
  status?: InfographicStatusType;
  errorMessage?: string | null;
}

export interface InsertInfographicVersion {
  infographicId: InfographicId;
  versionNumber: number;
  prompt?: string;
  styleProperties?: StyleProperty[];
  format: InfographicVersion['format'];
  imageStorageKey: string;
  thumbnailStorageKey?: string;
}

export interface ListOptions {
  createdBy: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface InfographicRepoService {
  readonly insert: (
    data: InsertInfographic,
  ) => Effect.Effect<Infographic, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Find infographic by ID scoped to owner.
   * Fails with InfographicNotFound for missing or not-owned records.
   */
  readonly findByIdForUser: (
    id: string,
    userId: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  readonly list: (
    options: ListOptions,
  ) => Effect.Effect<readonly Infographic[], DatabaseError, Db>;

  readonly update: (
    id: string,
    data: UpdateInfographic,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;

  readonly insertVersion: (
    data: InsertInfographicVersion,
  ) => Effect.Effect<InfographicVersion, DatabaseError, Db>;

  readonly listVersions: (
    infographicId: string,
  ) => Effect.Effect<readonly InfographicVersion[], DatabaseError, Db>;

  readonly deleteOldVersions: (
    infographicId: string,
    keepCount: number,
  ) => Effect.Effect<number, DatabaseError, Db>;

  /**
   * Set approval (approvedBy + approvedAt).
   */
  readonly setApproval: (
    id: string,
    approvedBy: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;

  /**
   * Clear approval (set approvedBy/approvedAt to null).
   */
  readonly clearApproval: (
    id: string,
  ) => Effect.Effect<Infographic, InfographicNotFound | DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class InfographicRepo extends Context.Tag('@repo/media/InfographicRepo')<
  InfographicRepo,
  InfographicRepoService
>() {}

const make: InfographicRepoService = {
  ...infographicReadMethods,
  ...infographicWriteMethods,
};

// =============================================================================
// Layer
// =============================================================================

export const InfographicRepoLive: Layer.Layer<InfographicRepo> = Layer.succeed(
  InfographicRepo,
  make,
);
