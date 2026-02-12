import { ORPCError } from '@orpc/client';
import { ValidationError } from '@orpc/contract';
import { withCurrentUser, type User } from '@repo/auth/policy';
import { hasHttpProtocol, type LogLevel } from '@repo/db/error-protocol';
import { Effect, Match, pipe } from 'effect';
import type { ServerRuntime, SharedServices } from './runtime';

/**
 * Options for handleEffectWithProtocol.
 */
export interface HandleEffectOptions {
  /** Optional span name for tracing (e.g., 'api.documents.get') */
  span?: string;
  /** Optional span attributes */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Error factory function signature.
 * Compatible with oRPC's ORPCErrorConstructorMapItem which uses rest params
 * via MaybeOptionalOptions. We accept any callable that takes an options object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ErrorFactoryFn = (...args: any[]) => unknown;

/**
 * oRPC error factory interface.
 * Uses an index signature so it's compatible with oRPC's ORPCErrorConstructorMap,
 * which only includes keys for error codes defined in the contract. Handlers can
 * pass `errors` directly without `as unknown as ErrorFactory` casts.
 *
 * All keys are optional via the index signature because different routes define
 * different error codes. The handler code (handleTaggedError) checks for key
 * existence before calling factories.
 */
export interface ErrorFactory {
  [key: string]: ErrorFactoryFn | undefined;
}

/**
 * Custom error handler type - can override the default protocol-based handling.
 */
export type CustomErrorHandler = (error: unknown) => never;

/**
 * Log an error based on its log level.
 */
const logError = (tag: string, error: unknown, logLevel: LogLevel): void => {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'Unknown error';

  const cause =
    error && typeof error === 'object' && 'cause' in error
      ? (error as { cause: unknown }).cause
      : undefined;

  switch (logLevel) {
    case 'error-with-stack': {
      const stack = cause instanceof Error ? cause.stack : undefined;
      console.error(`[${tag}]`, message, { cause, stack });
      break;
    }
    case 'error':
      console.error(`[${tag}]`, message);
      break;
    case 'warn':
      console.warn(`[${tag}]`, message);
      break;
    case 'silent':
      // No logging
      break;
  }
};

/**
 * Generic error handler that reads HTTP protocol from error class.
 * Works with any error that implements HttpErrorProtocol via static properties.
 *
 * This handler:
 * 1. Reads httpStatus, httpCode, httpMessage, logLevel from the error's class
 * 2. Logs based on logLevel
 * 3. Gets the message (static string or from function)
 * 4. Gets optional data from getData()
 * 5. Throws the appropriate oRPC error
 *
 * @param error - The tagged error instance
 * @param errors - The oRPC error factory
 * @returns never (always throws)
 */
export const handleTaggedError = <E extends { _tag: string }>(
  error: E,
  errors: ErrorFactory,
): never => {
  const ErrorClass = error.constructor as {
    new (...args: unknown[]): E;
    httpStatus?: number;
    httpCode?: string;
    httpMessage?: string | ((error: E) => string);
    logLevel?: LogLevel;
    getData?: (error: E) => Record<string, unknown>;
  };

  // Helper to throw using the best available factory
  const throwWithFactory = (
    message: string,
    data?: Record<string, unknown>,
  ): never => {
    const factory = errors['INTERNAL_ERROR'] ?? errors['NOT_FOUND'];
    if (factory) throw factory({ message, data });
    throw new ORPCError('INTERNAL_SERVER_ERROR', { message });
  };

  // Check if class implements HttpErrorProtocol
  if (!hasHttpProtocol(ErrorClass)) {
    // Fallback for errors without protocol - log and throw internal error
    console.error(`[${error._tag}] Error class missing HTTP protocol`, error);
    throwWithFactory('An unexpected error occurred');
  }

  // Log based on level
  logError(error._tag, error, ErrorClass.logLevel!);

  // Get message
  const httpMessage = ErrorClass.httpMessage!;
  const message =
    typeof httpMessage === 'function' ? httpMessage(error) : httpMessage;

  // Get data
  const data = ErrorClass.getData?.(error);

  // Get error factory by code
  const code = ErrorClass.httpCode!;
  const factory = errors[code];

  if (factory) {
    throw factory({ message, data });
  }

  // Fallback to standard factory based on httpStatus when custom factory not found
  const statusToCode: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
  };
  const fallbackCode = statusToCode[ErrorClass.httpStatus!] ?? 'INTERNAL_ERROR';
  const statusFactory = errors[fallbackCode];

