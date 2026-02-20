import { type Db, type DatabaseError } from '@repo/db/effect';
import {
  type InfographicStylePreset,
  type InfographicStylePresetId,
  type StyleProperty,
} from '@repo/db/schema';
import { Context, Layer } from 'effect';
import type { Effect} from 'effect';
import { StylePresetNotFound } from '../../errors';
import { stylePresetMethods } from './style-preset-repo.methods';

// =============================================================================
// Types
// =============================================================================

export interface InsertStylePreset {
  id?: InfographicStylePresetId;
  name: string;
  properties: StyleProperty[];
  isBuiltIn?: boolean;
  createdBy?: string;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface StylePresetRepoService {
  readonly insert: (
    data: InsertStylePreset,
  ) => Effect.Effect<InfographicStylePreset, DatabaseError, Db>;

  readonly findById: (
    id: string,
  ) => Effect.Effect<
    InfographicStylePreset,
    StylePresetNotFound | DatabaseError,
    Db
  >;

  readonly list: (
    userId: string,
  ) => Effect.Effect<readonly InfographicStylePreset[], DatabaseError, Db>;

  readonly delete: (id: string) => Effect.Effect<boolean, DatabaseError, Db>;
}

// =============================================================================
// Context Tag
// =============================================================================

export class StylePresetRepo extends Context.Tag('@repo/media/StylePresetRepo')<
  StylePresetRepo,
  StylePresetRepoService
>() {}

const make: StylePresetRepoService = {
  ...stylePresetMethods,
};

// =============================================================================
// Layer
// =============================================================================

export const StylePresetRepoLive: Layer.Layer<StylePresetRepo> = Layer.succeed(
  StylePresetRepo,
  make,
);

export { StylePresetNotFound };
