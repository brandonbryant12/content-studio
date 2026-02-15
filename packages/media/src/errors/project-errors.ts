import { Schema } from 'effect';

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
