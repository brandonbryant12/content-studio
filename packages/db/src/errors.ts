import { Schema } from 'effect';
import type { HttpErrorProtocol } from './error-protocol';

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
  static readonly httpMessage = 'Database temporarily unavailable, please retry';
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
// Domain: Auth Policy
// =============================================================================

/**
 * Policy service error (e.g., failed to fetch permissions).
 */
export class PolicyError extends Schema.TaggedError<PolicyError>()(
  'PolicyError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Authorization check failed';
  static readonly logLevel = 'error-with-stack' as const;
}

// =============================================================================
// Domain: Documents
// =============================================================================

/**
 * Document not found.
 */
export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()(
  'DocumentNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: DocumentNotFound) =>
    e.message ?? `Document ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: DocumentNotFound) {
    return { documentId: e.id };
  }
}

/**
 * Document operation failure.
 */
export class DocumentError extends Schema.TaggedError<DocumentError>()(
  'DocumentError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Document operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

/**
 * Document file size exceeds limit.
 */
export class DocumentTooLargeError extends Schema.TaggedError<DocumentTooLargeError>()(
  'DocumentTooLargeError',
  {
    fileName: Schema.String,
    fileSize: Schema.Number,
    maxSize: Schema.Number,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 413 as const;
  static readonly httpCode = 'DOCUMENT_TOO_LARGE' as const;
  static readonly httpMessage = (e: DocumentTooLargeError) =>
    e.message ?? `File ${e.fileName} exceeds maximum size`;
  static readonly logLevel = 'silent' as const;
  static getData(e: DocumentTooLargeError) {
    return { fileName: e.fileName, fileSize: e.fileSize, maxSize: e.maxSize };
  }
}

/**
 * Document format not supported.
 */
export class UnsupportedDocumentFormat extends Schema.TaggedError<UnsupportedDocumentFormat>()(
  'UnsupportedDocumentFormat',
  {
    fileName: Schema.String,
    mimeType: Schema.String,
    supportedFormats: Schema.Array(Schema.String),
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 415 as const;
  static readonly httpCode = 'UNSUPPORTED_FORMAT' as const;
  static readonly httpMessage = (e: UnsupportedDocumentFormat) =>
    e.message ?? `Format ${e.mimeType} is not supported`;
  static readonly logLevel = 'silent' as const;
  static getData(e: UnsupportedDocumentFormat) {
    return {
      fileName: e.fileName,
      mimeType: e.mimeType,
      supportedFormats: [...e.supportedFormats],
    };
  }
}

/**
 * Document parsing failure.
 */
export class DocumentParseError extends Schema.TaggedError<DocumentParseError>()(
  'DocumentParseError',
  {
    fileName: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'DOCUMENT_PARSE_ERROR' as const;
  static readonly httpMessage = (e: DocumentParseError) => e.message;
  static readonly logLevel = 'warn' as const;
  static getData(e: DocumentParseError) {
    return { fileName: e.fileName };
  }
}

// =============================================================================
// Domain: Podcasts
// =============================================================================

/**
 * Podcast not found.
 */
export class PodcastNotFound extends Schema.TaggedError<PodcastNotFound>()(
  'PodcastNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'PODCAST_NOT_FOUND' as const;
  static readonly httpMessage = (e: PodcastNotFound) =>
    e.message ?? `Podcast ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: PodcastNotFound) {
    return { podcastId: e.id };
  }
}

/**
 * Podcast script not found.
 */
export class ScriptNotFound extends Schema.TaggedError<ScriptNotFound>()(
  'ScriptNotFound',
  {
    podcastId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'SCRIPT_NOT_FOUND' as const;
  static readonly httpMessage = (e: ScriptNotFound) =>
    e.message ?? `Script for podcast ${e.podcastId} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: ScriptNotFound) {
    return { podcastId: e.podcastId };
  }
}

/**
 * Podcast operation failure.
 */
export class PodcastError extends Schema.TaggedError<PodcastError>()(
  'PodcastError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Podcast operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

// =============================================================================
// Domain: Projects / Media
// =============================================================================

/**
 * Project not found.
 */
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()(
  'ProjectNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'PROJECT_NOT_FOUND' as const;
  static readonly httpMessage = (e: ProjectNotFound) =>
    e.message ?? `Project ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: ProjectNotFound) {
    return { projectId: e.id };
  }
}

/**
 * Media item not found or inaccessible.
 * Used when resolving polymorphic media references.
 */
