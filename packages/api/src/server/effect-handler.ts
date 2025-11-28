import { Effect } from 'effect';
import type { ApiError, ApiErrorTag } from '@repo/effect/errors';

/**
 * Error mapper type - must handle ALL errors the Effect can produce.
 * TypeScript will error if any error type is not mapped.
 */
export type ErrorMapper<E extends { _tag: string }> = {
  [K in E['_tag']]: (error: Extract<E, { _tag: K }>) => never;
};

/**
 * Run an Effect with STRICT error handling.
 *
 * TypeScript will error if any error type returned by the Effect is not
 * explicitly mapped in the errorMapper. This ensures exhaustive error handling
 * at the API boundary.
 *
 * **Important**: The Effect must have all requirements satisfied (R = never).
 * Use `Effect.provide(layers)` before passing to handleEffect.
 *
 * @param effect - The Effect to run (must have R = never)
 * @param errorMapper - Object mapping each error tag to a handler that throws an oRPC error
 *
 * @example
 * ```typescript
 * // In an oRPC handler:
 * const effect = Effect.gen(function* () {
 *   const docs = yield* Documents;
 *   return yield* docs.findById(input.id);
 * }).pipe(Effect.provide(context.layers));
 *
 * return handleEffect(effect, {
 *   // TypeScript enforces handling ALL possible errors!
 *   DocumentNotFound: (e) => {
 *     throw errors.MISSING_DOCUMENT({
 *       message: `Document ${e.id} not found`,
 *       data: { documentId: e.id },
 *     });
 *   },
 *   DbError: (e) => {
 *     console.error('Database error:', e);
 *     throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
 *   },
 * });
 * ```
 */
export const handleEffect = <A, E extends { _tag: string }>(
  effect: Effect.Effect<A, E, never>,
  errorMapper: ErrorMapper<E>,
): Promise<A> => {
  return Effect.runPromise(
    effect.pipe(
      Effect.catchAll((error: E) =>
        Effect.sync(() => {
          const handler = errorMapper[error._tag as E['_tag']];
          if (handler) {
            return handler(error as Extract<E, { _tag: E['_tag'] }>);
          }
          // This should never happen if types are correct
          throw new Error(`Unhandled error type: ${error._tag}`);
        }),
      ),
    ),
  );
};

/**
 * Helper type to extract error types from an Effect.
 * Useful for defining error mappers.
 *
 * @example
 * ```typescript
 * const effect = documentService.findById(id);
 * type Errors = EffectErrors<typeof effect>; // DocumentNotFound | DbError
 * ```
 */
export type EffectErrors<T> = T extends Effect.Effect<unknown, infer E, unknown> ? E : never;

/**
 * Helper type to extract success type from an Effect.
 *
 * @example
 * ```typescript
 * const effect = documentService.findById(id);
 * type Result = EffectSuccess<typeof effect>; // Document
 * ```
 */
export type EffectSuccess<T> = T extends Effect.Effect<infer A, unknown, unknown> ? A : never;

/**
 * Common error handler factories for reuse across handlers.
 * These create functions that map Effect errors to oRPC errors.
 */
export const createCommonErrorHandlers = <
  TErrors extends {
    INTERNAL_ERROR: (opts: { message: string }) => never;
    FORBIDDEN: (opts: { message: string }) => never;
    UNAUTHORIZED: (opts: { message: string }) => never;
    NOT_FOUND: (opts: { message: string; data?: unknown }) => never;
  },
>(
  errors: TErrors,
) => ({
  /**
   * Handle DbError - logs and returns internal error.
   */
  DbError: (e: { message: string; cause?: unknown }) => {
    console.error('[DbError]', e.message, e.cause);
    throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
  },

  /**
   * Handle ForbiddenError - returns 403.
   */
  ForbiddenError: (e: { message: string }) => {
    throw errors.FORBIDDEN({ message: e.message });
  },

  /**
   * Handle UnauthorizedError - returns 401.
   */
  UnauthorizedError: (e: { message: string }) => {
    throw errors.UNAUTHORIZED({ message: e.message });
  },

  /**
   * Handle PolicyError - logs and returns internal error.
   */
  PolicyError: (e: { message: string; cause?: unknown }) => {
    console.error('[PolicyError]', e.message, e.cause);
    throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
  },

  /**
   * Handle generic NotFoundError.
   */
  NotFoundError: (e: { entity: string; id: string; message?: string }) => {
    throw errors.NOT_FOUND({
      message: e.message ?? `${e.entity} with id ${e.id} not found`,
      data: { entity: e.entity, id: e.id },
    });
  },
});