  if (statusFactory) {
    throw statusFactory({ message, data });
  }

  // Ultimate fallback - construct ORPCError directly
  throw new ORPCError('INTERNAL_SERVER_ERROR', { message });
};

/**
 * Run an Effect with protocol-based error handling using the shared server runtime.
 *
 * This function:
 * 1. Scopes the user context via FiberRef if user is provided
 * 2. Optionally wraps the effect with a span for tracing
 * 3. Runs the effect using the shared runtime
 * 4. Uses the HTTP protocol defined on error classes for automatic error mapping
 *
 * Errors are automatically handled based on their static HTTP protocol properties
 * (httpStatus, httpCode, httpMessage, logLevel). Custom handlers can be provided
 * to override the default behavior for specific error types.
 *
 * TYPE SAFETY: This function enforces that all Effect requirements are satisfied
 * by SharedServices at compile time. If you get a type error here, it means:
 * 1. Your use case requires a service not in SharedServices
 * 2. You need to add the service to MediaLive/SharedServices
 *
 * See standards/patterns/effect-runtime.md for details.
 *
 * @param runtime - The shared server runtime
 * @param user - The authenticated user (or null for public routes)
 * @param effect - The Effect to run (requirements must be subset of SharedServices)
 * @param errors - The oRPC error factory
 * @param options - Optional configuration (span name, attributes)
 * @param customHandlers - Optional custom handlers for specific error types
 *
 * @example
 * ```typescript
 * // Simple case - all errors handled by protocol
 * return handleEffectWithProtocol(
 *   context.runtime,
 *   context.user,
 *   getDocument({ id: input.id }).pipe(
 *     Effect.flatMap(serializeDocumentEffect)
 *   ),
 *   errors,
 *   { span: 'api.documents.get', attributes: { 'document.id': input.id } },
 * );
 *
 * // Custom override for specific error
 * return handleEffectWithProtocol(
 *   context.runtime,
 *   context.user,
 *   createDocument(input),
 *   errors,
 *   { span: 'api.documents.create' },
 *   {
 *     DocumentQuotaExceeded: (e) => {
 *       throw errors.PAYMENT_REQUIRED({ message: 'Upgrade to create more' });
 *     },
 *   },
 * );
 * ```
 */
export const handleEffectWithProtocol = <A, E extends { _tag: string }>(
  runtime: ServerRuntime,
  user: User | null,
  effect: Effect.Effect<A, E, SharedServices>,
  errors: ErrorFactory,
  options?: HandleEffectOptions,
  customHandlers?: Record<string, CustomErrorHandler>,
): Promise<A> => {
  const tracedEffect = options?.span
    ? effect.pipe(
        Effect.withSpan(options.span, { attributes: options.attributes }),
      )
    : effect;

  const scopedEffect = user
    ? withCurrentUser(user)(tracedEffect)
    : tracedEffect;

  return runtime.runPromise(
    scopedEffect.pipe(
      Effect.catchAll((error: E) =>
        Effect.sync(() => {
          // Check for custom handler first
          const customHandler = customHandlers?.[error._tag];
          if (customHandler) {
            return customHandler(error);
          }

          // Use generic protocol-based handler
          return handleTaggedError(error, errors);
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
): Effect.Effect<never, never, never> => {
  const classified = classifyError(error);
  return pipe(
    error instanceof Error
      ? Effect.logError(formatStackTrace(error))
      : Effect.void,
    Effect.flatMap(() => Effect.sync(() => throwTransformed(classified))),
  );
};
