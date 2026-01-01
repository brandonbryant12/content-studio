/**
 * Effect-Idiomatic Serialization Pattern
 *
 * This module provides utilities for defining type-safe serialization
 * between database entities and API output types using Effect.
 *
 * Pattern:
 * 1. Define an OutputSchema for the API response (for contract validation)
 * 2. Define a pure transform function (DB entity → Output)
 * 3. Wrap with Effect for tracing and error handling
 *
 * Benefits:
 * - Type-safe end-to-end (DB → API)
 * - Effect-native with tracing support
 * - Simple and pragmatic (no fighting branded types)
 * - Composable serializers
 */

import { Effect, Data } from 'effect';

// =============================================================================
// Error Types
// =============================================================================

/**
 * Serialization error with context about what failed.
 */
export class SerializationError extends Data.TaggedError('SerializationError')<{
  entity: string;
  message: string;
  cause?: unknown;
}> {}

// =============================================================================
// Serialization Helpers
// =============================================================================

/**
 * Create an Effect-based serializer from a pure transform function.
 * Wraps the function with tracing for observability.
 *
 * @example
 * ```typescript
 * const serializeDocumentEffect = createEffectSerializer(
 *   'document',
 *   (doc: Document): DocumentOutput => ({
 *     id: doc.id,
 *     title: doc.title,
 *     createdAt: doc.createdAt.toISOString(),
 *     updatedAt: doc.updatedAt.toISOString(),
 *   }),
 * );
 *
 * // Usage in handler
 * const output = yield* serializeDocumentEffect(dbDocument);
 * ```
 */
export const createEffectSerializer = <DbType, OutputType>(
  entityName: string,
  transform: (entity: DbType) => OutputType,
) => {
  return (entity: DbType): Effect.Effect<OutputType, SerializationError> =>
    Effect.try({
      try: () => transform(entity),
      catch: (cause) =>
        new SerializationError({
          entity: entityName,
          message: `Failed to serialize ${entityName}`,
          cause,
        }),
    }).pipe(
      Effect.withSpan(`serialize.${entityName}`, {
        attributes: { 'serialization.entity': entityName },
      }),
    );
};

/**
 * Create a batch serializer for arrays.
 * Serializes all entities in parallel for better performance.
 *
 * @example
 * ```typescript
 * const serializeDocumentsEffect = createBatchEffectSerializer(
 *   'document',
 *   documentTransform,
 * );
 *
 * const outputs = yield* serializeDocumentsEffect(dbDocuments);
 * ```
 */
export const createBatchEffectSerializer = <DbType, OutputType>(
  entityName: string,
  transform: (entity: DbType) => OutputType,
) => {
  const serialize = createEffectSerializer(entityName, transform);

  return (
    entities: readonly DbType[],
  ): Effect.Effect<OutputType[], SerializationError> =>
    Effect.all(entities.map(serialize), { concurrency: 'unbounded' }).pipe(
      Effect.withSpan(`serialize.${entityName}.batch`, {
        attributes: {
          'serialization.entity': entityName,
          'serialization.count': entities.length,
        },
      }),
    );
};

/**
 * Create a pure synchronous serializer (no Effect wrapper).
 * Use when Effect overhead is not needed (e.g., in map callbacks).
 *
 * This is the simplest form - just returns the transform function
 * with a nice name for debugging.
 *
 * @example
 * ```typescript
 * const serializeDocument = createSyncSerializer(
 *   (doc: Document): DocumentOutput => ({
 *     id: doc.id,
 *     title: doc.title,
 *     createdAt: doc.createdAt.toISOString(),
 *     updatedAt: doc.updatedAt.toISOString(),
 *   }),
 * );
 *
 * const outputs = documents.map(serializeDocument);
 * ```
 */
export const createSyncSerializer = <DbType, OutputType>(
  transform: (entity: DbType) => OutputType,
): ((entity: DbType) => OutputType) => transform;
