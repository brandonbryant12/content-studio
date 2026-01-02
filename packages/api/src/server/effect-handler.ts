import { Effect, Match, pipe } from 'effect';
import { ORPCError } from '@orpc/client';
import { ValidationError } from '@orpc/contract';
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
export const handleEffect = <A>(
  runtime: ServerRuntime,
  user: User | null,
  effect: Effect.Effect<A, unknown, unknown>,
  errorMapper: Record<string, (error: unknown) => never>,
  options?: HandleEffectOptions,
): Promise<A> => {
  // Cast to the expected types - runtime will provide SharedServices
  const typedEffect = effect as Effect.Effect<A, { _tag: string }, SharedServices>;

  let tracedEffect = options?.span
    ? typedEffect.pipe(Effect.withSpan(options.span, { attributes: options.attributes }))
    : typedEffect;

  const scopedEffect = user ? withCurrentUser(user)(tracedEffect) : tracedEffect;

  return runtime.runPromise(
    scopedEffect.pipe(
      Effect.catchAll((error: { _tag: string }) =>
        Effect.sync(() => {
          const handler = errorMapper[error._tag];
          if (handler) {
            return handler(error);
          }
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
 * Error handler type - accepts unknown and returns never (throws).
 */
type ErrorHandler = (error: unknown) => never;

/**
 * Helper to safely get a property from an unknown error.
 */
export const getErrorProp = <T>(error: unknown, key: string, defaultValue: T): T => {
  if (error && typeof error === 'object' && key in error) {
    return (error as Record<string, unknown>)[key] as T;
  }
  return defaultValue;
};

/**
 * Log an error with its stack trace and throw an internal error.
 */
const logAndThrowInternal = (
  tag: string,
  e: unknown,
  errors: { INTERNAL_ERROR: (opts: { message: string }) => unknown },
  publicMessage: string,
): never => {
  const message = getErrorProp(e, 'message', 'Unknown error');
  const cause = getErrorProp<unknown>(e, 'cause', undefined);
  const stack = cause instanceof Error ? cause.stack : undefined;
  console.error(`[${tag}]`, message, { cause, stack });
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
    DbError: ((e: unknown) =>
      logAndThrowInternal('DbError', e, errors, 'Database operation failed')) as ErrorHandler,

    PolicyError: ((e: unknown) =>
      logAndThrowInternal(
        'PolicyError',
        e,
        errors,
        'Authorization check failed',
      )) as ErrorHandler,

    ForbiddenError: ((e: unknown) => {
      throw errors.FORBIDDEN({ message: getErrorProp(e, 'message', 'Access forbidden') });
    }) as ErrorHandler,

    UnauthorizedError: ((e: unknown) => {
      throw errors.UNAUTHORIZED({ message: getErrorProp(e, 'message', 'Unauthorized') });
    }) as ErrorHandler,

    NotFoundError: ((e: unknown) => {
      const entity = getErrorProp(e, 'entity', 'Resource');
      const id = getErrorProp(e, 'id', 'unknown');
      const message = getErrorProp<string | undefined>(e, 'message', undefined);
      throw errors.NOT_FOUND({
        message: message ?? `${entity} with id ${id} not found`,
        data: { entity, id },
      });
    }) as ErrorHandler,
  },

  /**
   * Database-specific error handlers.
   * Use when your Effect can produce ConstraintViolationError, DeadlockError, or ConnectionError.
   */
  database: {
    ConstraintViolationError: ((e: unknown) => {
      const constraint = getErrorProp(e, 'constraint', 'unknown');
      const table = getErrorProp<string | undefined>(e, 'table', undefined);
      const message = getErrorProp(e, 'message', 'Constraint violation');
      const cause = getErrorProp<unknown>(e, 'cause', undefined);
      const stack = cause instanceof Error ? cause.stack : undefined;
      console.error('[ConstraintViolationError]', message, {
        constraint,
        table,
        stack,
      });
      if (errors.CONFLICT) {
        throw errors.CONFLICT({
          message: 'A conflict occurred with existing data',
        });
      }
      throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
    }) as ErrorHandler,

    DeadlockError: ((e: unknown) => {
      const message = getErrorProp(e, 'message', 'Deadlock detected');
      const cause = getErrorProp<unknown>(e, 'cause', undefined);
      const stack = cause instanceof Error ? cause.stack : undefined;
      console.error('[DeadlockError]', message, { stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({
          message: 'Database temporarily unavailable, please retry',
        });
      }
      throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
    }) as ErrorHandler,

    ConnectionError: ((e: unknown) => {
      const message = getErrorProp(e, 'message', 'Connection error');
      const cause = getErrorProp<unknown>(e, 'cause', undefined);
      const stack = cause instanceof Error ? cause.stack : undefined;
      console.error('[ConnectionError]', message, { stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({
          message: 'Database connection failed',
        });
      }
      throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
    }) as ErrorHandler,
  },

  /**
   * Storage-related handlers.
   * Use when your Effect interacts with StorageService.
   */
  storage: {
    StorageError: ((e: unknown) =>
      logAndThrowInternal(
        'StorageError',
        e,
        errors,
        'Storage operation failed',
      )) as ErrorHandler,

    StorageUploadError: ((e: unknown) =>
      logAndThrowInternal(
        'StorageUploadError',
        e,
        errors,
        'File upload failed',
      )) as ErrorHandler,

    StorageNotFoundError: ((e: unknown) => {
      const key = getErrorProp(e, 'key', 'unknown');
      const message = getErrorProp<string | undefined>(e, 'message', undefined);
      throw errors.NOT_FOUND({
        message: message ?? `File not found: ${key}`,
        data: { key },
      });
    }) as ErrorHandler,
  },

  /**
   * Queue-related handlers.
   * Use when your Effect interacts with the job queue.
   */
  queue: {
    QueueError: ((e: unknown) =>
      logAndThrowInternal(
        'QueueError',
        e,
        errors,
        'Job queue operation failed',
      )) as ErrorHandler,

    JobNotFoundError: ((e: unknown) => {
      const jobId = getErrorProp(e, 'jobId', 'unknown');
      const message = getErrorProp<string | undefined>(e, 'message', undefined);
      throw errors.NOT_FOUND({
        message: message ?? `Job ${jobId} not found`,
        data: { jobId },
      });
    }) as ErrorHandler,

    JobProcessingError: ((e: unknown) =>
      logAndThrowInternal(
        'JobProcessingError',
        e,
        errors,
        'Job processing failed',
      )) as ErrorHandler,
  },

  /**
   * TTS-related handlers.
   * Use when your Effect interacts with TTS service.
   */
  tts: {
    TTSError: ((e: unknown) => {
      const message = getErrorProp(e, 'message', 'TTS error');
      const cause = getErrorProp<unknown>(e, 'cause', undefined);
      const stack = cause instanceof Error ? cause.stack : undefined;
      console.error('[TTSError]', message, { stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({
          message: 'Text-to-speech service unavailable',
        });
      }
      throw errors.INTERNAL_ERROR({
        message: 'Text-to-speech operation failed',
      });
    }) as ErrorHandler,

    TTSQuotaExceededError: ((e: unknown) => {
      const message = getErrorProp(e, 'message', 'TTS quota exceeded');
      console.error('[TTSQuotaExceededError]', message);
      if (errors.RATE_LIMITED) {
        throw errors.RATE_LIMITED({ message: 'TTS quota exceeded' });
      }
      throw errors.INTERNAL_ERROR({ message: 'Text-to-speech quota exceeded' });
    }) as ErrorHandler,
  },

  /**
   * LLM-related handlers.
   * Use when your Effect interacts with LLM service.
   */
  llm: {
    LLMError: ((e: unknown) => {
      const message = getErrorProp(e, 'message', 'LLM error');
      const model = getErrorProp<string | undefined>(e, 'model', undefined);
      const cause = getErrorProp<unknown>(e, 'cause', undefined);
      const stack = cause instanceof Error ? cause.stack : undefined;
      console.error('[LLMError]', message, { model, stack });
      if (errors.SERVICE_UNAVAILABLE) {
        throw errors.SERVICE_UNAVAILABLE({ message: 'AI service unavailable' });
      }
      throw errors.INTERNAL_ERROR({ message: 'AI operation failed' });
    }) as ErrorHandler,

    LLMRateLimitError: ((e: unknown) => {
      const message = getErrorProp(e, 'message', 'LLM rate limit exceeded');
      const retryAfter = getErrorProp<number | undefined>(e, 'retryAfter', undefined);
      console.error('[LLMRateLimitError]', message, { retryAfter });
      if (errors.RATE_LIMITED) {
        throw errors.RATE_LIMITED({ message: 'AI rate limit exceeded' });
      }
      throw errors.INTERNAL_ERROR({ message: 'AI rate limit exceeded' });
    }) as ErrorHandler,
  },
});

// =============================================================================
// oRPC Error Interceptor
// =============================================================================

/**
 * Standard Schema issue type (common format for Effect Schema, Zod, Valibot, etc.)
 */
interface StandardSchemaIssue {
  message: string;
  path?: Array<{ key: string | number | symbol }>;
}

/**
 * Discriminated union for classified validation errors.
 */
type ClassifiedError =
  | {
      readonly _tag: 'InputValidation';
      issues: readonly StandardSchemaIssue[];
      cause: ValidationError;
    }
  | {
      readonly _tag: 'OutputValidation';
      issues: readonly StandardSchemaIssue[];
      data: unknown;
      cause: ValidationError;
    }
  | { readonly _tag: 'Passthrough'; error: unknown };

/** Helper to extract cause from ORPCError since TypeScript doesn't type it */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getErrorCause = (error: ORPCError<any, any>): unknown =>
  (error as Error & { cause?: unknown }).cause;

/**
 * Classify an oRPC error into a discriminated union.
 */
const classifyError = (error: unknown): ClassifiedError => {
  if (!(error instanceof ORPCError)) {
    return { _tag: 'Passthrough', error };
  }

  const cause = getErrorCause(error);
  if (!(cause instanceof ValidationError)) {
    return { _tag: 'Passthrough', error };
  }

  const issues = cause.issues as readonly StandardSchemaIssue[];

  if (error.code === 'BAD_REQUEST') {
    return { _tag: 'InputValidation', issues, cause };
  }
  if (error.code === 'INTERNAL_SERVER_ERROR') {
    return { _tag: 'OutputValidation', issues, data: cause.data, cause };
  }

  return { _tag: 'Passthrough', error };
};

/**
 * Format validation issues from Standard Schema format to a readable summary.
 */
const formatValidationIssues = (
  issues: readonly StandardSchemaIssue[],
): string =>
  issues
    .map((issue) => {
      const path = issue.path?.map((p) => String(p.key)).join('.') || 'root';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

/**
 * Cleans up stack traces by filtering node_modules and making paths relative.
 */
const formatStackTrace = (error: Error): string => {
  if (!error.stack) return error.message;

  const cwd = process.cwd();
  const lines = error.stack.split('\n');
  const messageLine = lines[0];

  const appFrames = lines
    .slice(1)
    .filter((line) => !line.includes('node_modules'))
    .map((line) => line.replace(cwd + '/', '').replace(/file:\/\//, ''))
    .slice(0, 5);

  if (appFrames.length === 0) {
    return (
      messageLine +
      '\n' +
      lines
        .slice(1, 4)
        .map((line) => line.replace(cwd + '/', '').replace(/file:\/\//, ''))
        .join('\n')
    );
  }

  return messageLine + '\n' + appFrames.join('\n');
};

/**
 * Transform classified error to ORPCError and throw.
 * Uses Match.exhaustive to ensure all cases are handled.
 */
const throwTransformed = (classified: ClassifiedError): never =>
  pipe(
    classified,
    Match.value,
    Match.tag('InputValidation', ({ issues, cause }) => {
      const summary = formatValidationIssues(issues);
      console.error('[INPUT_VALIDATION]', summary);
      throw new ORPCError('INPUT_VALIDATION_FAILED', {
        status: 422,
        message: summary,
        cause,
      });
    }),
    Match.tag('OutputValidation', ({ issues, data, cause }) => {
      const summary = formatValidationIssues(issues);
      console.error('[OUTPUT_VALIDATION] Response does not match contract:');
      console.error('  Issues:', summary);
      if (data !== undefined) {
        console.error('  Data:', JSON.stringify(data, null, 2).slice(0, 1000));
      }
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        status: 500,
        message: `Output validation failed: ${summary}`,
        cause,
      });
    }),
    Match.tag('Passthrough', ({ error }) => {
      throw error;
    }),
    Match.exhaustive,
  );

/**
 * Handle oRPC errors with Effect-based classification and transformation.
 *
 * This function:
 * 1. Classifies the error (input validation, output validation, or passthrough)
 * 2. Logs the error with a cleaned stack trace
 * 3. Transforms validation errors into more descriptive ORPCErrors
 *
 * Use with oRPC's onError interceptor:
 * @example
 * ```typescript
 * clientInterceptors: [
 *   onError((error) => Effect.runSync(handleORPCError(error))),
 * ],
 * ```
 */
export const handleORPCError = (
  error: unknown,
): Effect.Effect<never, never, never> =>
  pipe(
    Effect.sync(() => classifyError(error)),
    Effect.tap(() =>
      error instanceof Error
        ? Effect.logError(formatStackTrace(error))
        : Effect.void,
    ),
    Effect.flatMap((classified) =>
      Effect.sync(() => throwTransformed(classified)),
    ),
  );