export class MediaNotFound extends Schema.TaggedError<MediaNotFound>()(
  'MediaNotFound',
  {
    mediaType: Schema.String,
    mediaId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'MEDIA_NOT_FOUND' as const;
  static readonly httpMessage = (e: MediaNotFound) =>
    e.message ?? `${e.mediaType} ${e.mediaId} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: MediaNotFound) {
    return { mediaType: e.mediaType, mediaId: e.mediaId };
  }
}

// =============================================================================
// Domain: LLM
// =============================================================================

/**
 * LLM service failure.
 */
export class LLMError extends Schema.TaggedError<LLMError>()('LLMError', {
  message: Schema.String,
  model: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly httpStatus = 502 as const;
  static readonly httpCode = 'SERVICE_UNAVAILABLE' as const;
  static readonly httpMessage = 'AI service unavailable';
  static readonly logLevel = 'error' as const;
  static getData(e: LLMError) {
    return e.model ? { model: e.model } : {};
  }
}

/**
 * LLM rate limit exceeded.
 */
export class LLMRateLimitError extends Schema.TaggedError<LLMRateLimitError>()(
  'LLMRateLimitError',
  {
    message: Schema.String,
    retryAfter: Schema.optional(Schema.Number),
  },
) {
  static readonly httpStatus = 429 as const;
  static readonly httpCode = 'RATE_LIMITED' as const;
  static readonly httpMessage = 'AI rate limit exceeded';
  static readonly logLevel = 'warn' as const;
  static getData(e: LLMRateLimitError) {
    return e.retryAfter !== undefined ? { retryAfter: e.retryAfter } : {};
  }
}

// =============================================================================
// Domain: TTS
// =============================================================================

/**
 * TTS service failure.
 */
export class TTSError extends Schema.TaggedError<TTSError>()('TTSError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly httpStatus = 502 as const;
  static readonly httpCode = 'SERVICE_UNAVAILABLE' as const;
  static readonly httpMessage = 'Text-to-speech service unavailable';
  static readonly logLevel = 'error' as const;
}

/**
 * TTS quota exceeded.
 */
export class TTSQuotaExceededError extends Schema.TaggedError<TTSQuotaExceededError>()(
  'TTSQuotaExceededError',
  {
    message: Schema.String,
  },
) {
  static readonly httpStatus = 429 as const;
  static readonly httpCode = 'RATE_LIMITED' as const;
  static readonly httpMessage = 'TTS quota exceeded';
  static readonly logLevel = 'warn' as const;
}

// =============================================================================
// Domain: Audio
// =============================================================================

/**
 * Audio processing failure.
 */
export class AudioError extends Schema.TaggedError<AudioError>()('AudioError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Audio processing failed';
  static readonly logLevel = 'error-with-stack' as const;
}

/**
 * FFmpeg/audio processing failure.
 */
export class AudioProcessingError extends Schema.TaggedError<AudioProcessingError>()(
  'AudioProcessingError',
  {
    message: Schema.String,
    operation: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Audio processing failed';
  static readonly logLevel = 'error-with-stack' as const;
  static getData(e: AudioProcessingError) {
    return e.operation ? { operation: e.operation } : {};
  }
}

// =============================================================================
// Domain: Storage
// =============================================================================

/**
 * Storage operation failure.
 */
export class StorageError extends Schema.TaggedError<StorageError>()(
  'StorageError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Storage operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

/**
 * Storage file not found.
 */
export class StorageNotFoundError extends Schema.TaggedError<StorageNotFoundError>()(
  'StorageNotFoundError',
  {
    key: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'NOT_FOUND' as const;
  static readonly httpMessage = (e: StorageNotFoundError) =>
    e.message ?? `File not found: ${e.key}`;
  static readonly logLevel = 'silent' as const;
  static getData(e: StorageNotFoundError) {
    return { key: e.key };
  }
}

/**
 * Storage upload failure.
 */
export class StorageUploadError extends Schema.TaggedError<StorageUploadError>()(
  'StorageUploadError',
  {
    key: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'File upload failed';
  static readonly logLevel = 'error-with-stack' as const;
  static getData(e: StorageUploadError) {
    return { key: e.key };
  }
}

// =============================================================================
// Domain: Queue
// =============================================================================

/**
 * Queue operation failure.
 */
export class QueueError extends Schema.TaggedError<QueueError>()('QueueError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Job queue operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

/**
 * Job not found.
 */
export class JobNotFoundError extends Schema.TaggedError<JobNotFoundError>()(
  'JobNotFoundError',
  {
    jobId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'JOB_NOT_FOUND' as const;
  static readonly httpMessage = (e: JobNotFoundError) =>
    e.message ?? `Job ${e.jobId} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: JobNotFoundError) {
    return { jobId: e.jobId };
  }
}

/**
 * Job processing failure.
 */
export class JobProcessingError extends Schema.TaggedError<JobProcessingError>()(
  'JobProcessingError',
  {
    jobId: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Job processing failed';
  static readonly logLevel = 'error-with-stack' as const;
  static getData(e: JobProcessingError) {
    return { jobId: e.jobId };
  }
}

// =============================================================================
// Error Union Types
// =============================================================================

/**
 * All API errors that can be returned from services.
 * Used by handleEffect for exhaustive error handling.
 */
export type ApiError =
  // Base errors
  | NotFoundError
  | ForbiddenError
  | UnauthorizedError
  | ValidationError
  | DbError
  | ConstraintViolationError
  | DeadlockError
  | ConnectionError
  | ExternalServiceError
  // Auth Policy
  | PolicyError
  // Documents
  | DocumentNotFound
  | DocumentError
  | DocumentTooLargeError
  | UnsupportedDocumentFormat
  | DocumentParseError
  // Podcasts
  | PodcastNotFound
  | ScriptNotFound
  | PodcastError
  // Projects / Media
  | ProjectNotFound
  | MediaNotFound
  // LLM
  | LLMError
  | LLMRateLimitError
  // TTS
  | TTSError
  | TTSQuotaExceededError
  // Audio
  | AudioError
  | AudioProcessingError
  // Storage
  | StorageError
  | StorageNotFoundError
  | StorageUploadError
  // Queue
  | QueueError
  | JobNotFoundError
  | JobProcessingError;

/**
 * Error tags for discriminated union matching.
 */
export type ApiErrorTag = ApiError['_tag'];
