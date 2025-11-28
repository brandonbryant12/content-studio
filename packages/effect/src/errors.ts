import { Schema } from 'effect';

// =============================================================================
// Base HTTP Errors
// =============================================================================

/**
 * Generic not found error.
 * Use domain-specific errors (DocumentNotFound, PodcastNotFound, etc.) when possible.
 */
export class NotFoundError extends Schema.TaggedError<NotFoundError>()('NotFoundError', {
  entity: Schema.String,
  id: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  static readonly status = 404 as const;
  static readonly code = 'NOT_FOUND' as const;
}

/**
 * Authorization failure - user doesn't have permission.
 */
export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()('ForbiddenError', {
  message: Schema.String,
  resource: Schema.optional(Schema.String),
  action: Schema.optional(Schema.String),
}) {
  static readonly status = 403 as const;
  static readonly code = 'FORBIDDEN' as const;
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
  static readonly status = 401 as const;
  static readonly code = 'UNAUTHORIZED' as const;
}

/**
 * Input validation failure.
 */
export class ValidationError extends Schema.TaggedError<ValidationError>()('ValidationError', {
  field: Schema.String,
  message: Schema.String,
}) {
  static readonly status = 422 as const;
  static readonly code = 'VALIDATION_ERROR' as const;
}

/**
 * Database operation failure.
 */
export class DbError extends Schema.TaggedError<DbError>()('DbError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly status = 500 as const;
  static readonly code = 'DATABASE_ERROR' as const;
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
  static readonly status = 502 as const;
  static readonly code = 'EXTERNAL_SERVICE_ERROR' as const;
}

// =============================================================================
// Domain: Auth Policy
// =============================================================================

/**
 * Policy service error (e.g., failed to fetch permissions).
 */
export class PolicyError extends Schema.TaggedError<PolicyError>()('PolicyError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly status = 500 as const;
  static readonly code = 'POLICY_ERROR' as const;
}

// =============================================================================
// Domain: Documents
// =============================================================================

/**
 * Document not found.
 */
export class DocumentNotFound extends Schema.TaggedError<DocumentNotFound>()('DocumentNotFound', {
  id: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  static readonly status = 404 as const;
  static readonly code = 'DOCUMENT_NOT_FOUND' as const;
}

/**
 * Document operation failure.
 */
export class DocumentError extends Schema.TaggedError<DocumentError>()('DocumentError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly status = 500 as const;
  static readonly code = 'DOCUMENT_ERROR' as const;
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
  static readonly status = 413 as const;
  static readonly code = 'DOCUMENT_TOO_LARGE' as const;
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
  static readonly status = 415 as const;
  static readonly code = 'UNSUPPORTED_DOCUMENT_FORMAT' as const;
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
  static readonly status = 422 as const;
  static readonly code = 'DOCUMENT_PARSE_ERROR' as const;
}

// =============================================================================
// Domain: Podcasts
// =============================================================================

/**
 * Podcast not found.
 */
export class PodcastNotFound extends Schema.TaggedError<PodcastNotFound>()('PodcastNotFound', {
  id: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  static readonly status = 404 as const;
  static readonly code = 'PODCAST_NOT_FOUND' as const;
}

/**
 * Podcast script not found.
 */
export class ScriptNotFound extends Schema.TaggedError<ScriptNotFound>()('ScriptNotFound', {
  podcastId: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  static readonly status = 404 as const;
  static readonly code = 'SCRIPT_NOT_FOUND' as const;
}

/**
 * Podcast operation failure.
 */
export class PodcastError extends Schema.TaggedError<PodcastError>()('PodcastError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly status = 500 as const;
  static readonly code = 'PODCAST_ERROR' as const;
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
  static readonly status = 502 as const;
  static readonly code = 'LLM_ERROR' as const;
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
  static readonly status = 429 as const;
  static readonly code = 'LLM_RATE_LIMIT' as const;
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
  static readonly status = 502 as const;
  static readonly code = 'TTS_ERROR' as const;
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
  static readonly status = 429 as const;
  static readonly code = 'TTS_QUOTA_EXCEEDED' as const;
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
  static readonly status = 500 as const;
  static readonly code = 'AUDIO_ERROR' as const;
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
  static readonly status = 500 as const;
  static readonly code = 'AUDIO_PROCESSING_ERROR' as const;
}

// =============================================================================
// Domain: Storage
// =============================================================================

/**
 * Storage operation failure.
 */
export class StorageError extends Schema.TaggedError<StorageError>()('StorageError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {
  static readonly status = 500 as const;
  static readonly code = 'STORAGE_ERROR' as const;
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
  static readonly status = 404 as const;
  static readonly code = 'STORAGE_NOT_FOUND' as const;
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
  static readonly status = 500 as const;
  static readonly code = 'STORAGE_UPLOAD_ERROR' as const;
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
  static readonly status = 500 as const;
  static readonly code = 'QUEUE_ERROR' as const;
}

/**
 * Job not found.
 */
export class JobNotFoundError extends Schema.TaggedError<JobNotFoundError>()('JobNotFoundError', {
  jobId: Schema.String,
  message: Schema.optional(Schema.String),
}) {
  static readonly status = 404 as const;
  static readonly code = 'JOB_NOT_FOUND' as const;
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
  static readonly status = 500 as const;
  static readonly code = 'JOB_PROCESSING_ERROR' as const;
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
