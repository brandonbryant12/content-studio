import { Effect } from 'effect';
import { withCurrentUser, type User } from '@repo/auth/policy';
import type { ServerRuntime, SharedServices } from './runtime';

/**
 * Error mapper type - must handle ALL errors the Effect can produce.
 * TypeScript will error if any error type is not mapped.
 */
export type ErrorMapper<E extends { _tag: string }> = {
  [K in E['_tag']]: (error: Extract<E, { _tag: K }>) => never;
};

/**
 * Options for handleEffect.
 */
export interface HandleEffectOptions {
  /** Optional span name for tracing (e.g., 'api.documents.get') */
  span?: string;
  /** Optional span attributes */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Run an Effect with STRICT error handling using the shared server runtime.
 *
 * This function:
 * 1. Scopes the user context via FiberRef.locally if user is provided
 * 2. Optionally wraps the effect with a span for tracing
 * 3. Runs the effect using the shared runtime
 * 4. Maps all errors using the error mapper
 *
 * TypeScript will error if any error type returned by the Effect is not
 * explicitly mapped in the errorMapper. This ensures exhaustive error handling
 * at the API boundary.
 *
 * @param runtime - The shared server runtime
 * @param user - The authenticated user (or null for public routes)
 * @param effect - The Effect to run (requirements must be SharedServices)
 * @param errorMapper - Object mapping each error tag to a handler that throws an oRPC error
 * @param options - Optional configuration (span name, attributes)
 *
 * @example
 * ```typescript
 * // In an oRPC handler:
 * return handleEffect(
 *   context.runtime,
 *   context.user,
 *   Effect.gen(function* () {
 *     const docs = yield* Documents;
 *     return yield* docs.findById(input.id);
 *   }),
 *   {
 *     DocumentNotFound: (e) => { throw errors.DOCUMENT_NOT_FOUND(...) },
 *     DbError: (e) => { throw errors.INTERNAL_ERROR(...) },
 *   },
 *   { span: 'api.documents.get', attributes: { 'document.id': input.id } },
 * );
 * ```
 */
export const handleEffect = <A, E extends { _tag: string }>(
  runtime: ServerRuntime,
  user: User | null,
  effect: Effect.Effect<A, E, SharedServices>,
  errorMapper: ErrorMapper<E>,
  options?: HandleEffectOptions,
): Promise<A> => {
  // Apply span if provided
  let tracedEffect = options?.span
    ? effect.pipe(Effect.withSpan(options.span, { attributes: options.attributes }))
    : effect;

  // Scope user context via FiberRef if authenticated
  const scopedEffect = user ? withCurrentUser(user)(tracedEffect) : tracedEffect;

  return runtime.runPromise(
    scopedEffect.pipe(
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
export type EffectErrors<T> =
  T extends Effect.Effect<unknown, infer E, unknown> ? E : never;

/**
 * Helper type to extract success type from an Effect.
 *
 * @example
 * ```typescript
 * const effect = documentService.findById(id);
 * type Result = EffectSuccess<typeof effect>; // Document
 * ```
 */
export type EffectSuccess<T> =
  T extends Effect.Effect<infer A, unknown, unknown> ? A : never;

// =============================================================================
// Error Handler Factory
// =============================================================================

/**
 * Error factory configuration for oRPC errors.
 * Uses `unknown` return type to accommodate oRPC's error throwing mechanism.
 */
interface ErrorFactoryConfig {
  INTERNAL_ERROR: (opts: { message: string }) => unknown;
  FORBIDDEN: (opts: { message: string }) => unknown;
  UNAUTHORIZED: (opts: { message: string }) => unknown;
  NOT_FOUND: (opts: { message: string; data?: unknown }) => unknown;
  SERVICE_UNAVAILABLE?: (opts: { message: string }) => unknown;
  RATE_LIMITED?: (opts: { message: string }) => unknown;
  CONFLICT?: (opts: { message: string }) => unknown;
}

/**
 * Log an error with its stack trace and throw an internal error.
 */
const logAndThrowInternal = (
  tag: string,
  e: { message: string; cause?: unknown },
  errors: { INTERNAL_ERROR: (opts: { message: string }) => unknown },
  publicMessage: string,
): never => {
  const stack = e.cause instanceof Error ? e.cause.stack : undefined;
  console.error(`[${tag}]`, e.message, { cause: e.cause, stack });
  throw errors.INTERNAL_ERROR({ message: publicMessage });
};

/**
 * Creates a complete set of error handlers for use with handleEffect.
 * Eliminates duplication while preserving stack traces in logs.
 *
 * Returns grouped handlers that can be spread into handleEffect:
 * - common: DbError, PolicyError, ForbiddenError, UnauthorizedError, NotFoundError
 * - database: ConstraintViolationError, DeadlockError, ConnectionError
 * - storage: StorageError, StorageUploadError, StorageNotFoundError
 * - queue: QueueError, JobNotFoundError, JobProcessingError
 * - tts: TTSError, TTSQuotaExceededError
 * - llm: LLMError, LLMRateLimitError
 *
 * @example
 * ```typescript
 * const handlers = createErrorHandlers(errors);
 * return handleEffect(
 *   context.runtime,
 *   context.user,
 *   effect,
 *   {
 *     ...handlers.common,
 *     ...handlers.database,
 *     DocumentNotFound: (e) => { throw errors.DOCUMENT_NOT_FOUND(...) },
 *   },
 * );
 * ```
 */
export const createErrorHandlers = <T extends ErrorFactoryConfig>(
  errors: T,
) => ({
  /**
   * Common handlers present in all routes.
   * Includes: DbError, PolicyError, ForbiddenError, UnauthorizedError, NotFoundError
   */
  common: {
    DbError: (e: { message: string; cause?: unknown }) =>
      logAndThrowInternal('DbError', e, errors, 'Database operation failed'),

    PolicyError: (e: { message: string; cause?: unknown }) =>
      logAndThrowInternal(
        'PolicyError',
        e,
        errors,
        'Authorization check failed',
      ),

    ForbiddenError: (e: { message: string }) => {
      throw errors.FORBIDDEN({ message: e.message });
    },

    UnauthorizedError: (e: { message: string }) => {
      throw errors.UNAUTHORIZED({ message: e.message });
    },

    NotFoundError: (e: { entity: string; id: string; message?: string }) => {
      throw errors.NOT_FOUND({
        message: e.message ?? `${e.entity} with id ${e.id} not found`,
        data: { entity: e.entity, id: e.id },
      });
    },
  },

  /**
   * Database-specific error handlers.
   * Use when your Effect can produce ConstraintViolationError, DeadlockError, or ConnectionError.
   */
  database: {
    ConstraintViolationError: (e: {
      constraint: string;
      table?: string;
      message: string;
      cause?: unknown;
    }) => {
      const stack = e.cause instanceof Error ? e.cause.stack : undefined;
      console.error('[ConstraintViolationError]', e.message, {
        constraint: e.constraint,
        table: e.table,
        stack,
      });
      // Use CONFLICT if available, otherwise INTERNAL_ERROR
      if (errors.CONFLICT) {
        throw errors.CONFLICT({
          message: 'A conflict occurred with existing data',
        });
      }
      throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
    },

    DeadlockError: (e: { message: string; cause?: unknown }) => {
      const stack = e.cause instanceof Error ? e.cause.stack : undefined;
      console.error('[DeadlockError]', e.message, { stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({
          message: 'Database temporarily unavailable, please retry',
        });
      }
      throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
    },

    ConnectionError: (e: { message: string; cause?: unknown }) => {
      const stack = e.cause instanceof Error ? e.cause.stack : undefined;
      console.error('[ConnectionError]', e.message, { stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({
          message: 'Database connection failed',
        });
      }
      throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
    },
  },

  /**
   * Storage-related handlers.
   * Use when your Effect interacts with StorageService.
   */
  storage: {
    StorageError: (e: { message: string; cause?: unknown }) =>
      logAndThrowInternal(
        'StorageError',
        e,
        errors,
        'Storage operation failed',
      ),

    StorageUploadError: (e: {
      key: string;
      message: string;
      cause?: unknown;
    }) =>
      logAndThrowInternal(
        'StorageUploadError',
        e,
        errors,
        'File upload failed',
      ),

    StorageNotFoundError: (e: { key: string; message?: string }) => {
      throw errors.NOT_FOUND({
        message: e.message ?? `File not found: ${e.key}`,
        data: { key: e.key },
      });
    },
  },

  /**
   * Queue-related handlers.
   * Use when your Effect interacts with the job queue.
   */
  queue: {
    QueueError: (e: { message: string; cause?: unknown }) =>
      logAndThrowInternal(
        'QueueError',
        e,
        errors,
        'Job queue operation failed',
      ),

    JobNotFoundError: (e: { jobId: string; message?: string }) => {
      throw errors.NOT_FOUND({
        message: e.message ?? `Job ${e.jobId} not found`,
        data: { jobId: e.jobId },
      });
    },

    JobProcessingError: (e: {
      jobId: string;
      message: string;
      cause?: unknown;
    }) =>
      logAndThrowInternal(
        'JobProcessingError',
        e,
        errors,
        'Job processing failed',
      ),
  },

  /**
   * TTS-related handlers.
   * Use when your Effect interacts with TTS service.
   */
  tts: {
    TTSError: (e: { message: string; cause?: unknown }) => {
      const stack = e.cause instanceof Error ? e.cause.stack : undefined;
      console.error('[TTSError]', e.message, { stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({
          message: 'Text-to-speech service unavailable',
        });
      }
      throw errors.INTERNAL_ERROR({
        message: 'Text-to-speech operation failed',
      });
    },

    TTSQuotaExceededError: (e: { message: string }) => {
      console.error('[TTSQuotaExceededError]', e.message);
      if (errors.RATE_LIMITED) {
        throw errors.RATE_LIMITED({ message: 'TTS quota exceeded' });
      }
      throw errors.INTERNAL_ERROR({ message: 'Text-to-speech quota exceeded' });
    },
  },

  /**
   * LLM-related handlers.
   * Use when your Effect interacts with LLM service.
   */
  llm: {
    LLMError: (e: { message: string; model?: string; cause?: unknown }) => {
      const stack = e.cause instanceof Error ? e.cause.stack : undefined;
      console.error('[LLMError]', e.message, { model: e.model, stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({ message: 'AI service unavailable' });
      }
      throw errors.INTERNAL_ERROR({ message: 'AI operation failed' });
    },

    LLMRateLimitError: (e: { message: string; retryAfter?: number }) => {
      console.error('[LLMRateLimitError]', e.message, {
        retryAfter: e.retryAfter,
      });
      if (errors.RATE_LIMITED) {
        throw errors.RATE_LIMITED({ message: 'AI rate limit exceeded' });
      }
      throw errors.INTERNAL_ERROR({ message: 'AI rate limit exceeded' });
    },
  },
});
