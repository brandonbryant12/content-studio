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
// Collaboration Errors
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

/**
 * User is not a collaborator or owner of the podcast.
 */
export class NotPodcastCollaborator extends Schema.TaggedError<NotPodcastCollaborator>()(
  'NotPodcastCollaborator',
  {
    podcastId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_PODCAST_COLLABORATOR' as const;
  static readonly httpMessage = (e: NotPodcastCollaborator) =>
    e.message ?? 'User is not a collaborator on this podcast';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotPodcastCollaborator) {
    return { podcastId: e.podcastId };
  }
}

/**
 * Collaborator already exists for this podcast.
 */
export class CollaboratorAlreadyExists extends Schema.TaggedError<CollaboratorAlreadyExists>()(
  'CollaboratorAlreadyExists',
  {
    podcastId: Schema.String,
    email: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'COLLABORATOR_ALREADY_EXISTS' as const;
  static readonly httpMessage = (e: CollaboratorAlreadyExists) =>
    e.message ?? `${e.email} is already a collaborator on this podcast`;
  static readonly logLevel = 'silent' as const;
  static getData(e: CollaboratorAlreadyExists) {
    return { podcastId: e.podcastId, email: e.email };
  }
}

/**
 * Collaborator not found.
 */
export class CollaboratorNotFound extends Schema.TaggedError<CollaboratorNotFound>()(
  'CollaboratorNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'COLLABORATOR_NOT_FOUND' as const;
  static readonly httpMessage = (e: CollaboratorNotFound) =>
    e.message ?? `Collaborator ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: CollaboratorNotFound) {
    return { collaboratorId: e.id };
  }
}

/**
 * Cannot add owner as collaborator.
 */
export class CannotAddOwnerAsCollaborator extends Schema.TaggedError<CannotAddOwnerAsCollaborator>()(
  'CannotAddOwnerAsCollaborator',
  {
    podcastId: Schema.String,
    email: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode = 'CANNOT_ADD_OWNER_AS_COLLABORATOR' as const;
  static readonly httpMessage = (e: CannotAddOwnerAsCollaborator) =>
    e.message ?? 'Cannot add the podcast owner as a collaborator';
  static readonly logLevel = 'silent' as const;
  static getData(e: CannotAddOwnerAsCollaborator) {
    return { podcastId: e.podcastId, email: e.email };
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
 * User is not the owner of the voiceover.
 */
export class NotVoiceoverOwner extends Schema.TaggedError<NotVoiceoverOwner>()(
  'NotVoiceoverOwner',
  {
    voiceoverId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_VOICEOVER_OWNER' as const;
  static readonly httpMessage = (e: NotVoiceoverOwner) =>
    e.message ?? 'Only the voiceover owner can perform this action';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotVoiceoverOwner) {
    return { voiceoverId: e.voiceoverId };
  }
}

/**
 * User is not a collaborator or owner of the voiceover.
 */
export class NotVoiceoverCollaborator extends Schema.TaggedError<NotVoiceoverCollaborator>()(
  'NotVoiceoverCollaborator',
  {
    voiceoverId: Schema.String,
    userId: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 403 as const;
  static readonly httpCode = 'NOT_VOICEOVER_COLLABORATOR' as const;
  static readonly httpMessage = (e: NotVoiceoverCollaborator) =>
    e.message ?? 'User is not a collaborator on this voiceover';
  static readonly logLevel = 'silent' as const;
  static getData(e: NotVoiceoverCollaborator) {
    return { voiceoverId: e.voiceoverId };
  }
}

/**
 * Voiceover collaborator already exists.
 */
export class VoiceoverCollaboratorAlreadyExists extends Schema.TaggedError<VoiceoverCollaboratorAlreadyExists>()(
  'VoiceoverCollaboratorAlreadyExists',
  {
    voiceoverId: Schema.String,
    email: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 409 as const;
  static readonly httpCode = 'VOICEOVER_COLLABORATOR_ALREADY_EXISTS' as const;
  static readonly httpMessage = (e: VoiceoverCollaboratorAlreadyExists) =>
    e.message ?? `${e.email} is already a collaborator on this voiceover`;
  static readonly logLevel = 'silent' as const;
  static getData(e: VoiceoverCollaboratorAlreadyExists) {
    return { voiceoverId: e.voiceoverId, email: e.email };
  }
}

/**
 * Voiceover collaborator not found.
 */
export class VoiceoverCollaboratorNotFound extends Schema.TaggedError<VoiceoverCollaboratorNotFound>()(
  'VoiceoverCollaboratorNotFound',
  {
    id: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 404 as const;
  static readonly httpCode = 'VOICEOVER_COLLABORATOR_NOT_FOUND' as const;
  static readonly httpMessage = (e: VoiceoverCollaboratorNotFound) =>
    e.message ?? `Voiceover collaborator ${e.id} not found`;
  static readonly logLevel = 'silent' as const;
  static getData(e: VoiceoverCollaboratorNotFound) {
    return { collaboratorId: e.id };
  }
}

/**
 * Cannot add owner as voiceover collaborator.
 */
export class CannotAddOwnerAsVoiceoverCollaborator extends Schema.TaggedError<CannotAddOwnerAsVoiceoverCollaborator>()(
  'CannotAddOwnerAsVoiceoverCollaborator',
  {
    voiceoverId: Schema.String,
    email: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {
  static readonly httpStatus = 400 as const;
  static readonly httpCode =
    'CANNOT_ADD_OWNER_AS_VOICEOVER_COLLABORATOR' as const;
  static readonly httpMessage = (e: CannotAddOwnerAsVoiceoverCollaborator) =>
    e.message ?? 'Cannot add the voiceover owner as a collaborator';
  static readonly logLevel = 'silent' as const;
  static getData(e: CannotAddOwnerAsVoiceoverCollaborator) {
    return { voiceoverId: e.voiceoverId, email: e.email };
  }
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
  | PodcastNotFound
  | ScriptNotFound
  | PodcastError
  | ProjectNotFound
  | MediaNotFound
  | NotPodcastOwner
  | NotPodcastCollaborator
  | CollaboratorAlreadyExists
  | CollaboratorNotFound
  | CannotAddOwnerAsCollaborator
  | VoiceoverNotFound
  | VoiceoverError
  | NotVoiceoverOwner
  | NotVoiceoverCollaborator
  | VoiceoverCollaboratorAlreadyExists
  | VoiceoverCollaboratorNotFound
  | CannotAddOwnerAsVoiceoverCollaborator
  | InvalidVoiceoverAudioGeneration
  | InfographicNotFound
  | NotInfographicOwner
  | InfographicError;
