/**
 * Pagination Utilities
 *
 * Reusable schemas and types for cursor-based and offset-based pagination.
 * Provides consistent pagination patterns across all API endpoints.
 */
import { Schema } from 'effect';

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;
export const MIN_PAGE_LIMIT = 1;

// =============================================================================
// Cursor-Based Pagination (Recommended for large datasets)
// =============================================================================

/**
 * Create a paginated response schema wrapper.
 * Wraps any data schema in a consistent pagination envelope.
 *
 * @example
 * ```typescript
 * const PodcastListResponse = paginatedResponse(PodcastOutputSchema);
 * // { data: Podcast[], hasMore: boolean, nextCursor?: string }
 * ```
 */
export const paginatedResponse = <A, I, R>(
  dataSchema: Schema.Schema<A, I, R>,
) =>
  Schema.Struct({
    data: Schema.Array(dataSchema),
    hasMore: Schema.Boolean,
    nextCursor: Schema.optional(Schema.String),
  });

/**
 * Create cursor-based query params schema.
 * Supports forward and backward pagination with type-safe cursors.
 *
 * @example
 * ```typescript
 * const ListParams = cursorQueryParams(PodcastIdSchema);
 * // { limit?: number, afterCursor?: PodcastId, beforeCursor?: PodcastId }
 * ```
 */
export const cursorQueryParams = <A, I, R>(
  cursorSchema: Schema.Schema<A, I, R>,
) =>
  Schema.Struct({
    limit: Schema.optionalWith(
      Schema.Number.pipe(
        Schema.int(),
        Schema.greaterThanOrEqualTo(MIN_PAGE_LIMIT),
        Schema.lessThanOrEqualTo(MAX_PAGE_LIMIT),
      ),
      { default: () => DEFAULT_PAGE_LIMIT },
    ),
    afterCursor: Schema.optional(cursorSchema),
    beforeCursor: Schema.optional(cursorSchema),
  });

/**
 * Simple cursor query params using string cursors.
 * Use when cursor type doesn't need to be validated.
 */
export const SimpleCursorQueryParams = Schema.Struct({
  limit: Schema.optionalWith(
    Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(MIN_PAGE_LIMIT),
      Schema.lessThanOrEqualTo(MAX_PAGE_LIMIT),
    ),
    { default: () => DEFAULT_PAGE_LIMIT },
  ),
  afterCursor: Schema.optional(Schema.String),
  beforeCursor: Schema.optional(Schema.String),
});

// =============================================================================
// Offset-Based Pagination (For backward compatibility)
// =============================================================================

/**
 * Offset-based query params schema.
 * Use for simpler pagination needs or backward compatibility.
 *
 * @example
 * ```typescript
 * const ListParams = OffsetQueryParams;
 * // { limit?: number, offset?: number }
 * ```
 */
export const OffsetQueryParams = Schema.Struct({
  limit: Schema.optionalWith(
    Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(MIN_PAGE_LIMIT),
      Schema.lessThanOrEqualTo(MAX_PAGE_LIMIT),
    ),
    { default: () => DEFAULT_PAGE_LIMIT },
  ),
  offset: Schema.optionalWith(
    Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
    { default: () => 0 },
  ),
});

/**
 * Offset-based paginated response.
 * Includes total count for calculating page numbers.
 */
export const offsetPaginatedResponse = <A, I, R>(
  dataSchema: Schema.Schema<A, I, R>,
) =>
  Schema.Struct({
    data: Schema.Array(dataSchema),
    total: Schema.Number,
    hasMore: Schema.Boolean,
  });

// =============================================================================
// Types
// =============================================================================

export type PaginatedResponse<T> = {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
};

export type CursorQueryParams<T = string> = {
  limit: number;
  afterCursor?: T;
  beforeCursor?: T;
};

export type OffsetQueryParamsType = typeof OffsetQueryParams.Type;

export type OffsetPaginatedResponse<T> = {
  data: T[];
  total: number;
  hasMore: boolean;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a paginated response from data and pagination info.
 */
export const createPaginatedResponse = <T>(
  data: T[],
  limit: number,
  getCursor: (item: T) => string,
): PaginatedResponse<T> => {
  const hasMore = data.length > limit;
  const pageData = hasMore ? data.slice(0, limit) : data;
  const nextCursor =
    hasMore && pageData.length > 0
      ? getCursor(pageData[pageData.length - 1]!)
      : undefined;

  return {
    data: pageData,
    hasMore,
    nextCursor,
  };
};

/**
 * Create an offset-based paginated response.
 */
export const createOffsetPaginatedResponse = <T>(
  data: T[],
  total: number,
  offset: number,
): OffsetPaginatedResponse<T> => ({
  data,
  total,
  hasMore: offset + data.length < total,
});
