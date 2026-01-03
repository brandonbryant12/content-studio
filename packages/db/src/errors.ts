import { Schema } from 'effect';

// =============================================================================
// Base HTTP Errors
// =============================================================================

/**
 * Generic not found error.
 * Use domain-specific errors (DocumentNotFound, PodcastNotFound, etc.) when possible.
 */
export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  'NotFoundError',
  {
    entity: Schema.String,
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'NOT_FOUND' as const;
  static readonly httpMessage = (e: NotFoundError) =>
    e.message ?? `${e.entity} with id ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: NotFoundError) {
    return { entity: e.entity, id: e.id };
  }
}

/**
 * Authorization failure - user doesn't have permission.
 */
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
  'ForbiddenError',
  {
    message: Schema.String,
    resource: Schema.optional(Schema.String),
    action: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'FORBIDDEN' as const;
  static readonly httpMessage = (e: ForbiddenError) => e.message;
  static readonly logLevel = 'silent' as const;
}

/**
 * Authentication required - user is not logged in.
 */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  {
    message: Schema.String,
  },
) {
  static readonly httpStatus = 401 as const;
  static readonly httpCode = 'UNAUTHORIZED' as const;
  static readonly httpMessage = (e: UnauthorizedError) => e.message;
  static readonly logLevel = 'silent' as const;
}

/**
 * Input validation failure.
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()(
  'ValidationError',
  {
    field: Schema.String,
    message: Schema.String,
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'VALIDATION_ERROR' as const;
  static readonly httpMessage = (e: ValidationError) =>
    `${e.field}: ${e.message}`;
  static readonly logLevel = 'silent' as const;
  static getData(e: ValidationError) {
    return { field: e.field };
  }
}

// =============================================================================
// Database Errors
// =============================================================================

/**
 * Database operation failure.
 */
export class DbError extends Schema.TaggedError<DbError>()('DbError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Database operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

/**
 * Database constraint violation (unique, foreign key, check constraint).
 * PostgreSQL error codes: 23xxx
 */
export class ConstraintViolationError extends Schema.TaggedError<ConstraintViolationError>()(
  'ConstraintViolationError',
  {
    constraint: Schema.String,
    table: Schema.optional(Schema.String),
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'CONFLICT' as const;
  static readonly httpMessage = 'A conflict occurred with existing data';
  static readonly logLevel = 'error' as const;
  static getData(e: ConstraintViolationError) {
    return { constraint: e.constraint, table: e.table };
  }
}

/**
 * Database deadlock detected.
 * PostgreSQL error code: 40P01
 */
export class DeadlockError extends Schema.TaggedError<DeadlockError>()(
  'DeadlockError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 503 as const;
  static readonly httpCode = 'SERVICE_UNAVAILABLE' as const;
  static readonly httpMessage =
    'Database temporarily unavailable, please retry';
  static readonly logLevel = 'error' as const;
}

/**
 * Database connection failure.
 * PostgreSQL error codes: 08xxx
 */
export class ConnectionError extends Schema.TaggedError<ConnectionError>()(
  'ConnectionError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 503 as const;
  static readonly httpCode = 'SERVICE_UNAVAILABLE' as const;
  static readonly httpMessage = 'Database connection failed';
  static readonly logLevel = 'error-with-stack' as const;
}

// =============================================================================
// External Service Errors
// =============================================================================

/**
 * External service failure (generic).
 */
export class ExternalServiceError extends Schema.TaggedError<ExternalServiceError>()(
  'ExternalServiceError',
  {
    service: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 502 as const;
  static readonly httpCode = 'BAD_GATEWAY' as const;
  static readonly httpMessage = (e: ExternalServiceError) =>
    `External service ${e.service} failed`;
  static readonly logLevel = 'error' as const;
  static getData(e: ExternalServiceError) {
    return { service: e.service };
  }
}

// =============================================================================
// Error Union Types
// =============================================================================

/**
 * Base infrastructure errors.
 * Domain-specific errors are defined in their respective packages:
 * - @repo/media/errors: DocumentNotFound, PodcastNotFound, etc.
 * - @repo/ai/errors: LLMError, TTSError, etc.
 * - @repo/storage/errors: StorageError, StorageNotFoundError, etc.
 * - @repo/queue/errors: QueueError, JobNotFoundError, etc.
 * - @repo/auth/errors: PolicyError
 */
export type BaseError =
  | NotFoundError
  | ForbiddenError
  | UnauthorizedError
  | ValidationError
  | DbError
  | ConstraintViolationError
  | DeadlockError
  | ConnectionError
  | ExternalServiceError;

/**
 * Error tags for discriminated union matching.
 */
export type BaseErrorTag = BaseError['_tag'];
