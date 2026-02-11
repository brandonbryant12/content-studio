import { Schema } from 'effect';

// =============================================================================
// Document Errors
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

/**
 * Document content not found in storage.
 * The document metadata exists but the file is missing from storage.
 */
export class DocumentContentNotFound extends Schema.TaggedError<DocumentContentNotFound>()(
  'DocumentContentNotFound',
  {
    id: Schema.String,
    title: Schema.String,
    contentKey: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'DOCUMENT_CONTENT_NOT_FOUND' as const;
  static readonly httpMessage = (e: DocumentContentNotFound) =>
    e.message ?? `Document file "${e.title}" is missing from storage`;
  static readonly logLevel = 'warn' as const;
  static getData(e: DocumentContentNotFound) {
    return { documentId: e.id, title: e.title, contentKey: e.contentKey };
  }
}

// =============================================================================
// Podcast Errors
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
// Project / Media Errors
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
// URL / Knowledge Base Errors
// =============================================================================

/**
 * URL fetch failure during scraping.
 */
export class UrlFetchError extends Schema.TaggedError<UrlFetchError>()(
  'UrlFetchError',
  {
    url: Schema.String,
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 422 as const;
  static readonly httpCode = 'URL_FETCH_ERROR' as const;
  static readonly httpMessage = (e: UrlFetchError) => e.message;
  static readonly logLevel = 'warn' as const;
  static getData(e: UrlFetchError) {
    return { url: e.url };
  }
}

/**
 * Invalid URL provided.
 */
export class InvalidUrlError extends Schema.TaggedError<InvalidUrlError>()(
  'InvalidUrlError',
  {
    url: Schema.String,
    message: Schema.String,
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'INVALID_URL' as const;
  static readonly httpMessage = (e: InvalidUrlError) => e.message;
  static readonly logLevel = 'silent' as const;
  static getData(e: InvalidUrlError) {
    return { url: e.url };
  }
}

/**
 * Document is already being processed.
 */
export class DocumentAlreadyProcessing extends Schema.TaggedError<DocumentAlreadyProcessing>()(
  'DocumentAlreadyProcessing',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'DOCUMENT_ALREADY_PROCESSING' as const;
  static readonly httpMessage = (e: DocumentAlreadyProcessing) =>
    e.message ?? `Document ${e.id} is already being processed`;
  static readonly logLevel = 'silent' as const;
  static getData(e: DocumentAlreadyProcessing) {
    return { documentId: e.id };
  }
}

// =============================================================================
// Ownership Errors
// =============================================================================

/**
 * User is not the owner of the podcast.
 */
export class NotPodcastOwner extends Schema.TaggedError<NotPodcastOwner>()(
  'NotPodcastOwner',
  {
    podcastId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_PODCAST_OWNER' as const;
  static readonly httpMessage = (e: NotPodcastOwner) =>
    e.message ?? 'Only the podcast owner can perform this action';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotPodcastOwner) {
    return { podcastId: e.podcastId };
  }
}

// =============================================================================
// Voiceover Errors
// =============================================================================

/**
 * Voiceover not found.
 */
export class VoiceoverNotFound extends Schema.TaggedError<VoiceoverNotFound>()(
  'VoiceoverNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'VOICEOVER_NOT_FOUND' as const;
  static readonly httpMessage = (e: VoiceoverNotFound) =>
    e.message ?? `Voiceover ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: VoiceoverNotFound) {
    return { voiceoverId: e.id };
  }
}

/**
 * Voiceover operation failure.
 */
export class VoiceoverError extends Schema.TaggedError<VoiceoverError>()(
  'VoiceoverError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Voiceover operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

/**
 * Invalid voiceover audio generation.
 * Text must not be empty.
 */
export class InvalidVoiceoverAudioGeneration extends Schema.TaggedError<InvalidVoiceoverAudioGeneration>()(
  'InvalidVoiceoverAudioGeneration',
  {
    voiceoverId: Schema.String,
    reason: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'INVALID_VOICEOVER_AUDIO_GENERATION' as const;
  static readonly httpMessage = (e: InvalidVoiceoverAudioGeneration) =>
    e.message ?? e.reason;
  static readonly logLevel = 'silent' as const;
  static getData(e: InvalidVoiceoverAudioGeneration) {
    return { voiceoverId: e.voiceoverId, reason: e.reason };
  }
}

// =============================================================================
// Infographic Errors
// =============================================================================

/**
 * Infographic not found.
 */
export class InfographicNotFound extends Schema.TaggedError<InfographicNotFound>()(
  'InfographicNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'INFOGRAPHIC_NOT_FOUND' as const;
  static readonly httpMessage = (e: InfographicNotFound) =>
    e.message ?? `Infographic ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: InfographicNotFound) {
    return { infographicId: e.id };
  }
}

/**
 * User is not the owner of the infographic.
 */
export class NotInfographicOwner extends Schema.TaggedError<NotInfographicOwner>()(
  'NotInfographicOwner',
  {
    infographicId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_INFOGRAPHIC_OWNER' as const;
  static readonly httpMessage = (e: NotInfographicOwner) =>
    e.message ?? 'Only the infographic owner can perform this action';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotInfographicOwner) {
    return { infographicId: e.infographicId };
  }
}

/**
 * Infographic operation failure.
 */
export class InfographicError extends Schema.TaggedError<InfographicError>()(
  'InfographicError',
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Unknown),
  },
) {
  static readonly httpStatus = 500 as const;
  static readonly httpCode = 'INTERNAL_ERROR' as const;
  static readonly httpMessage = 'Infographic operation failed';
  static readonly logLevel = 'error-with-stack' as const;
}

// =============================================================================
// Error Union Types
// =============================================================================

/**
 * All media package errors.
 */
export type MediaError =
  | DocumentNotFound
  | DocumentError
  | DocumentTooLargeError
  | UnsupportedDocumentFormat
  | DocumentParseError
  | DocumentContentNotFound
  | UrlFetchError
  | InvalidUrlError
  | DocumentAlreadyProcessing
  | PodcastNotFound
  | ScriptNotFound
  | PodcastError
  | ProjectNotFound
  | MediaNotFound
  | NotPodcastOwner
  | VoiceoverNotFound
  | VoiceoverError
  | InvalidVoiceoverAudioGeneration
  | InfographicNotFound
  | NotInfographicOwner
  | InfographicError;
